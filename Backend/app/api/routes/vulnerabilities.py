"""API routes for vulnerability management."""
import logging
from datetime import datetime, timedelta, timezone, date as date_type, time as time_type
from typing import Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_, case, cast, Date, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

logger = logging.getLogger(__name__)

from app.api.schemas import VulnerabilityResponse, VulnerabilityListResponse, DashboardStatsResponse, TrendPointResponse, TrendResponse
from app.api.routes.auth import get_current_user
from app.db.models import User, Vulnerability, Asset, JiraTicket
from app.db.session import get_db

router = APIRouter(prefix="/vulnerabilities", tags=["vulnerabilities"])


@router.get("/dashboard/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get vulnerability statistics for the dashboard.
    
    Returns counts by severity level and total assets.
    """
    # Count vulnerabilities by severity
    severity_counts = {}
    for severity in ['critical', 'high', 'medium', 'low', 'info']:
        count = await db.scalar(
            select(func.count()).select_from(Vulnerability).where(
                Vulnerability.user_id == current_user.id,
                Vulnerability.scanner_severity == severity,
                Vulnerability.status == 'open'
            )
        )
        severity_counts[severity] = count or 0
    
    # Total vulnerabilities (open only)
    total_vulnerabilities = await db.scalar(
        select(func.count()).select_from(Vulnerability).where(
            Vulnerability.user_id == current_user.id,
            Vulnerability.status == 'open'
        )
    )
    
    # Total assets
    total_assets = await db.scalar(
        select(func.count()).select_from(Asset).where(
            Asset.user_id == current_user.id
        )
    )
    
    return {
        "total_vulnerabilities": total_vulnerabilities or 0,
        "total_assets": total_assets or 0,
        "critical": severity_counts['critical'],
        "high": severity_counts['high'],
        "medium": severity_counts['medium'],
        "low": severity_counts['low'],
        "info": severity_counts['info']
    }


@router.get("/dashboard/trend", response_model=TrendResponse)
async def get_vulnerability_trend(
    days: int = Query(7, ge=7, le=90, description="Number of past days to include (7, 30 or 90)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return per-day vulnerability counts grouped by severity for the given window.

    The response includes one data point for every day in the window even if
    no vulnerabilities were discovered on that day, so charts always render a
    continuous series.
    """
    today = datetime.now(timezone.utc).date()
    cutoff_date = today - timedelta(days=days - 1)  # inclusive start
    cutoff_dt = datetime.combine(cutoff_date, time_type.min, tzinfo=timezone.utc)

    logger.warning(
        "[TREND] user=%s days=%d today=%s cutoff_date=%s cutoff_dt=%s",
        current_user.id, days, today, cutoff_date, cutoff_dt,
    )

    # --- sanity: total rows for this user ---
    total_user_vulns = await db.scalar(
        select(func.count()).select_from(Vulnerability).where(
            Vulnerability.user_id == current_user.id
        )
    )
    logger.warning("[TREND] total vulns for user: %d", total_user_vulns or 0)

    # --- sanity: min/max discovered_at for this user ---
    min_max = await db.execute(
        select(
            func.min(Vulnerability.discovered_at),
            func.max(Vulnerability.discovered_at),
        ).where(Vulnerability.user_id == current_user.id)
    )
    mm = min_max.first()
    logger.warning("[TREND] discovered_at range: min=%s  max=%s", mm[0] if mm else None, mm[1] if mm else None)

    # --- sanity: how many rows pass the cutoff filter ---
    in_window = await db.scalar(
        select(func.count()).select_from(Vulnerability).where(
            Vulnerability.user_id == current_user.id,
            Vulnerability.discovered_at >= cutoff_dt,
        )
    )
    logger.warning("[TREND] rows with discovered_at >= %s : %d", cutoff_dt, in_window or 0)

    # Cast to DATE for GROUP BY / SELECT so we get one row per calendar day.
    day_col = cast(Vulnerability.discovered_at, Date)

    stmt = (
        select(
            day_col.label("day"),
            func.sum(case((Vulnerability.scanner_severity == "critical", 1), else_=0)).label("critical"),
            func.sum(case((Vulnerability.scanner_severity == "high",     1), else_=0)).label("high"),
            func.sum(case((Vulnerability.scanner_severity == "medium",   1), else_=0)).label("medium"),
            func.sum(case((Vulnerability.scanner_severity == "low",      1), else_=0)).label("low"),
            func.sum(case((Vulnerability.scanner_severity == "info",     1), else_=0)).label("info"),
        )
        .where(
            Vulnerability.user_id == current_user.id,
            Vulnerability.discovered_at >= cutoff_dt,
        )
        .group_by(day_col)
        .order_by(day_col)
    )

    result = await db.execute(stmt)
    raw_rows = result.all()
    logger.warning("[TREND] GROUP BY raw rows (%d): %s", len(raw_rows), raw_rows)

    # index by ISO date string to avoid any date/datetime type mismatch
    rows: dict[str, Any] = {}
    for row in raw_rows:
        key = row.day.isoformat() if hasattr(row.day, "isoformat") else str(row.day)
        logger.warning("[TREND] row key=%r  type=%s  values=c:%s h:%s m:%s l:%s i:%s",
            key, type(row.day).__name__, row.critical, row.high, row.medium, row.low, row.info)
        rows[key] = row

    logger.warning("[TREND] rows dict keys: %s", list(rows.keys()))

    points: list[TrendPointResponse] = []
    for offset in range(days - 1, -1, -1):
        day = today - timedelta(days=offset)
        key = day.isoformat()
        row = rows.get(key)
        points.append(TrendPointResponse(
            label=day.strftime("%a") if days <= 7 else day.strftime("%b %d"),
            date=key,
            critical=int(row.critical or 0) if row else 0,
            high=int(row.high or 0) if row else 0,
            medium=int(row.medium or 0) if row else 0,
            low=int(row.low or 0) if row else 0,
            info=int(row.info or 0) if row else 0,
        ))

    logger.warning("[TREND] returning %d points — non-zero: %s",
        len(points),
        [(p.date, p.critical, p.high, p.medium, p.low) for p in points
         if p.critical or p.high or p.medium or p.low or p.info]
    )

    return {"points": points}


@router.get("", response_model=VulnerabilityListResponse)
async def list_vulnerabilities(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    severity: str | None = Query(None, description="Filter by severity (critical, high, medium, low, info)"),
    status: str | None = Query(None, description="Filter by status (open, in_progress, resolved, false_positive)"),
    asset_id: UUID | None = Query(None, description="Filter by asset ID"),
    scan_id: UUID | None = Query(None, description="Filter by scan ID"),
    search: str | None = Query(None, description="Search in title, description, CVE ID"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
):
    """
    List vulnerabilities with optional filtering.
    
    Supports filtering by:
    - severity: Filter by severity level
    - status: Filter by vulnerability status
    - asset_id: Filter by specific asset
    - scan_id: Filter by specific scan
    - search: Search in title, description, or CVE ID
    """
    # Build query
    query = select(Vulnerability, JiraTicket).where(Vulnerability.user_id == current_user.id)
    
    # Apply filters
    if severity:
        query = query.where(Vulnerability.scanner_severity == severity.lower())
    
    if status:
        query = query.where(Vulnerability.status == status.lower())
    
    if asset_id:
        query = query.where(Vulnerability.asset_id == asset_id)
    
    if scan_id:
        query = query.where(Vulnerability.scan_id == scan_id)
    
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Vulnerability.title.ilike(search_term),
                Vulnerability.description.ilike(search_term),
                Vulnerability.cve_id.ilike(search_term)
            )
        )
    
    # Get total count
    count_query = select(func.count()).select_from(Vulnerability).where(Vulnerability.user_id == current_user.id)
    
    # Apply same filters to count
    if severity:
        count_query = count_query.where(Vulnerability.scanner_severity == severity.lower())
    if status:
        count_query = count_query.where(Vulnerability.status == status.lower())
    if asset_id:
        count_query = count_query.where(Vulnerability.asset_id == asset_id)
    if scan_id:
        count_query = count_query.where(Vulnerability.scan_id == scan_id)
    if search:
        search_term = f"%{search}%"
        count_query = count_query.where(
            or_(
                Vulnerability.title.ilike(search_term),
                Vulnerability.description.ilike(search_term),
                Vulnerability.cve_id.ilike(search_term)
            )
        )
    
    total = await db.scalar(count_query)
    
    # Add eager loading for related data
    query = query.options(joinedload(Vulnerability.asset))
    
    # Left join with JiraTicket to check if ticket exists
    query = query.outerjoin(JiraTicket, Vulnerability.id == JiraTicket.vulnerability_id)
    
    # Order by severity (critical first), then by discovered date
    severity_order = {
        'critical': 0,
        'high': 1,
        'medium': 2,
        'low': 3,
        'info': 4
    }
    query = query.order_by(Vulnerability.discovered_at.desc())
    
    # Apply pagination
    query = query.offset(skip).limit(limit)
    
    # Execute query
    result = await db.execute(query)
    rows = result.unique().all()
    
    # Process results to include has_ticket
    vulnerabilities = []
    for row in rows:
        vuln = row[0]  # Vulnerability is first in the tuple
        ticket = row[1] if len(row) > 1 else None  # JiraTicket if exists
        vuln_dict = vuln.__dict__.copy()
        vuln_dict['has_ticket'] = ticket is not None
        vulnerabilities.append(VulnerabilityResponse(**vuln_dict))
    
    return {
        "items": vulnerabilities,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/{vulnerability_id}", response_model=VulnerabilityResponse)
async def get_vulnerability(
    vulnerability_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single vulnerability by ID."""
    query = select(Vulnerability, JiraTicket).where(
        Vulnerability.id == vulnerability_id,
        Vulnerability.user_id == current_user.id
    ).outerjoin(JiraTicket, Vulnerability.id == JiraTicket.vulnerability_id).options(joinedload(Vulnerability.asset))
    
    result = await db.execute(query)
    row = result.unique().first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Vulnerability not found")
    
    vuln = row[0]
    ticket = row[1]
    vuln_dict = vuln.__dict__.copy()
    vuln_dict['has_ticket'] = ticket is not None
    
    return VulnerabilityResponse(**vuln_dict)
