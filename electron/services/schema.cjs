const SCHEMA_VERSION = 3;

const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO metadata (key, value) VALUES ('schema_version', '${SCHEMA_VERSION}');

CREATE TABLE IF NOT EXISTS profile (
  learner_id TEXT PRIMARY KEY,
  preferred_name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK(age BETWEEN 4 AND 14),
  preferred_language TEXT NOT NULL DEFAULT 'English',
  interests_json TEXT NOT NULL DEFAULT '[]',
  parent_goal TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS consent (
  learner_id TEXT PRIMARY KEY,
  microphone_allowed INTEGER NOT NULL DEFAULT 1 CHECK(microphone_allowed IN (0, 1)),
  camera_allowed INTEGER NOT NULL DEFAULT 0 CHECK(camera_allowed IN (0, 1)),
  local_behaviour_analysis_allowed INTEGER NOT NULL DEFAULT 0 CHECK(local_behaviour_analysis_allowed IN (0, 1)),
  transcript_storage_allowed INTEGER NOT NULL DEFAULT 1 CHECK(transcript_storage_allowed IN (0, 1)),
  raw_audio_storage_allowed INTEGER NOT NULL DEFAULT 0 CHECK(raw_audio_storage_allowed IN (0, 1)),
  raw_video_storage_allowed INTEGER NOT NULL DEFAULT 0 CHECK(raw_video_storage_allowed IN (0, 1)),
  consent_version TEXT NOT NULL DEFAULT '1.0',
  consented_at TEXT NOT NULL,
  FOREIGN KEY (learner_id) REFERENCES profile(learner_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS skills (
  skill_id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  name TEXT NOT NULL,
  mastery INTEGER NOT NULL DEFAULT 0 CHECK(mastery BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'introduced',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_practised TEXT,
  next_review TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  learner_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  objective TEXT NOT NULL,
  summary TEXT,
  next_recommendation TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  FOREIGN KEY (learner_id) REFERENCES profile(learner_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attempts (
  attempt_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  correct INTEGER NOT NULL CHECK(correct IN (0, 1)),
  independent INTEGER NOT NULL CHECK(independent IN (0, 1)),
  used_hint INTEGER NOT NULL CHECK(used_hint IN (0, 1)),
  response_ms INTEGER NOT NULL,
  misconception TEXT,
  intervention TEXT,
  reasoning_observation TEXT,
  provider TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS memories (
  memory_id TEXT PRIMARY KEY,
  learner_id TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence REAL NOT NULL CHECK(confidence BETWEEN 0 AND 1),
  source_session TEXT,
  created_at TEXT NOT NULL,
  last_confirmed TEXT NOT NULL,
  review_after TEXT,
  evidence_count INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
  FOREIGN KEY (learner_id) REFERENCES profile(learner_id) ON DELETE CASCADE,
  FOREIGN KEY (source_session) REFERENCES sessions(session_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS memory_events (
  event_id TEXT PRIMARY KEY,
  learner_id TEXT NOT NULL,
  memory_id TEXT,
  event_type TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  source_session TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (learner_id) REFERENCES profile(learner_id) ON DELETE CASCADE,
  FOREIGN KEY (memory_id) REFERENCES memories(memory_id) ON DELETE SET NULL,
  FOREIGN KEY (source_session) REFERENCES sessions(session_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS memory_graph_nodes (
  node_id TEXT PRIMARY KEY,
  learner_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  canonical_key TEXT NOT NULL,
  label TEXT NOT NULL,
  attributes_json TEXT NOT NULL DEFAULT '{}',
  confidence REAL NOT NULL DEFAULT 1 CHECK(confidence BETWEEN 0 AND 1),
  evidence_count INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
  UNIQUE(learner_id, kind, canonical_key),
  FOREIGN KEY (learner_id) REFERENCES profile(learner_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS memory_graph_edges (
  edge_id TEXT PRIMARY KEY,
  learner_id TEXT NOT NULL,
  source_node_id TEXT NOT NULL,
  relation TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 1 CHECK(confidence BETWEEN 0 AND 1),
  evidence_count INTEGER NOT NULL DEFAULT 1,
  source_memory_id TEXT,
  source_session TEXT,
  provenance TEXT NOT NULL CHECK(provenance IN ('EXTRACTED', 'DERIVED', 'PARENT')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
  FOREIGN KEY (learner_id) REFERENCES profile(learner_id) ON DELETE CASCADE,
  FOREIGN KEY (source_node_id) REFERENCES memory_graph_nodes(node_id) ON DELETE CASCADE,
  FOREIGN KEY (target_node_id) REFERENCES memory_graph_nodes(node_id) ON DELETE CASCADE,
  FOREIGN KEY (source_memory_id) REFERENCES memories(memory_id) ON DELETE SET NULL,
  FOREIGN KEY (source_session) REFERENCES sessions(session_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS engagement_events (
  event_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  movement_level REAL NOT NULL CHECK(movement_level BETWEEN 0 AND 1),
  response_latency_ms INTEGER,
  cue TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
CREATE INDEX IF NOT EXISTS idx_memories_active ON memories(learner_id, active, last_confirmed);
CREATE INDEX IF NOT EXISTS idx_attempts_session ON attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_learner ON sessions(learner_id, started_at);
CREATE INDEX IF NOT EXISTS idx_memory_events_learner ON memory_events(learner_id, created_at);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_learner ON memory_graph_nodes(learner_id, active, kind);
CREATE INDEX IF NOT EXISTS idx_graph_edges_learner ON memory_graph_edges(learner_id, active, relation);
CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON memory_graph_edges(source_node_id, active);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON memory_graph_edges(target_node_id, active);
`;

module.exports = { SCHEMA_SQL, SCHEMA_VERSION };