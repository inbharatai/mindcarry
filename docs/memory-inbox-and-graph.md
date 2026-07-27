# MindCarry Memory Inbox and Local Learner Graph

## Decision

MindCarry will keep the child's canonical learning memory **local, encrypted, portable and independent of the AI provider**.

The parent-facing product is a **Memory Inbox**. Underneath it, MindCarry maintains an evidence ledger and a deterministic local graph that connects the learner, skills, interests, lesson sessions and validated memory observations.

This is inspired by the useful principles of code knowledge graphs—local deterministic extraction, queryable relationships and explained provenance—but MindCarry does **not** embed Graphify or send the learner database to an external graph service. Graphify maps codebases. MindCarry's runtime data is already structured, so a small embedded graph inside the encrypted SQLite database is more accurate, private and maintainable.

## Product experience

Parents should only need to:

1. Create the child profile.
2. Choose a parent passphrase.
3. Start a lesson.
4. Open the Memory Inbox when they want to review what MindCarry remembers.
5. Download one encrypted `.childmind` file when they want to back up or move the learner record.

No parent creates folders, graph databases, indexes or configuration files.

## Canonical data layers

### 1. Evidence ledger

The source of truth remains the structured lesson evidence:

- question and answer;
- correctness;
- independent or prompted response;
- response time;
- misconception;
- intervention;
- transfer result;
- source session and date.

AI-generated prose is not allowed to become permanent truth without application validation.

### 2. Memory Inbox

The inbox presents bounded observations such as:

- a demonstrated skill;
- a recurring misconception;
- a teaching strategy that appeared helpful;
- a learning preference requiring more evidence.

Every item includes confidence, evidence count, source lesson, confirmation date and graph-connection count. Parents can archive an item so it is excluded from future lesson context, and restore it later.

### 3. Local Learner Graph

The graph is stored in two encrypted-database tables:

- `memory_graph_nodes`;
- `memory_graph_edges`.

Current node kinds:

- learner;
- skill;
- interest;
- memory;
- session.

Current relations:

- `LEARNING_SKILL`;
- `INTERESTED_IN`;
- `SHOWED_SKILL_EVIDENCE`;
- `SHOWED_MISCONCEPTION`;
- `RESPONDED_TO_STRATEGY`;
- `HAS_LEARNING_PREFERENCE`;
- `HAS_OBSERVATION`;
- `ABOUT_SKILL`;
- `OBSERVED_DURING`.

Every edge has:

- confidence;
- evidence count;
- source memory and session when applicable;
- provenance: `EXTRACTED`, `DERIVED` or `PARENT`;
- creation and update timestamps;
- active state.

## Provider-independent context loading

Before a lesson, MindCarry creates a bounded **Learner Context Packet** from the local database. It contains:

- the current objective;
- a small set of relevant skills;
- up to eight active memory items;
- up to twelve graph facts;
- a short text summary.

Only this selected packet may be supplied to an AI provider. The complete learner database, graph, passphrase and `.childmind` package are not sent.

A new provider adapter can use the same packet, so changing Gemini to another API or a local model does not erase the learner context.

## Portability

The graph and inbox are stored inside the same encrypted learner database that is already exported inside the `.childmind` package. No separate graph folder or provider-specific embedding index is required.

On import:

1. Validate package size, format, learner UUID and checksum.
2. Copy the still-encrypted database into the new local vault.
3. Ask for the original parent passphrase.
4. Decrypt and run SQLite integrity checks locally.
5. Apply schema migrations.
6. Rebuild the deterministic graph from canonical profile, skill and memory records.
7. Create a fresh Learner Context Packet.

## Why no vector store in phase one

The permanent memory must not depend on one embedding provider or model version. Structured records and graph relationships are canonical. A future semantic index can be rebuilt locally and treated as disposable acceleration data.

Phase one therefore uses:

- SQLite/SQL.js;
- deterministic graph IDs;
- explicit relationships;
- bounded SQL retrieval;
- no cloud graph database;
- no vector database;
- no background upload.

## Implemented in this branch

- schema version 3;
- local `memory_events` audit ledger;
- deterministic graph node and edge generation;
- graph rebuild after learner creation, unlock and lesson completion;
- parent-facing Memory Inbox;
- archive and restore controls;
- bounded context packet before each lesson;
- Gemini prompt grounding with selected memory context;
- `.childmind` portability of inbox and graph;
- automated persistence and transfer tests;
- provenance labels for graph edges.

## Deliberately deferred

The following are not claimed as complete:

- parent editing or rewriting of memory content;
- permanent deletion and secure erasure workflow;
- passphrase change and recovery;
- semantic embeddings;
- graph visualisation with drag-and-zoom physics;
- native Android/iOS storage;
- multi-subject graph ontology;
- independent child-safety and privacy/legal review;
- real-child validation.

## Acceptance gates

The first release candidate must pass:

1. Create a synthetic learner and confirm no child PII is present in plaintext manifests.
2. Complete a lesson and confirm memory items appear in the inbox.
3. Confirm graph nodes and explained edges are created.
4. Archive one memory and confirm it disappears from the next context packet.
5. Restore it and confirm it returns.
6. Close and reopen the application and confirm the graph persists.
7. Export the `.childmind` file.
8. Import it into a clean installation.
9. Unlock it with the original passphrase.
10. Confirm inbox, graph and context packet are restored without transferring the Gemini API key.
11. Test with a real Gemini key using synthetic learner data.
12. Complete target-device microphone and optional camera tests.

Until those target-device gates pass, MindCarry remains pre-MVP.