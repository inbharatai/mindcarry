const crypto = require('node:crypto');

const GRAPH_VERSION = 1;
const MAX_CONTEXT_MEMORIES = 8;
const MAX_GRAPH_FACTS = 12;

function normalise(value, max = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function stableId(...parts) {
  return crypto.createHash('sha256').update(parts.map((part) => normalise(part, 1000)).join('\u001f')).digest('hex').slice(0, 36);
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(String(value || ''));
  } catch {
    return fallback;
  }
}

function queryOne(db, sql, params = []) {
  const statement = db.prepare(sql);
  try {
    statement.bind(params);
    return statement.step() ? statement.getAsObject() : null;
  } finally {
    statement.free();
  }
}

function queryAll(db, sql, params = []) {
  const statement = db.prepare(sql);
  const rows = [];
  try {
    statement.bind(params);
    while (statement.step()) rows.push(statement.getAsObject());
    return rows;
  } finally {
    statement.free();
  }
}

function upsertNode(db, learnerId, node, now) {
  const canonicalKey = normalise(node.canonicalKey || node.label, 240).toLowerCase();
  const nodeId = node.nodeId || stableId(learnerId, 'node', node.kind, canonicalKey);
  db.run(
    `INSERT INTO memory_graph_nodes (
      node_id, learner_id, kind, canonical_key, label, attributes_json, confidence,
      evidence_count, created_at, updated_at, active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT(node_id) DO UPDATE SET
      label = excluded.label,
      attributes_json = excluded.attributes_json,
      confidence = excluded.confidence,
      evidence_count = excluded.evidence_count,
      updated_at = excluded.updated_at,
      active = 1`,
    [
      nodeId,
      learnerId,
      normalise(node.kind, 50),
      canonicalKey,
      normalise(node.label, 500),
      JSON.stringify(node.attributes || {}),
      Math.max(0, Math.min(1, Number(node.confidence ?? 1))),
      Math.max(1, Number(node.evidenceCount || 1)),
      node.createdAt || now,
      now,
    ],
  );
  return nodeId;
}

function upsertEdge(db, learnerId, edge, now) {
  const edgeId = edge.edgeId || stableId(learnerId, 'edge', edge.sourceNodeId, edge.relation, edge.targetNodeId, edge.sourceMemoryId || '');
  db.run(
    `INSERT INTO memory_graph_edges (
      edge_id, learner_id, source_node_id, relation, target_node_id, confidence,
      evidence_count, source_memory_id, source_session, provenance, created_at, updated_at, active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT(edge_id) DO UPDATE SET
      confidence = excluded.confidence,
      evidence_count = excluded.evidence_count,
      source_memory_id = excluded.source_memory_id,
      source_session = excluded.source_session,
      provenance = excluded.provenance,
      updated_at = excluded.updated_at,
      active = 1`,
    [
      edgeId,
      learnerId,
      edge.sourceNodeId,
      normalise(edge.relation, 80).toUpperCase(),
      edge.targetNodeId,
      Math.max(0, Math.min(1, Number(edge.confidence ?? 1))),
      Math.max(1, Number(edge.evidenceCount || 1)),
      edge.sourceMemoryId || null,
      edge.sourceSession || null,
      ['EXTRACTED', 'DERIVED', 'PARENT'].includes(edge.provenance) ? edge.provenance : 'DERIVED',
      edge.createdAt || now,
      now,
    ],
  );
  return edgeId;
}

function relationForMemory(type) {
  const value = normalise(type, 50).toLowerCase();
  if (value === 'skill') return 'SHOWED_SKILL_EVIDENCE';
  if (value === 'misconception') return 'SHOWED_MISCONCEPTION';
  if (value === 'pedagogical') return 'RESPONDED_TO_STRATEGY';
  if (value === 'preference') return 'HAS_LEARNING_PREFERENCE';
  return 'HAS_OBSERVATION';
}

function rebuildMemoryGraph(db, learnerId) {
  const now = new Date().toISOString();
  db.run('UPDATE memory_graph_nodes SET active = 0, updated_at = ? WHERE learner_id = ?', [now, learnerId]);
  db.run('UPDATE memory_graph_edges SET active = 0, updated_at = ? WHERE learner_id = ?', [now, learnerId]);

  const profile = queryOne(db, 'SELECT * FROM profile WHERE learner_id = ?', [learnerId]);
  if (!profile) throw new Error('Cannot build a memory graph without a learner profile.');

  const learnerNodeId = upsertNode(db, learnerId, {
    kind: 'learner',
    canonicalKey: learnerId,
    label: profile.preferred_name,
    attributes: { age: Number(profile.age), language: profile.preferred_language },
  }, now);

  const skillRows = queryAll(db, 'SELECT * FROM skills ORDER BY domain, name');
  const skillNodeIds = new Map();
  for (const skill of skillRows) {
    const skillNodeId = upsertNode(db, learnerId, {
      kind: 'skill',
      canonicalKey: skill.skill_id,
      label: skill.name,
      attributes: {
        domain: skill.domain,
        mastery: Number(skill.mastery || 0),
        status: skill.status,
        nextReview: skill.next_review || null,
      },
      confidence: Math.max(0.25, Math.min(1, Number(skill.mastery || 0) / 100)),
      evidenceCount: Math.max(1, Number(skill.attempts || 0)),
    }, now);
    skillNodeIds.set(String(skill.skill_id), skillNodeId);
    upsertEdge(db, learnerId, {
      sourceNodeId: learnerNodeId,
      relation: 'LEARNING_SKILL',
      targetNodeId: skillNodeId,
      confidence: 1,
      evidenceCount: Math.max(1, Number(skill.attempts || 0)),
      provenance: 'EXTRACTED',
    }, now);
  }

  const interests = parseJson(profile.interests_json, []);
  for (const interest of Array.isArray(interests) ? interests.slice(0, 20) : []) {
    const label = normalise(interest, 80);
    if (!label) continue;
    const interestNodeId = upsertNode(db, learnerId, {
      kind: 'interest',
      canonicalKey: label,
      label,
      attributes: {},
      confidence: 1,
    }, now);
    upsertEdge(db, learnerId, {
      sourceNodeId: learnerNodeId,
      relation: 'INTERESTED_IN',
      targetNodeId: interestNodeId,
      confidence: 1,
      provenance: 'EXTRACTED',
    }, now);
  }

  const memories = queryAll(
    db,
    `SELECT * FROM memories WHERE learner_id = ? AND active = 1
     ORDER BY confidence DESC, evidence_count DESC, last_confirmed DESC`,
    [learnerId],
  );
  const defaultSkillNodeId = skillNodeIds.get('addition-within-20') || [...skillNodeIds.values()][0] || null;

  for (const memory of memories) {
    const memoryNodeId = upsertNode(db, learnerId, {
      nodeId: stableId(learnerId, 'memory', memory.memory_id),
      kind: 'memory',
      canonicalKey: memory.memory_id,
      label: memory.content,
      attributes: {
        memoryId: memory.memory_id,
        type: memory.type,
        sourceSession: memory.source_session || null,
        lastConfirmed: memory.last_confirmed,
        reviewAfter: memory.review_after || null,
      },
      confidence: Number(memory.confidence || 0),
      evidenceCount: Number(memory.evidence_count || 1),
      createdAt: memory.created_at,
    }, now);

    upsertEdge(db, learnerId, {
      sourceNodeId: learnerNodeId,
      relation: relationForMemory(memory.type),
      targetNodeId: memoryNodeId,
      confidence: Number(memory.confidence || 0),
      evidenceCount: Number(memory.evidence_count || 1),
      sourceMemoryId: memory.memory_id,
      sourceSession: memory.source_session || null,
      provenance: 'EXTRACTED',
      createdAt: memory.created_at,
    }, now);

    if (defaultSkillNodeId && ['skill', 'misconception', 'pedagogical'].includes(String(memory.type).toLowerCase())) {
      upsertEdge(db, learnerId, {
        sourceNodeId: memoryNodeId,
        relation: 'ABOUT_SKILL',
        targetNodeId: defaultSkillNodeId,
        confidence: Number(memory.confidence || 0),
        evidenceCount: Number(memory.evidence_count || 1),
        sourceMemoryId: memory.memory_id,
        sourceSession: memory.source_session || null,
        provenance: 'DERIVED',
        createdAt: memory.created_at,
      }, now);
    }

    if (memory.source_session) {
      const source = queryOne(db, 'SELECT objective, started_at, summary FROM sessions WHERE session_id = ?', [memory.source_session]);
      if (source) {
        const sessionNodeId = upsertNode(db, learnerId, {
          kind: 'session',
          canonicalKey: memory.source_session,
          label: source.objective,
          attributes: { startedAt: source.started_at, summary: source.summary || null },
          confidence: 1,
        }, now);
        upsertEdge(db, learnerId, {
          sourceNodeId: memoryNodeId,
          relation: 'OBSERVED_DURING',
          targetNodeId: sessionNodeId,
          confidence: 1,
          sourceMemoryId: memory.memory_id,
          sourceSession: memory.source_session,
          provenance: 'EXTRACTED',
        }, now);
      }
    }
  }

  db.run(`INSERT OR REPLACE INTO metadata (key, value) VALUES ('memory_graph_version', ?)`, [String(GRAPH_VERSION)]);
  db.run(`INSERT OR REPLACE INTO metadata (key, value) VALUES ('memory_graph_updated_at', ?)`, [now]);
  return graphSnapshot(db, learnerId);
}

function graphSnapshot(db, learnerId, nodeLimit = 120, edgeLimit = 180) {
  const nodes = queryAll(
    db,
    `SELECT node_id, kind, label, attributes_json, confidence, evidence_count, created_at, updated_at
     FROM memory_graph_nodes WHERE learner_id = ? AND active = 1
     ORDER BY kind, evidence_count DESC, confidence DESC LIMIT ?`,
    [learnerId, Math.max(1, Math.min(500, Number(nodeLimit || 120)))],
  ).map((row) => ({
    nodeId: row.node_id,
    kind: row.kind,
    label: row.label,
    attributes: parseJson(row.attributes_json, {}),
    confidence: Number(row.confidence || 0),
    evidenceCount: Number(row.evidence_count || 1),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const edges = queryAll(
    db,
    `SELECT edge_id, source_node_id, relation, target_node_id, confidence, evidence_count,
            source_memory_id, source_session, provenance, created_at, updated_at
     FROM memory_graph_edges WHERE learner_id = ? AND active = 1
     ORDER BY evidence_count DESC, confidence DESC, updated_at DESC LIMIT ?`,
    [learnerId, Math.max(1, Math.min(750, Number(edgeLimit || 180)))],
  ).map((row) => ({
    edgeId: row.edge_id,
    sourceNodeId: row.source_node_id,
    relation: row.relation,
    targetNodeId: row.target_node_id,
    confidence: Number(row.confidence || 0),
    evidenceCount: Number(row.evidence_count || 1),
    sourceMemoryId: row.source_memory_id || null,
    sourceSession: row.source_session || null,
    provenance: row.provenance,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const updated = queryOne(db, `SELECT value FROM metadata WHERE key = 'memory_graph_updated_at'`);
  return { version: GRAPH_VERSION, generatedAt: updated?.value || null, nodes, edges };
}

function memoryInbox(db, learnerId, includeArchived = true) {
  const rows = queryAll(
    db,
    `SELECT m.*, s.objective AS source_objective, s.summary AS source_summary, s.started_at AS source_started_at,
            (SELECT COUNT(*) FROM memory_graph_edges e WHERE e.source_memory_id = m.memory_id AND e.active = 1) AS graph_edge_count
     FROM memories m
     LEFT JOIN sessions s ON s.session_id = m.source_session
     WHERE m.learner_id = ? ${includeArchived ? '' : 'AND m.active = 1'}
     ORDER BY m.active DESC, m.last_confirmed DESC, m.confidence DESC`,
    [learnerId],
  );
  return rows.map((row) => ({
    memoryId: row.memory_id,
    type: row.type,
    content: row.content,
    confidence: Number(row.confidence || 0),
    evidenceCount: Number(row.evidence_count || 1),
    active: Boolean(Number(row.active)),
    createdAt: row.created_at,
    lastConfirmed: row.last_confirmed,
    reviewAfter: row.review_after || null,
    sourceSessionId: row.source_session || null,
    sourceObjective: row.source_objective || null,
    sourceSummary: row.source_summary || null,
    sourceStartedAt: row.source_started_at || null,
    graphEdgeCount: Number(row.graph_edge_count || 0),
  }));
}

function buildContextPacket(db, learnerId, objective = 'Current lesson') {
  const profile = queryOne(db, 'SELECT * FROM profile WHERE learner_id = ?', [learnerId]);
  if (!profile) throw new Error('Learner profile is unavailable.');
  const skills = queryAll(
    db,
    `SELECT skill_id, domain, name, mastery, status, attempts, last_practised, next_review
     FROM skills ORDER BY last_practised DESC, mastery ASC LIMIT 6`,
  ).map((row) => ({
    skillId: row.skill_id,
    domain: row.domain,
    name: row.name,
    mastery: Number(row.mastery || 0),
    status: row.status,
    attempts: Number(row.attempts || 0),
    lastPractised: row.last_practised || null,
    nextReview: row.next_review || null,
  }));
  const relevantMemories = memoryInbox(db, learnerId, false).slice(0, MAX_CONTEXT_MEMORIES);
  const graph = graphSnapshot(db, learnerId, 100, 200);
  const nodeById = new Map(graph.nodes.map((node) => [node.nodeId, node]));
  const graphFacts = graph.edges
    .filter((edge) => edge.provenance === 'EXTRACTED' || edge.provenance === 'DERIVED')
    .slice(0, MAX_GRAPH_FACTS)
    .map((edge) => ({
      source: nodeById.get(edge.sourceNodeId)?.label || edge.sourceNodeId,
      relation: edge.relation,
      target: nodeById.get(edge.targetNodeId)?.label || edge.targetNodeId,
      confidence: edge.confidence,
      evidenceCount: edge.evidenceCount,
      provenance: edge.provenance,
    }));

  const lines = [
    `Objective: ${normalise(objective, 160)}`,
    ...skills.slice(0, 3).map((skill) => `Skill: ${skill.name}; mastery ${skill.mastery}%; status ${skill.status}.`),
    ...relevantMemories.map((memory) => `Memory (${memory.type}, ${Math.round(memory.confidence * 100)}% confidence, ${memory.evidenceCount} evidence): ${memory.content}`),
  ];

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    objective: normalise(objective, 160),
    learner: {
      learnerId,
      preferredName: profile.preferred_name,
      age: Number(profile.age),
      language: profile.preferred_language,
      interests: parseJson(profile.interests_json, []),
    },
    skills,
    relevantMemories,
    graphFacts,
    summaryText: normalise(lines.join('\n'), 1800),
  };
}

function recordMemoryEvent(db, learnerId, event) {
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO memory_events (
      event_id, learner_id, memory_id, event_type, details_json, source_session, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      crypto.randomUUID(),
      learnerId,
      event.memoryId || null,
      normalise(event.eventType || 'updated', 50),
      JSON.stringify(event.details || {}),
      event.sourceSession || null,
      now,
    ],
  );
}

module.exports = {
  GRAPH_VERSION,
  buildContextPacket,
  graphSnapshot,
  memoryInbox,
  rebuildMemoryGraph,
  recordMemoryEvent,
  relationForMemory,
  stableId,
};