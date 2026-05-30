import pytest
from unittest.mock import patch, AsyncMock

pytestmark = pytest.mark.asyncio


class TestAuthToken:
    async def test_valid_secret_returns_token(self, client):
        resp = await client.post("/api/v1/auth/token", json={
            "device_id": "dev-001",
            "shared_secret": "test-device-secret",
        })
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"
        assert body["expires_in"] == 15 * 60

    async def test_invalid_secret_rejected(self, client):
        resp = await client.post("/api/v1/auth/token", json={
            "device_id": "dev-001",
            "shared_secret": "wrong-secret",
        })
        assert resp.status_code == 403

    async def test_missing_fields_returns_422(self, client):
        resp = await client.post("/api/v1/auth/token", json={"device_id": "dev-001"})
        assert resp.status_code == 422


class TestAttendanceBatch:
    @patch("app.routes.attendance.require_device_integrity", new_callable=AsyncMock)
    async def test_batch_insert_single_event(self, mock_integrity, client, auth_headers):
        mock_integrity.return_value = None
        resp = await client.post("/api/v1/attendance", json={
            "events": [{
                "event_id": "evt-001",
                "user_id": "U1",
                "user_name": "Alice",
                "device_id": "dev-001",
                "timestamp": "2026-05-24T10:00:00Z",
                "cosine_score": 0.88,
                "liveness_passed": True,
            }]
        }, headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert "evt-001" in body["accepted"]
        assert len(body["rejected"]) == 0
        assert len(body["server_ack"]) == 64

    @patch("app.routes.attendance.require_device_integrity", new_callable=AsyncMock)
    async def test_idempotent_duplicate_rejected(self, mock_integrity, client, auth_headers):
        mock_integrity.return_value = None
        event = {
            "event_id": "evt-dup",
            "user_id": "U1",
            "user_name": "Bob",
            "device_id": "dev-001",
            "timestamp": "2026-05-24T11:00:00Z",
            "cosine_score": 0.90,
            "liveness_passed": True,
        }
        await client.post("/api/v1/attendance", json={"events": [event]}, headers=auth_headers)
        resp = await client.post("/api/v1/attendance", json={"events": [event]}, headers=auth_headers)
        body = resp.json()
        assert "evt-dup" in body["rejected"]
        assert len(body["accepted"]) == 0

    @patch("app.routes.attendance.require_device_integrity", new_callable=AsyncMock)
    async def test_batch_multiple_events(self, mock_integrity, client, auth_headers):
        mock_integrity.return_value = None
        events = [
            {
                "event_id": f"evt-batch-{i}",
                "user_id": "U1",
                "user_name": "Charlie",
                "device_id": "dev-001",
                "timestamp": f"2026-05-24T{10+i:02d}:00:00Z",
                "cosine_score": 0.85,
                "liveness_passed": True,
            }
            for i in range(5)
        ]
        resp = await client.post("/api/v1/attendance", json={"events": events}, headers=auth_headers)
        body = resp.json()
        assert len(body["accepted"]) == 5
        assert len(body["rejected"]) == 0

    async def test_no_auth_returns_401(self, client):
        resp = await client.post("/api/v1/attendance", json={
            "events": [{
                "event_id": "evt-no-auth",
                "user_id": "U1",
                "user_name": "Nobody",
                "device_id": "dev-001",
                "timestamp": "2026-05-24T10:00:00Z",
                "cosine_score": 0.80,
                "liveness_passed": True,
            }]
        })
        assert resp.status_code == 401

    async def test_invalid_token_returns_401(self, client):
        resp = await client.post("/api/v1/attendance", json={
            "events": [{
                "event_id": "evt-bad-tok",
                "user_id": "U1",
                "user_name": "Nobody",
                "device_id": "dev-001",
                "timestamp": "2026-05-24T10:00:00Z",
                "cosine_score": 0.80,
                "liveness_passed": True,
            }]
        }, headers={"Authorization": "Bearer invalid.token.here"})
        assert resp.status_code == 401

    @patch("app.routes.attendance.require_device_integrity", new_callable=AsyncMock)
    async def test_pydantic_validation_missing_required(self, mock_integrity, client, auth_headers):
        mock_integrity.return_value = None
        resp = await client.post("/api/v1/attendance", json={
            "events": [{"event_id": "evt-bad"}]
        }, headers=auth_headers)
        assert resp.status_code == 422


class TestAttendanceQuery:
    @patch("app.routes.attendance.require_device_integrity", new_callable=AsyncMock)
    async def test_query_returns_inserted(self, mock_integrity, client, auth_headers):
        mock_integrity.return_value = None
        await client.post("/api/v1/attendance", json={
            "events": [{
                "event_id": "evt-q1",
                "user_id": "U5",
                "user_name": "QueryUser",
                "device_id": "dev-001",
                "timestamp": "2026-05-24T09:00:00Z",
                "cosine_score": 0.92,
                "liveness_passed": True,
            }]
        }, headers=auth_headers)
        resp = await client.get("/api/v1/attendance?user_id=U5", headers=auth_headers)
        assert resp.status_code == 200
        records = resp.json()
        assert len(records) >= 1
        assert records[0]["user_id"] == "U5"

    @patch("app.routes.attendance.require_device_integrity", new_callable=AsyncMock)
    async def test_query_date_range_filter(self, mock_integrity, client, auth_headers):
        mock_integrity.return_value = None
        await client.post("/api/v1/attendance", json={
            "events": [{
                "event_id": "evt-date1",
                "user_id": "U6",
                "user_name": "DateUser",
                "device_id": "dev-001",
                "timestamp": "2026-05-20T10:00:00Z",
                "cosine_score": 0.91,
                "liveness_passed": True,
            }]
        }, headers=auth_headers)
        resp = await client.get(
            "/api/v1/attendance?date_from=2026-05-21T00:00:00Z&date_to=2026-05-25T00:00:00Z",
            headers=auth_headers,
        )
        records = resp.json()
        for r in records:
            assert r["event_id"] != "evt-date1"

    async def test_query_no_auth_returns_401(self, client):
        resp = await client.get("/api/v1/attendance")
        assert resp.status_code == 401


class TestHealthcheck:
    async def test_healthz(self, client):
        resp = await client.get("/api/v1/healthz")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
