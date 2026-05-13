-- ============================================================
-- CENTAUR.OS // D1 Database Schema
-- ============================================================
-- Run this once to set up the database:
--   wrangler d1 execute centaur-conversations --remote --file=schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    started_at INTEGER NOT NULL,
    last_activity INTEGER NOT NULL,
    message_count INTEGER NOT NULL DEFAULT 0,
    flagged INTEGER NOT NULL DEFAULT 0,
    ip TEXT,
    country TEXT,
    user_agent TEXT,
    referrer TEXT,
    colo TEXT
);

CREATE INDEX IF NOT EXISTS idx_conv_last_activity ON conversations(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_conv_flagged ON conversations(flagged, last_activity DESC);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

CREATE INDEX IF NOT EXISTS idx_msg_conversation ON messages(conversation_id, created_at ASC);

CREATE TABLE IF NOT EXISTS flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    lead_quality TEXT,
    visitor_name TEXT,
    visitor_contact TEXT,
    their_business TEXT,
    summary TEXT,
    suggested_next_step TEXT,
    success INTEGER NOT NULL DEFAULT 1,
    error TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

CREATE INDEX IF NOT EXISTS idx_flags_created ON flags(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flags_quality ON flags(lead_quality, created_at DESC);
