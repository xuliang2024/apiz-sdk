"""Helpers for the apiz Python test suite."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import respx
from httpx import Response

# tests/ -> python/ -> sdk/
SDK_ROOT = Path(__file__).resolve().parents[2]
FIXTURES = SDK_ROOT / "tests" / "fixtures"

MOCK_BASE_URL = "https://mock.api.apiz.ai"
TEST_API_KEY = "sk-mock-test-not-real-0000000000000000000000"


def load_fixture(rel_path: str) -> Any:
    return json.loads((FIXTURES / rel_path).read_text(encoding="utf-8"))


def fixture_response(rel_path: str, status: int = 200) -> Response:
    return Response(status, json=load_fixture(rel_path))


def install_default_routes(router: respx.Router) -> None:
    """Install the default mock routes shared by most tests."""
    router.get(f"{MOCK_BASE_URL}/api/v3/balance").mock(
        return_value=fixture_response("http/GET__v3_balance.json")
    )
    router.post(f"{MOCK_BASE_URL}/api/v3/checkin").mock(
        return_value=fixture_response("http/POST__v3_checkin__success.json")
    )
    router.get(f"{MOCK_BASE_URL}/api/v3/mcp/models").mock(
        return_value=fixture_response("http/GET__v3_mcp_models.json")
    )
    router.get(
        f"{MOCK_BASE_URL}/api/v3/mcp/models/fal-ai/flux-2/flash"
    ).mock(return_value=fixture_response("http/GET__v3_mcp_models__flux2flash.json"))
    router.get(
        f"{MOCK_BASE_URL}/api/v3/models/fal-ai/flux-2/flash/docs"
    ).mock(return_value=fixture_response("http/GET__v3_models_docs.json"))

    def _create(request):  # type: ignore[no-untyped-def]
        body = json.loads(request.content)
        if body.get("model") == "jimeng-4.5":
            return fixture_response("http/POST__v3_tasks_create__sync.json")
        return fixture_response("http/POST__v3_tasks_create__async.json")

    router.post(f"{MOCK_BASE_URL}/api/v3/tasks/create").mock(side_effect=_create)
    router.post(f"{MOCK_BASE_URL}/api/v3/tasks/query").mock(
        return_value=fixture_response("http/POST__v3_tasks_query__pending.json")
    )
    router.post(f"{MOCK_BASE_URL}/api/v3/minimax/voices").mock(
        return_value=fixture_response("http/POST__v3_minimax_voices.json")
    )
    router.post(f"{MOCK_BASE_URL}/api/v3/minimax/t2a").mock(
        return_value=fixture_response("http/POST__v3_minimax_t2a.json")
    )
    router.get(f"{MOCK_BASE_URL}/api/v3/mcp/skills").mock(
        return_value=fixture_response("http/GET__v3_mcp_skills.json")
    )
    router.post(f"{MOCK_BASE_URL}/api/v3/tools/parse-video").mock(
        return_value=fixture_response("http/POST__v3_tools_parse_video.json")
    )
    router.post(f"{MOCK_BASE_URL}/api/v3/tools/transfer-url").mock(
        return_value=fixture_response("http/POST__v3_tools_transfer_url.json")
    )
