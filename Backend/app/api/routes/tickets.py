"""API routes for ticket management."""
from datetime import datetime
from typing import List
from uuid import UUID

import requests
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.schemas import CreateTicketRequest, TicketResponse, TicketListResponse, MessageResponse
from app.api.routes.auth import get_current_user
from app.db.models import User, Vulnerability, JiraTicket
from app.db.session import get_db

router = APIRouter(prefix="/tickets", tags=["tickets"])


def create_jira_ticket(
    jira_url: str,
    email: str,
    api_token: str,
    project_key: str,
    summary: str,
    description: str,
    priority: str = "Medium",
    issue_type: str = "Bug"
) -> dict:
    """
    Create a Jira ticket using REST API v3.

    Args:
        jira_url: Base Jira URL (e.g., https://example.atlassian.net)
        email: Jira user email
        api_token: Jira API token
        project_key: Project key (e.g., PROJ, DEV)
        summary: Issue summary/title
        description: Issue description
        priority: Priority level (Highest, High, Medium, Low, Lowest)
        issue_type: Type of issue (Bug, Task, Story, etc.)

    Returns:
        Created issue data with key and URL
    """
    # Remove trailing slash from URL
    jira_url = jira_url.rstrip('/')

    issue_url = f"{jira_url}/rest/api/3/issue"
    createmeta_url = f"{jira_url}/rest/api/3/issue/createmeta?projectKeys={project_key}&expand=projects.issuetypes"

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

    auth = (email, api_token)

    def build_payload(resolved_issue_type: str, include_priority: bool) -> dict:
        fields = {
            "project": {"key": project_key},
            "summary": summary,
            "description": {
                "type": "doc",
                "version": 1,
                "content": [
                    {
                        "type": "paragraph",
                        "content": [
                            {
                                "type": "text",
                                "text": description
                            }
                        ]
                    }
                ]
            },
            "issuetype": {"name": resolved_issue_type},
        }

        if include_priority and priority:
            fields["priority"] = {"name": priority}

        return {"fields": fields}

    def extract_error_detail(response: requests.Response | None, error: Exception) -> str:
        status_code = getattr(response, "status_code", None)
        response_text = getattr(response, "text", None)
        if status_code is not None and response_text:
            return (
                f"Failed to create Jira ticket via {issue_url} for project '{project_key}' "
                f"(status {status_code}): {response_text}"
            )
        return f"Failed to create Jira ticket via {issue_url} for project '{project_key}': {str(error)}"

    def post_issue(payload: dict) -> requests.Response:
        response = requests.post(issue_url, headers=headers, json=payload, auth=auth)
        response.raise_for_status()
        return response

    candidate_issue_types: list[str] = [issue_type]

    try:
        meta_response = requests.get(createmeta_url, headers=headers, auth=auth)
        if meta_response.ok:
            meta_data = meta_response.json()
            projects = meta_data.get("projects") or []
            if projects:
                issue_types = projects[0].get("issuetypes") or []
                available_issue_types = [item.get("name") for item in issue_types if item.get("name")]
                if issue_type not in available_issue_types and available_issue_types:
                    candidate_issue_types = [*available_issue_types, issue_type]
                elif available_issue_types:
                    candidate_issue_types = [issue_type, *[name for name in available_issue_types if name != issue_type]]
    except requests.exceptions.RequestException:
        # If createmeta is unavailable, fall back to the requested issue type.
        pass

    try:
        last_error: str | None = None
        for resolved_issue_type in candidate_issue_types:
            for include_priority in (True, False):
                payload = build_payload(resolved_issue_type, include_priority)
                try:
                    response = post_issue(payload)
                    issue_data = response.json()
                    ticket_key = issue_data["key"]
                    ticket_url = f"{jira_url}/browse/{ticket_key}"

                    return {
                        "ticket_id": ticket_key,
                        "ticket_url": ticket_url,
                        "created_at": datetime.now()
                    }
                except requests.exceptions.RequestException as e:
                    last_error = extract_error_detail(getattr(e, "response", None), e)

        raise HTTPException(
            status_code=500,
            detail=last_error or f"Failed to create Jira ticket via {issue_url} for project '{project_key}'."
        )

    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=extract_error_detail(getattr(e, "response", None), e)
        )


@router.post("/", response_model=List[TicketResponse])
async def create_ticket(
    request: CreateTicketRequest,
    db: AsyncSession = Depends(get_db),
    current_user_response: User = Depends(get_current_user),
):
    """
    Create Jira tickets for vulnerabilities.

    If vulnerability_ids is None, creates individual tickets for all open vulnerabilities.
    If vulnerability_ids is provided, creates individual tickets for each specified vulnerability.
    Each vulnerability gets its own Jira ticket (enforced by database UNIQUE constraint).
    """
    # Fetch full user model with sensitive fields from database
    from app.db.user_service import UserService
    current_user = await UserService.get_user_by_id(db, current_user_response.id)
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate Jira configuration
    if not current_user.jira_base_url or not current_user.jira_api_token or not current_user.jira_project_keys:
        raise HTTPException(
            status_code=400,
            detail="Jira integration not configured. Please set up Jira credentials and project keys in your profile."
        )

    # Get vulnerabilities that don't already have tickets
    if request.vulnerability_ids:
        # Specific vulnerabilities - exclude those that already have tickets
        stmt = (
            select(Vulnerability)
            .options(selectinload(Vulnerability.asset))  # Eager load asset
            .outerjoin(JiraTicket, Vulnerability.id == JiraTicket.vulnerability_id)
            .where(
                Vulnerability.id.in_(request.vulnerability_ids),
                Vulnerability.user_id == current_user.id,
                JiraTicket.id.is_(None)  # Only vulnerabilities without tickets
            )
        )
        vulnerabilities = await db.scalars(stmt)
        vulnerabilities = vulnerabilities.all()
    else:
        # All open vulnerabilities without tickets
        stmt = (
            select(Vulnerability)
            .options(selectinload(Vulnerability.asset))  # Eager load asset
            .outerjoin(JiraTicket, Vulnerability.id == JiraTicket.vulnerability_id)
            .where(
                Vulnerability.user_id == current_user.id,
                Vulnerability.status == 'open',
                JiraTicket.id.is_(None)  # Only vulnerabilities without tickets
            )
        )
        vulnerabilities = await db.scalars(stmt)
        vulnerabilities = vulnerabilities.all()

    if not vulnerabilities:
        raise HTTPException(
            status_code=404,
            detail="No vulnerabilities found to create tickets for. All selected vulnerabilities may already have tickets."
        )

    # Create individual tickets for each vulnerability
    created_tickets = []
    
    for vuln in vulnerabilities:
        vuln_id_str = str(vuln.id)
        # Prepare ticket content for this vulnerability
        title = request.title or f"Vulnerability: {vuln.title}"
        description = request.description or f"""
Vulnerability Details:
- Title: {vuln.title}
- Severity: {vuln.scanner_severity.upper() if vuln.scanner_severity else 'N/A'}
- CVE: {vuln.cve_id or 'N/A'}
- Asset: {vuln.asset.asset_identifier if vuln.asset else 'Unknown'}
- Port: {f'{vuln.port}/{vuln.protocol}' if vuln.port else 'N/A'}
- CVSS Score: {vuln.cvss_score or 'N/A'}
- Status: {vuln.status}

Description:
{vuln.description or 'No description available'}

Remediation:
{vuln.remediation or 'No remediation steps available'}
        """.strip()

        try:
            # Try configured Jira project keys in order until one succeeds.
            ticket_data = None
            last_error: str | None = None
            for project_key in dict.fromkeys(current_user.jira_project_keys):
                try:
                    ticket_data = create_jira_ticket(
                        jira_url=current_user.jira_base_url,
                        email=current_user.email,
                        api_token=current_user.jira_api_token,
                        project_key=project_key,
                        summary=title,
                        description=description,
                        priority=request.priority,
                        issue_type=request.issue_type
                    )
                    break
                except HTTPException as jira_error:
                    last_error = jira_error.detail if isinstance(jira_error.detail, str) else str(jira_error.detail)

            if ticket_data is None:
                raise HTTPException(
                    status_code=500,
                    detail=last_error or "Failed to create Jira ticket with any configured project key."
                )

            # Save ticket to database
            jira_ticket = JiraTicket(
                vulnerability_id=vuln.id,
                user_id=current_user.id,
                jira_ticket_key=ticket_data["ticket_id"],
                jira_url=ticket_data["ticket_url"],
                jira_status="Open"
            )
            db.add(jira_ticket)
            try:
                await db.commit()
                await db.refresh(jira_ticket)
            except IntegrityError:
                await db.rollback()

                existing_ticket = await db.scalar(
                    select(JiraTicket).where(JiraTicket.vulnerability_id == vuln.id)
                )
                if existing_ticket is None:
                    existing_ticket = await db.scalar(
                        select(JiraTicket).where(JiraTicket.jira_ticket_key == ticket_data["ticket_id"])
                    )

                if existing_ticket is None:
                    raise HTTPException(
                        status_code=409,
                        detail=(
                            f"Jira ticket {ticket_data['ticket_id']} already exists in the database "
                            f"and could not be linked to vulnerability {vuln_id_str}."
                        )
                    )

                ticket_data = {
                    "ticket_id": existing_ticket.jira_ticket_key,
                    "ticket_url": existing_ticket.jira_url or ticket_data["ticket_url"],
                    "created_at": existing_ticket.created_at,
                }

            created_tickets.append(TicketResponse(
                ticket_id=ticket_data["ticket_id"],
                ticket_url=ticket_data["ticket_url"],
                vulnerability_ids=[vuln.id],
                created_at=ticket_data["created_at"]
            ))

        except HTTPException:
            raise
        except Exception as e:
            # Log error but continue with other vulnerabilities
            await db.rollback()
            import traceback
            error_details = traceback.format_exc()
            print(f"Error creating ticket for vuln {vuln_id_str}: {str(e)}")
            print(error_details)
            # Store the last error to show user
            last_error = str(e)
            continue

    if not created_tickets:
        error_msg = "Failed to create any Jira tickets."
        if 'last_error' in locals():
            error_msg = last_error
        raise HTTPException(
            status_code=500,
            detail=error_msg
        )

    return created_tickets


@router.get("/", response_model=TicketListResponse)
async def list_tickets(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all Jira tickets created by the current user.
    """
    # Get total count efficiently
    count_stmt = select(func.count()).select_from(JiraTicket).where(JiraTicket.user_id == current_user.id)
    total = await db.scalar(count_stmt)

    # Get paginated tickets
    stmt = (
        select(JiraTicket)
        .where(JiraTicket.user_id == current_user.id)
        .order_by(JiraTicket.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    tickets = await db.scalars(stmt)
    tickets = tickets.all()

    # Convert to response format
    ticket_responses = [
        TicketResponse(
            ticket_id=ticket.jira_ticket_key,
            ticket_url=ticket.jira_url or "",
            vulnerability_ids=[ticket.vulnerability_id],
            created_at=ticket.created_at
        )
        for ticket in tickets
    ]

    return TicketListResponse(
        items=ticket_responses,
        total=total or 0
    )


@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a specific Jira ticket by ticket key.
    """
    stmt = select(JiraTicket).where(
        JiraTicket.jira_ticket_key == ticket_id,
        JiraTicket.user_id == current_user.id
    )
    ticket = await db.scalar(stmt)
    
    if not ticket:
        raise HTTPException(
            status_code=404,
            detail=f"Ticket {ticket_id} not found"
        )
    
    return TicketResponse(
        ticket_id=ticket.jira_ticket_key,
        ticket_url=ticket.jira_url or "",
        vulnerability_ids=[ticket.vulnerability_id],
        created_at=ticket.created_at
    )


@router.delete("/{ticket_id}", response_model=MessageResponse)
async def delete_ticket(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a Jira ticket record from the database.
    Note: This only removes the ticket reference from our database,
    it does NOT delete the ticket from Jira.
    """
    stmt = select(JiraTicket).where(
        JiraTicket.jira_ticket_key == ticket_id,
        JiraTicket.user_id == current_user.id
    )
    ticket = await db.scalar(stmt)
    
    if not ticket:
        raise HTTPException(
            status_code=404,
            detail=f"Ticket {ticket_id} not found"
        )
    
    await db.delete(ticket)
    await db.commit()
    
    return MessageResponse(
        message=f"Ticket {ticket_id} reference deleted successfully"
    )