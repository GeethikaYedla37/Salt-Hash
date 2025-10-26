
from flask import Flask, request, jsonify
from flask_cors import CORS
from database import Database
from auth import Auth
import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Initialize database and auth
db = Database()
auth = Auth()

@app.route('/register', methods=['POST'])
def register():
    """Register a new user with bcrypt hashed password"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    # Check if user exists
    if db.user_exists(username):
        return jsonify({'error': 'User already exists'}), 400

    # Hash password with bcrypt
    salt, hashed_password = auth.hash_password(password)

    # Store user
    db.add_user(username, salt, hashed_password)

    # Log activity
    db.add_history(username, 'register')

    return jsonify({
        'message': 'User registered successfully',
        'username': username
    }), 201

@app.route('/login', methods=['POST'])
def login():
    """Login user with password verification"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    # Get user from database
    user = db.get_user(username)

    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    # Verify password
    if auth.verify_password(password, user['salt'], user['hashed_password']):
        db.add_history(username, 'login')
        return jsonify({
            'message': 'Login successful',
            'username': username
        }), 200
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/users', methods=['GET'])
def get_users():
    """Get all users (for User Manager app)"""
    users = db.get_all_users()
    return jsonify({'users': users}), 200

@app.route('/users/<username>', methods=['DELETE'])
def delete_user(username):
    """Delete a user"""
    if db.delete_user(username):
        return jsonify({'message': f'User {username} deleted'}), 200
    return jsonify({'error': 'User not found'}), 404

@app.route('/history', methods=['GET'])
def get_history():
    """Get login/activity history"""
    history = db.get_history()
    return jsonify({'history': history}), 200

@app.route('/export/users', methods=['GET'])
def export_users():
    """Export users as CSV data"""
    users = db.get_all_users()
    csv_data = "username,salt,hashed_password,registered_at\n"
    for user in users:
        csv_data += f"{user['username']},{user['salt']},{user['hashed_password']},{user['registered_at']}\n"

    return csv_data, 200, {'Content-Type': 'text/csv', 
                           'Content-Disposition': 'attachment; filename=users.csv'}

@app.route('/export/history', methods=['GET'])
def export_history():
    """Export history as CSV data"""
    history = db.get_history()
    csv_data = "username,action,timestamp\n"
    for entry in history:
        csv_data += f"{entry['username']},{entry['action']},{entry['timestamp']}\n"

    return csv_data, 200, {'Content-Type': 'text/csv',
                           'Content-Disposition': 'attachment; filename=history.csv'}

@app.route('/report', methods=['GET'])
def generate_report():
    """Generate security audit report"""
    users = db.get_all_users()
    history = db.get_history()

    report = {
        'generated_at': datetime.datetime.now().isoformat(),
        'total_users': len(users),
        'total_activities': len(history),
        'users': users,
        'recent_activities': history[-10:] if len(history) > 10 else history
    }

    return jsonify(report), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)
