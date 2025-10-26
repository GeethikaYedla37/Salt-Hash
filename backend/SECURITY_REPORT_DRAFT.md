# Password Storage and Authentication — Draft Report

## Overview
This project implements a secure credential workflow for a macOS-inspired password manager. The backend is built with Flask and SQLite, and it relies on `bcrypt` to derive salted password hashes. All sensitive operations are isolated in three core modules:

- `auth.py` contains the hashing and verification helpers.
- `database.py` manages persistence in the `users` and `history` tables.
- `app.py` exposes REST endpoints for registration, login, exports, and audit reporting.

## Registration Flow
1. Client submits a username/password pair to `POST /register`.
2. `Auth.hash_password` generates a unique bcrypt salt and derives a hash: `salt, hashed = bcrypt.gensalt(), bcrypt.hashpw(password, salt)`.
3. The tuple `(username, salt, hashed, timestamp)` is inserted into the `users` table by `Database.add_user`.
4. A corresponding `register` activity entry is stored in the `history` table via `Database.add_history`.

Because each call to `bcrypt.gensalt()` produces a random 128-bit salt, even identical passwords produce different hashes. This defeats rainbow-table lookups that depend on pre-computed hash dictionaries.

## Login Verification
1. Client submits credentials to `POST /login`.
2. `Database.get_user` returns the stored record for the supplied username.
3. `Auth.verify_password` runs `bcrypt.checkpw(submitted_password, stored_hash)` to recompute the hash with the saved salt which is embedded in the bcrypt hash string.
4. If the comparison succeeds, the user is considered authenticated and a `login` entry is appended to `history`.

No plaintext password is ever persisted or returned by the API. If verification fails, the client sees a generic "Invalid credentials" response, minimizing leakage about which component of the credential was wrong.

## Stored Data Snapshot
`GET /export/users` streams a CSV formatted list of registered accounts:

```
username,salt,hashed_password,registered_at
alice,$2b$12$4Zjo...,$2b$12$4Zjo...UR7QWQSk/.,2025-10-21T09:15:00.000000
```

The `salt` and `hashed_password` columns are sufficient for bcrypt to verify future logins, yet useless to attackers without a costly brute-force attempt.

## Security Reasoning
- **Unique Salts**: Random salts eliminate collisions with pre-computed tables and ensure identical passwords do not create identical hashes.
- **Adaptive Hashing**: Bcrypt’s cost factor (`$2b$12$` in this project) increases the workload per guess, reducing the risk of high-speed dictionary attacks.
- **Separation of Concerns**: All cryptographic work stays inside `auth.py`, allowing future upgrades (e.g., raising the cost factor) without touching route handlers.
- **Auditing Support**: The `history` table tracks registration, login, and logout events. `GET /report` combines user counts, activity totals, and the last 10 events to support basic security reviews.

## Next Steps
- **Stronger Policy Enforcement**: Enforce minimum length and complexity requirements in the backend to complement the frontend checks.
- **Rate Limiting**: Throttle repeated login attempts to slow online brute-force attacks.
- **Encrypted Secrets**: If business requirements ever demand password recovery, introduce field-level encryption with a server-side key instead of storing plaintext.
- **Automated Testing**: Add unit tests that validate hashing and verification flows using known bcrypt vectors.

This draft covers the design rationale and can be expanded with screenshots of successful/failed login attempts and any UI notes required by the final submission.
