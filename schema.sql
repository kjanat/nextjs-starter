-- Insulin injection tracking schema
CREATE TABLE IF NOT EXISTS injections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_name TEXT NOT NULL,
  injection_time DATETIME NOT NULL,
  injection_type TEXT CHECK(injection_type IN ('morning', 'evening')) NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries by date
CREATE INDEX IF NOT EXISTS idx_injection_time ON injections(injection_time);

-- Index for user statistics
CREATE INDEX IF NOT EXISTS idx_user_name ON injections(user_name);