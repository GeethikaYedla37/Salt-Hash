
import sqlite3
import datetime
from typing import List, Dict, Optional

class Database:
    def __init__(self, db_path='users.db'):
        self.db_path = db_path
        self.init_database()

    def init_database(self):
        """Initialize database tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                salt TEXT NOT NULL,
                hashed_password TEXT NOT NULL,
                registered_at TEXT NOT NULL
            )
        ''')

        # History table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                action TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )
        ''')

        conn.commit()
        conn.close()

    def add_user(self, username: str, salt: str, hashed_password: str) -> bool:
        """Add a new user to database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            registered_at = datetime.datetime.now().isoformat()

            cursor.execute(
                'INSERT INTO users (username, salt, hashed_password, registered_at) VALUES (?, ?, ?, ?)',
                (username, salt, hashed_password, registered_at)
            )

            conn.commit()
            conn.close()
            return True
        except sqlite3.IntegrityError:
            return False

    def user_exists(self, username: str) -> bool:
        """Check if user exists"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('SELECT username FROM users WHERE username = ?', (username,))
        result = cursor.fetchone()

        conn.close()
        return result is not None

    def get_user(self, username: str) -> Optional[Dict]:
        """Get user by username"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('SELECT username, salt, hashed_password, registered_at FROM users WHERE username = ?', 
                      (username,))
        result = cursor.fetchone()

        conn.close()

        if result:
            return {
                'username': result[0],
                'salt': result[1],
                'hashed_password': result[2],
                'registered_at': result[3]
            }
        return None

    def get_all_users(self) -> List[Dict]:
        """Get all users"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('SELECT username, salt, hashed_password, registered_at FROM users')
        results = cursor.fetchall()

        conn.close()

        return [
            {
                'username': row[0],
                'salt': row[1],
                'hashed_password': row[2],
                'registered_at': row[3]
            }
            for row in results
        ]

    def delete_user(self, username: str) -> bool:
        """Delete a user"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('DELETE FROM users WHERE username = ?', (username,))
        deleted = cursor.rowcount > 0

        conn.commit()
        conn.close()

        return deleted

    def add_history(self, username: str, action: str):
        """Add history entry"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        timestamp = datetime.datetime.now().isoformat()

        cursor.execute(
            'INSERT INTO history (username, action, timestamp) VALUES (?, ?, ?)',
            (username, action, timestamp)
        )

        conn.commit()
        conn.close()

    def get_history(self) -> List[Dict]:
        """Get all history entries"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('SELECT username, action, timestamp FROM history ORDER BY timestamp DESC')
        results = cursor.fetchall()

        conn.close()

        return [
            {
                'username': row[0],
                'action': row[1],
                'timestamp': row[2]
            }
            for row in results
        ]
