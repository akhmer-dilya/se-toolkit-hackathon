def register(client):
    return client.post(
        "/auth/register",
        json={"username": "alice", "email": "alice@example.com", "password": "strongpass"},
    )


def test_register_login_refresh(client):
    response = register(client)
    assert response.status_code == 201

    login = client.post("/auth/login", json={"username_or_email": "alice", "password": "strongpass"})
    assert login.status_code == 200

    tokens = login.json()
    assert tokens["access_token"]
    assert tokens["refresh_token"]

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert me.status_code == 200
    assert me.json()["username"] == "alice"

    refreshed = client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert refreshed.status_code == 200
    assert refreshed.json()["access_token"]


def test_forgot_and_reset_password(client):
    register(client)

    forgot = client.post("/auth/forgot-password", json={"email": "alice@example.com"})
    assert forgot.status_code == 200
    reset_token = forgot.json()["reset_token"]
    assert reset_token

    reset = client.post(
        "/auth/reset-password",
        json={"reset_token": reset_token, "new_password": "newstrongpass"},
    )
    assert reset.status_code == 200

    login = client.post("/auth/login", json={"username_or_email": "alice", "password": "newstrongpass"})
    assert login.status_code == 200
