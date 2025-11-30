# Salt-Hash

A secure password manager application with a Python backend and a simple HTML/JS frontend. This project demonstrates password storage, authentication, and basic user management features.

deployed link:https://salt-hash-1.onrender.com/

## Features
- User authentication and password hashing
- Secure password storage using salt and hash
- Simple web-based frontend
- User management and password history

## Project Structure
```
backend/
    app.py           # Main backend application
    auth.py          # Authentication logic
    database.py      # Database operations
    requirements.txt # Python dependencies
frontend/
    app.js           # Frontend logic
    index.html       # Main HTML page
    style.css        # Stylesheet
    assets/          # Images and icons
```

## Getting Started

### Backend Setup
1. Navigate to the `backend` directory:
   ```powershell
   cd backend
   ```
2. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
3. Run the backend server:
   ```powershell
   python app.py
   ```

### Frontend Setup
1. Open `frontend/index.html` in your browser.

## Security
- Passwords are salted and hashed before storage.
- See `SECURITY_REPORT_DRAFT.md` for details.

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
This project is licensed under the MIT License.
