# About MindCarry

## The tutor that learns how each child learns

MindCarry is a local-first AI tutor being built for children aged 5–10 learning foundational reading, writing and maths.

A useful tutor does more than answer a question. Over time, it should understand what one learner has mastered, which misconceptions recur, whether an answer was independent, which representation helped and what should be reviewed next.

MindCarry preserves that understanding in a private, encrypted Learner Memory controlled by the family.

## The problem

Learning context is often fragmented across sessions, applications or one provider’s cloud. When a family changes device, application or model provider, the learner may have to begin again.

MindCarry is designed so accumulated context remains:

- private;
- encrypted;
- portable;
- parent-visible and parent-controlled;
- independent of one AI provider.

## How MindCarry works

```text
Validated lesson evidence
        ↓
Parent-facing Memory Inbox
        ↓
Deterministic local learner graph
        ↓
Ranked and bounded context
        ↓
Optional AI provider for short teaching wording
```

Correctness, lesson state, mastery and permanent memory writes remain controlled by MindCarry. Gemini is the first optional provider; it is not the source of truth.

## Memory Inbox

Parents can see:

- memory type/content;
- confidence and evidence count;
- source lesson and date;
- graph connections;
- active/archive state.

A parent may archive an item so it is excluded from future context. Repeated evidence may reinforce it but does not silently reactivate it. Restore is explicit. Editing and permanent deletion remain future gates.

## Local learner graph

The graph is embedded in the encrypted learner database. It connects learner, skills, interests, memories and sessions through explicit relations with confidence, evidence, source and provenance.

It requires no cloud graph database, graph server, Graphify integration or canonical vector store.

## Provider-independent context

Before a lesson, MindCarry ranks active evidence using objective/skill overlap, memory type, evidence, confidence, recency and review state. It selects at most eight memories, twelve graph facts and 1,800 characters.

The parent-visible context and provider-safe context are separate. Gemini does not receive the child’s name, complete database, complete graph, passphrase, API key or raw media.

## Honest current status

MindCarry is **pre-MVP**.

Implemented repository work includes:

- hardened Electron desktop shell;
- automatic encrypted vault and device catalogue;
- one addition-within-20 tutoring vertical slice;
- typed and supported OS/browser speech input;
- optional local movement experiment;
- Memory Inbox, lifecycle events and deterministic graph;
- ranked, de-identified provider context;
- Gemini test-key adapter and deterministic fallback;
- strict encrypted `.childmind` portability;
- main-only Windows setup, deterministic dependencies, CI and CodeQL;
- encryption, security, lesson, memory, graph and transfer tests.

The codebase is not the same as a validated functioning product. The next milestone is a clean founder-device run covering every UI screen, real Gemini success/failure, microphone/camera permissions, restart behaviour and transfer between two actual installations.

## First prototype objective

The first prototype must demonstrate that MindCarry can:

1. conduct a short voice-enabled maths lesson;
2. identify a simple misconception;
3. change the teaching representation;
4. require independent transfer evidence;
5. write structured evidence into encrypted local memory;
6. update the Inbox and graph;
7. select relevant context for the next lesson;
8. survive restart;
9. export/import the complete encrypted record without transferring API/device keys.

## Automatic storage

Parents do not create, name or connect technical folders. MindCarry automatically creates the vault, encrypted catalogue, UUID learner folder, encrypted database, backups, reserved media boundaries and export/recovery locations.

Child name, age, interests, goal, lessons, memories and graph are not stored in plaintext technical manifests.

## Multimodal direction

With explicit parental consent, future MindCarry versions may use speech, pronunciation, reasoning, response time, hint usage and repeated observable engagement cues to select teaching actions.

These cues must not be treated as certain emotional states or used for medical, developmental or attention diagnosis. The current camera experiment calculates only local frame-to-frame movement intensity and stores no raw video.

## Product principles

### Family ownership

The learner record should remain with the family rather than one cloud provider.

### Replaceable models

Gemini is optional. Another supported API or local model should be able to consume the same bounded context.

### Evidence before personalisation

Stable memory should require structured/repeated evidence, not one expression, answer or model claim.

### Parent visibility and control

Parents should understand why an item exists and control whether it is used.

### Teaching, not answer generation

The tutor should assess, explain, ask for reasoning, check transfer and plan review—not simply provide homework answers.

### Child safety by design

Camera/microphone use must be visible, optional and consent-bound. Raw sensitive media is not retained by default.

### Accuracy before hype

Repository implementation, automated tests, target-device evidence and future vision must always be described separately.

## Product focus

The long-term product targets foundational reading, writing and maths. The current implementation covers only addition within 20 so the complete learner-memory loop can be tested in a small, measurable environment.

## Positioning

**GitHub About**

> Local-first AI tutor with encrypted, portable and family-controlled Learner Memory.

**Product description**

> AI tutor with child-owned lifelong learner memory.

**Tagline**

> The tutor that learns how your child learns.
