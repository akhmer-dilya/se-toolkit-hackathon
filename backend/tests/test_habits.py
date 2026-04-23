def auth_headers(client, username="bob", email="bob@example.com"):
    client.post("/auth/register", json={"username": username, "email": email, "password": "strongpass"})
    login = client.post("/auth/login", json={"username_or_email": username, "password": "strongpass"})
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_habit_and_track_record(client):
    headers = auth_headers(client)

    habit = client.post(
        "/habits",
        headers=headers,
        json={
            "title": "Read",
            "description": "Read 20 minutes",
            "frequency_per_week": 4,
            "is_group": False,
        },
    )
    assert habit.status_code == 201
    habit_id = habit.json()["id"]

    record = client.post(f"/habits/{habit_id}/records", headers=headers, json={"note": "Done"})
    assert record.status_code == 201

    records = client.get(f"/habits/{habit_id}/records", headers=headers)
    assert records.status_code == 200
    assert len(records.json()) == 1


def test_group_habit_flow(client):
    owner_headers = auth_headers(client, username="owner", email="owner@example.com")

    group = client.post("/groups", headers=owner_headers, json={"name": "Team A"})
    assert group.status_code == 201
    group_id = group.json()["id"]
    invite_code = group.json()["invite_code"]

    member_headers = auth_headers(client, username="member", email="member@example.com")
    joined = client.post("/groups/join", headers=member_headers, json={"invite_code": invite_code})
    assert joined.status_code == 200

    group_habit = client.post(
        "/habits",
        headers=owner_headers,
        json={
            "title": "Team Walk",
            "description": "Walk together",
            "frequency_per_week": 3,
            "is_group": True,
            "group_id": group_id,
        },
    )
    assert group_habit.status_code == 201

    listed = client.get("/habits", headers=member_headers)
    assert listed.status_code == 200
    assert any(item["title"] == "Team Walk" for item in listed.json())
