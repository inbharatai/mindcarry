# Memory Inbox and Local Learner Graph

## Architecture decision

MindCarry keeps canonical learner memory **local, encrypted, portable and independent of the AI provider**.

The parent-facing product is a **Memory Inbox**. Underneath it, MindCarry maintains:

1. a structured evidence ledger;
2. memory lifecycle events;
3. a deterministic local graph;
4. a ranked, bounded context selector.

MindCarry does not embed Graphify or send learner data to an external graph service. Graphify’s useful ideas—deterministic extraction, queryable relationships and provenance—are applied through purpose-built SQLite tables because MindCarry’s lesson data is already structured.

## Parent experience

A parent should only need to:

1. create the learner;
2. choose a passphrase;
3. complete lessons;
4. review/archive/restore memories;
5. download one encrypted `.childmind` when backing up or moving the record.

No graph server, folder selection, vector database or configuration file is required.

## Canonical layers

### Evidence ledger

Source-of-truth lesson records include:

- question and answer;
- correctness;
- independent/hint-assisted state;
- bounded response time;
- misconception and intervention;
- reasoning observation;
- transfer result;
- source session/date.

Provider prose cannot directly become permanent truth.

### Memory Inbox

Memory types currently include skill, misconception, pedagogical strategy, preference and generic observation.

Each item includes:

- content/type;
- confidence;
- evidence count;
- source lesson;
- creation/confirmation/review dates;
- active/archive state;
- graph-connection count.

Parent archive semantics are strict:

- archived items are excluded from future context and active graph edges;
- repeated evidence may increase evidence/confidence;
- repeated evidence does not reactivate the item;
- only explicit restore reactivates it.

### Lifecycle ledger

`memory_events` records `created`, `reinforced`, `archived` and `restored` events with source/details. Event and graph mutation is transactional.

### Local graph

Tables:

```text
memory_graph_nodes
memory_graph_edges
```

Node kinds:

```text
learner · skill · interest · memory · session
```

Relations:

```text
LEARNING_SKILL
INTERESTED_IN
SHOWED_SKILL_EVIDENCE
SHOWED_MISCONCEPTION
RESPONDED_TO_STRATEGY
HAS_LEARNING_PREFERENCE
HAS_OBSERVATION
ABOUT_SKILL
OBSERVED_DURING
```

Every edge stores confidence, evidence count, optional source memory/session, timestamps, active state and provenance:

- `EXTRACTED` — explicit canonical record;
- `DERIVED` — deterministic application rule;
- `PARENT` — reserved for future parent confirmation.

Node/edge IDs are deterministic. The graph is rebuilt from canonical records on creation, unlock and completed lesson.

## Relevance ranking

Before each lesson, active memory is ranked using:

- objective-token overlap;
- current-skill overlap;
- memory-type weight;
- evidence count;
- confidence;
- recency;
- due-for-review bonus.

Graph facts are ranked using objective/skill overlap, confidence and evidence.

Current caps:

```text
8 memory items
12 graph facts
1,800 characters
```

The ranking score is retrieval metadata, not a judgement about the child.

## Parent-visible and provider-safe context

The context packet contains two text representations:

- `summaryText` — local parent preview including explained graph facts;
- `providerText` — de-identified provider version.

For `providerText`:

- learner-node labels become `Learner`;
- the child’s name is not added to the model instruction;
- only selected active evidence is included;
- complete DB/Inbox/graph/session history is excluded;
- passphrase, API key, raw media and `.childmind` are excluded.

A provider adapter can consume the same packet, so changing Gemini to another supported provider does not erase the family’s canonical context.

## Portability

Inbox, lifecycle events and graph live inside the encrypted learner database carried by `.childmind`.

Import flow:

1. validate total and encrypted-payload size;
2. validate package/manifest/schema versions;
3. validate UUID, canonical base64 and checksum;
4. write the still-encrypted database into a new UUID folder;
5. display **Imported learner**;
6. ask for the original passphrase;
7. authenticate/decrypt and verify SQLite identity/integrity/consent;
8. migrate schema;
9. rebuild graph and ranked context;
10. update the receiving encrypted catalogue.

Gemini/device credentials do not travel.

## Why no canonical vector store yet

Permanent memory must not depend on one embedding provider/model version. Structured evidence and explicit graph relations are canonical. A future semantic index may be used only as disposable, locally rebuildable acceleration data.

Current phase uses:

- SQLite/SQL.js;
- deterministic IDs/relations;
- bounded ranked SQL retrieval;
- no cloud graph database;
- no vector database;
- no background upload.

## Implemented

- schema version 3;
- Memory Inbox and lifecycle events;
- deterministic graph/provenance;
- relevance ranking and bounded context v2;
- separate parent/provider context;
- archive-state preservation during reinforcement;
- transactional graph/event updates;
- Gemini grounding with de-identified context;
- `.childmind` portability;
- persistence, malformed-input and second-installation tests.

## Deferred gates

- memory editing/correction;
- permanent deletion/secure-erasure semantics;
- full learner deletion;
- passphrase change/recovery;
- contradiction/expiry governance beyond current confidence/evidence fields;
- semantic embeddings;
- multi-subject ontology;
- native mobile storage;
- independent security, child-safety and privacy/legal review;
- real-child validation.

## Acceptance gates

1. No child PII in plaintext technical manifests.
2. Lesson creates correct evidence/Inbox items.
3. Graph nodes/edges/provenance are explainable.
4. Parent-visible context contains selected facts.
5. Provider-safe context omits the child name and remains bounded.
6. Archive removes an item from context.
7. Reinforcement does not reactivate it.
8. Restore returns it.
9. Restart preserves Inbox/graph/archive state.
10. Tampered/non-canonical exports are rejected.
11. Clean second-install import restores canonical data without provider/device keys.
12. Real Gemini, microphone and optional camera pass target-device tests.

Until target-device gates pass, MindCarry remains pre-MVP.
