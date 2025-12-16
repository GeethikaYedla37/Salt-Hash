
import os
import subprocess
import time
import pytest
from playwright.sync_api import Page, expect

@pytest.fixture(scope="module", autouse=True)
def manage_server():
    # Ensure no server is running on the port
    os.system("kill $(lsof -t -i :5000) 2>/dev/null || true")

    # Delete the database for a clean state (server creates it in the root dir)
    db_path = "users.db"
    if os.path.exists(db_path):
        os.remove(db_path)

    # Start the Flask server in the background
    server_process = subprocess.Popen(
        ["python", "backend/app.py"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    # Give the server a moment to start
    time.sleep(2)

    # Yield control to the test
    yield

    # Teardown: kill the server process
    server_process.kill()

def test_hass_functions(page: Page):
    page.goto(f"file://{os.getcwd()}/frontend/index.html")

    # Register a new user
    page.locator("#username").fill("testuser")
    page.locator("#password").fill("testpassword")
    page.get_by_role("button", name="Register New User").click()
    expect(page.locator("#login-message")).to_contain_text("Registration successful! Please login.")

    # Log in with the new user (re-fill credentials as they are cleared after registration)
    page.locator("#username").fill("testuser")
    page.locator("#password").fill("testpassword")
    page.get_by_role("button", name="Log In").click()
    expect(page.locator("#login-message")).to_contain_text("Login successful!", timeout=10000)

    # Wait for the desktop to appear
    expect(page.locator("#desktop")).to_be_visible(timeout=10000)

    # Check User Manager
    page.get_by_role("button", name="User Manager").click()
    expect(page.get_by_role("cell", name="testuser")).to_be_visible()

    # Close the User Manager window to ensure the menu is accessible
    page.locator('.window[data-app="user-manager"] .traffic-light.close').click()
    time.sleep(0.5) # Wait for the window close animation

    # Log out
    page.locator("#apple-menu-btn").click()
    expect(page.locator("#apple-menu")).to_be_visible(timeout=5000)
    page.get_by_role("menuitem", name="Log Out").click()
    expect(page.locator("#username")).to_be_visible()
