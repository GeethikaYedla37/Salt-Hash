# macOS-Style Password Manager

A secure password storage and authentication system with a beautiful macOS-inspired interface featuring glassmorphism design.

## Features

### Security
- **bcrypt password hashing** with random salt generation
- **SQLite database** for persistent storage
- **Session management** and authentication
- Protection against rainbow table and dictionary attacks

### macOS-Style Interface
- Authentic macOS Big Sur/Sequoia design language
- Glassmorphism effects (frosted glass UI)
- Draggable, resizable windows with traffic light controls
- Functional dock with app icons
- Customizable wallpaper settings
- Smooth animations and transitions

### Applications
1. **User Manager** - View, add, and manage users
2. **Terminal** - Command-line interface for system operations
3. **History Viewer** - Track login and activity logs
4. **Report Generator** - Generate security audit reports
5. **Export Data** - Export credentials and logs as CSV/JSON
6. **Advanced Settings** - Configure app preferences
7. **Wallpaper Settings** - Customize desktop background

## Installation

### Backend Setup

1. Install Python dependencies:
```bash
cd backend
pip install -r requirements.txt
```

2. Run the Flask server:
```bash
python app.py
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Open `frontend/index.html` in a web browser, or
2. Serve with a local server:
```bash
cd frontend
python -m http.server 8000
```

Then visit `http://localhost:8000`

## Usage

### Login/Register
- Start at the glassmorphic login screen
- Register a new account with username and password
- Login with existing credentials

### Desktop Environment
- Click app icons in the dock to launch applications
- Drag windows by their title bar
- Use traffic light buttons (red=close, yellow=minimize, green=maximize)
- Change wallpaper via Wallpaper Settings app

### Terminal Commands
- `load users` - Display all registered users
- `load history` - Show login/activity history
- `manage users` - Open user management
- `export data` - Export data to files
- `adv settings` - Open advanced settings
- `clear` - Clear terminal screen
- `help` - Show available commands

## Security Implementation

### Password Hashing
The system uses **bcrypt** for password hashing:

```python
import bcrypt

# Generate salt
salt = bcrypt.gensalt()

# Hash password
hashed = bcrypt.hashpw(password.encode('utf-8'), salt)

# Verify password
is_valid = bcrypt.checkpw(entered_password.encode('utf-8'), stored_hash)
```

### Database Schema

**Users Table:**
- username (PRIMARY KEY)
- salt (TEXT)
- hashed_password (TEXT)
- registered_at (TIMESTAMP)

**History Table:**
- id (AUTO INCREMENT)
- username (TEXT)
- action (TEXT: login/logout/register)
- timestamp (TIMESTAMP)

### Why bcrypt?
- **Slow hash function** - increases attack time
- **Built-in salt** - prevents rainbow table attacks
- **Adaptive cost** - can increase difficulty over time
- **Industry standard** for password storage

## Project Structure

```
macos-password-manager/
├── backend/
│   ├── app.py              # Flask API endpoints
│   ├── database.py         # SQLite database operations
│   ├── auth.py             # bcrypt authentication
│   └── requirements.txt    # Python dependencies
├── frontend/
│   └── index.html          # Complete web application
└── README.md
```

## API Endpoints

- `POST /register` - Register new user
- `POST /login` - Authenticate user
- `GET /users` - Get all users
- `DELETE /users/<username>` - Delete user
- `GET /history` - Get activity history
- `GET /export/users` - Export users as CSV
- `GET /export/history` - Export history as CSV
- `GET /report` - Generate security report

## Screenshots

### Login Screen
Glassmorphic login interface with gradient background

### Desktop Environment
macOS-style desktop with dock, menu bar, and draggable windows

### Applications
- User Manager showing hashed passwords
- Terminal with command execution
- History viewer with activity logs

## Technologies Used

### Backend
- Python 3.x
- Flask (web framework)
- bcrypt (password hashing)
- SQLite (database)

### Frontend
- HTML5
- CSS3 (Glassmorphism effects)
- Vanilla JavaScript
- No external frameworks

## Security Best Practices

✅ Passwords never stored in plaintext
✅ Random salt for each password
✅ bcrypt adaptive hashing
✅ Secure session management
✅ SQL injection prevention
✅ CORS configuration
✅ Input validation

## Demo Credentials

For testing purposes, you can register your own account or use:
- Username: `alice`
- Password: `password123`

## License

MIT License - Educational project for demonstrating secure password storage

## Author

Created for Computer Security course demonstrating:
- CO1: Understanding of cryptographic hashing
- CO3: Implementation of secure authentication
- CO5: Application of security best practices
