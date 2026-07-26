from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import get_settings


@dataclass(slots=True)
class RemediationResult:
    text: str
    model: str


def _format_vulnerability_context(vulnerability) -> str:
    asset_identifier = vulnerability.asset.asset_identifier if vulnerability.asset else "Unknown"
    asset_type = vulnerability.asset.asset_type if vulnerability.asset else "Unknown"
    return "\n".join(
        [
            f"Title: {vulnerability.title}",
            f"Severity: {vulnerability.scanner_severity or 'unknown'}",
            f"CVSS Score: {vulnerability.cvss_score if vulnerability.cvss_score is not None else 'N/A'}",
            f"CVE: {vulnerability.cve_id or 'N/A'}",
            f"Asset: {asset_identifier}",
            f"Asset Type: {asset_type}",
            f"Port/Protocol: {f'{vulnerability.port}/{vulnerability.protocol}' if vulnerability.port else 'N/A'}",
            f"Description: {vulnerability.description or 'No description available'}",
            f"Current Remediation: {vulnerability.remediation or 'No remediation available yet'}",
        ]
    )


def _build_prompt(vulnerability) -> str:
    context = _format_vulnerability_context(vulnerability)
    return (
        "You are a senior application security engineer. "
        "Write concise, practical remediation steps for the vulnerability below. "
        "Return only the remediation content, without an intro or closing sentence. "
        "Use 4 to 7 bullet points. Each bullet should be specific, actionable, and suitable for pasting into a Jira ticket. "
        "Focus on immediate mitigation first, then permanent fixes, then validation.\n\n"
        f"{context}"
    )


def _clean_model_text(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:markdown|md|text)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


async def _call_gemini(client: httpx.AsyncClient, api_key: str, model: str, prompt: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    response = await client.post(
        url,
        params={"key": api_key},
        json={
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}],
                }
            ],
            "generationConfig": {
                "temperature": 0.3,
                "topP": 0.9,
                "maxOutputTokens": 512,
            },
        },
    )

    if response.status_code >= 400:
        raise httpx.HTTPStatusError(
            f"Gemini model {model} returned HTTP {response.status_code}",
            request=response.request,
            response=response,
        )

    payload = response.json()
    candidates = payload.get("candidates") or []
    for candidate in candidates:
        content = candidate.get("content") or {}
        parts = content.get("parts") or []
        texts = [part.get("text", "") for part in parts if isinstance(part, dict)]
        combined = "\n".join(texts).strip()
        if combined:
            return _clean_model_text(combined)

    raise ValueError(f"Gemini model {model} returned no usable text")


async def _list_available_models(client: httpx.AsyncClient, api_key: str) -> list[str]:
    response = await client.get(
        "https://generativelanguage.googleapis.com/v1beta/models",
        params={"key": api_key},
    )
    if response.status_code >= 400:
        raise httpx.HTTPStatusError(
            f"Failed to list Gemini models (HTTP {response.status_code})",
            request=response.request,
            response=response,
        )

    payload: dict[str, Any] = response.json()
    models = payload.get("models") or []
    available: list[str] = []
    for item in models:
        if not isinstance(item, dict):
            continue
        name = item.get("name")
        supported_methods = item.get("supportedGenerationMethods") or []
        if not name or not isinstance(name, str):
            continue
        if "generateContent" not in supported_methods:
            continue
        available.append(name.removeprefix("models/"))
    return available


def _candidate_model_order(configured_models: str, available_models: list[str] | None = None) -> list[str]:
    preferred = [model.strip() for model in configured_models.split(",") if model.strip()]
    if not available_models:
        return preferred

    available_set = set(available_models)
    fallback_prefixes = ("gemini-2.5", "gemini-2.0", "gemini-1.5")

    ordered: list[str] = []

    # Try configured models first, but only if the API says they exist.
    for model in preferred:
        if model in available_set and model not in ordered:
            ordered.append(model)

    # Then try any other available free models in descending family order.
    for model in available_models:
        if model.startswith(fallback_prefixes) and model not in ordered:
            ordered.append(model)

    # Finally, if nothing matched the discovery response, fall back to the configured list.
    if not ordered:
        ordered.extend(preferred)

    return ordered


async def generate_remediation_steps(vulnerability) -> RemediationResult:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    prompt = _build_prompt(vulnerability)
    last_error: Exception | None = None
    failure_details: list[str] = []

    timeout = httpx.Timeout(settings.ai_request_timeout_seconds)
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            available_models = await _list_available_models(client, settings.gemini_api_key)
        except Exception:
            available_models = []

        models = _candidate_model_order(settings.gemini_models, available_models)
        if not models:
            raise RuntimeError("No Gemini models configured")

        for model in models:
            try:
                text = await _call_gemini(client, settings.gemini_api_key, model, prompt)
                return RemediationResult(text=text, model=model)
            except (httpx.HTTPError, ValueError) as error:
                last_error = error
                failure_details.append(f"{model}: {error}")

    raise RuntimeError(
        "Failed to generate remediation with any configured Gemini model. "
        + ("; ".join(failure_details) if failure_details else "No additional error details available.")
    ) from last_error