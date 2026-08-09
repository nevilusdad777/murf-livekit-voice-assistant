import sqlite3
import os
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "memory.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                name TEXT,
                language_preference TEXT,
                schemes_checked TEXT,
                eligibility_status TEXT,
                consent_given INTEGER DEFAULT 0,
                last_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()

def get_user(user_id):
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)).fetchone()
        if row:
            return dict(row)
        return None

def save_user(user_id, name, language_preference, schemes_checked, eligibility_status, consent_given):
    # If consent is not given (or rejected), we don't save or we clear their data
    if not consent_given:
        # Delete if they previously consented but now revoked
        delete_user(user_id)
        return False
        
    with get_connection() as conn:
        conn.execute("""
            INSERT INTO users (user_id, name, language_preference, schemes_checked, eligibility_status, consent_given, last_interaction)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id) DO UPDATE SET
                name = excluded.name,
                language_preference = excluded.language_preference,
                schemes_checked = excluded.schemes_checked,
                eligibility_status = excluded.eligibility_status,
                consent_given = excluded.consent_given,
                last_interaction = CURRENT_TIMESTAMP
        """, (user_id, name, language_preference, schemes_checked, eligibility_status, 1))
        conn.commit()
    return True

def delete_user(user_id):
    with get_connection() as conn:
        conn.execute("DELETE FROM users WHERE user_id = ?", (user_id,))
        conn.commit()

# Initialize on import
init_db()
