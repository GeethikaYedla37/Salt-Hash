
import bcrypt

class Auth:
    def hash_password(self, password: str) -> tuple:
        """
        Hash a password using bcrypt with random salt
        Returns: (salt, hashed_password)
        """
        # Generate salt
        salt = bcrypt.gensalt()

        # Hash password
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)

        # Return both salt and hashed password as strings
        return salt.decode('utf-8'), hashed.decode('utf-8')

    def verify_password(self, password: str, salt: str, hashed_password: str) -> bool:
        """
        Verify a password against stored hash
        """
        try:
            # bcrypt.checkpw handles the verification
            return bcrypt.checkpw(
                password.encode('utf-8'),
                hashed_password.encode('utf-8')
            )
        except Exception:
            return False
