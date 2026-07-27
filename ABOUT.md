# About MindCarry

## The tutor that learns how each child learns

MindCarry is a local-first AI tutor being built for children aged 5–10 learning foundational reading, writing and maths.

A good tutor does more than explain a lesson. Over time, the tutor understands how one child reasons, where the child hesitates, which mistakes recur, what motivates the child and which explanation finally makes a concept clear.

MindCarry is designed to preserve that understanding in a private, encrypted Learner Memory controlled by the family.

## The problem

Most learning products can personalise a session, recommend an exercise or save a score. Their deeper learner model is often fragmented across applications or tied to one provider’s cloud.

When a family changes device, application or AI provider, the child may have to begin again.

MindCarry is being built so the learner’s accumulated context remains:

- private;
- encrypted;
- portable;
- parent-controlled;
- independent of one AI provider.

## How MindCarry is different

MindCarry separates the intelligence engine from the persistent learner record.

```text
Validated learning evidence
        ↓
Parent-facing Memory Inbox
        ↓
Local explained learner graph
        ↓
Bounded context for the selected AI provider
```

Gemini is the first optional provider. It can generate short alternative explanations, but it is not the permanent source of truth. Correctness, lesson state and permanent memory writes remain controlled by MindCarry.

The learner database remains local and can be exported as one encrypted `.childmind` package for another supported installation.

## Memory Inbox

Parents can review what MindCarry remembers in understandable language. Each memory item shows:

- observation type;
- confidence;
- evidence count;
- source lesson;
- confirmation date;
- active or archived status.

A parent can archive an item so it is excluded from future lesson context and restore it later. Editing, permanent deletion and secure erasure remain future release gates.

## Local learner graph

MindCarry connects learner evidence through a small embedded graph stored inside the encrypted learner database.

Current graph concepts include:

- learner;
- skill;
- interest;
- memory;
- session.

Relationships include skill evidence, misconceptions, useful strategies, interests and source lessons. Every relationship records confidence, evidence count and explained provenance.

The graph does not require a cloud graph database, separate graph server or permanent provider-specific embedding index.

## Honest current status

MindCarry is **pre-MVP**.

Completed repository work includes:

- product specification;
- initial tutoring flow;
- encrypted Learner Memory schema;
- parent-facing Memory Inbox;
- deterministic local learner graph;
- bounded provider-independent context packet;
- portability design and `.childmind` implementation;
- desktop implementation code;
- automated encryption, vault, lesson, graph and portability tests;
- Windows installation and local-verification scripts.

The codebase is not the same as a validated functioning product. The next milestone is to install it on the target Windows computer, run the complete application, add a real Gemini test key, verify microphone and optional camera permissions, complete the lesson, inspect the Inbox and graph, restart the application and transfer the encrypted memory between two installations.

## First prototype

The first prototype is intentionally narrow. It should:

1. conduct a short voice-enabled maths lesson;
2. identify a child’s misconception;
3. change the teaching representation;
4. check independent understanding with a transfer question;
5. write structured evidence to the encrypted local Learner Memory;
6. update the Memory Inbox and local graph;
7. close and reopen without losing learner state;
8. export the memory as a `.childmind` package;
9. import it into another installation and resume with the same context.

## Automatic storage

Parents should not create, name or connect folders manually.

MindCarry automatically creates the application vault, encrypted learner catalogue, isolated learner directory, encrypted database, backups, reserved media locations, temporary session storage and export location.

The Memory Inbox, event ledger and graph live inside the encrypted learner database. Learner names and ages are not stored in plaintext manifests.

## Multimodal personalisation

The long-term direction includes learning from more than correct and incorrect answers.

With explicit parental permission, MindCarry may use voice, pronunciation, spoken reasoning, response time, repeated hint usage and observable engagement cues to choose a teaching action.

These cues must not be treated as certain emotional states or used to diagnose mental health, attention disorders or developmental conditions.

The current camera experiment only measures frame-to-frame movement intensity locally. It does not perform face recognition, identity matching or emotion inference, and it does not store raw video.

## Product principles

### 1. The Learner Memory belongs to the family

The child’s progress and learning history should not depend on one cloud provider.

### 2. The AI model is replaceable

Gemini is the first optional provider. Another API or local model should be able to use the same bounded context from the same Learner Memory later.

### 3. Personalisation requires evidence

MindCarry should not create permanent conclusions from one answer, expression or session. Stable memories should be supported by repeated observations.

### 4. Parents need visibility and control

Parents should be able to see why a memory exists, archive it from future use and eventually correct or delete it.

### 5. Teaching is different from answering

The tutor should diagnose, explain, ask the child to reason, check independent understanding and plan what comes next. It should not merely provide homework answers.

### 6. Child safety is a product requirement

Camera and microphone access must be visible, optional and parent-controlled. Sensitive data should not be retained by default.

### 7. Accuracy is more important than hype

Implemented code, automated verification, device testing and long-term vision must always be described separately.

## Initial product focus

MindCarry is initially focused on early English reading and foundational maths, with writing in a later phase.

The first implementation concentrates on addition within 20 because it provides a small, measurable environment for testing the complete learner-memory loop.

## Long-term direction

The goal is a private learning companion that becomes more useful over time because it understands:

- what the child has mastered;
- what the child repeatedly misunderstands;
- how the child explains an answer;
- which examples improve comprehension;
- when a skill should be reviewed;
- how the child learns most effectively.

The AI provider may change. The device may change. The application may evolve. The learner’s accumulated context should continue with the family.

## Positioning

**GitHub About description**

> Local-first AI tutor with encrypted, portable and family-controlled Learner Memory.

**Short product description**

> AI tutor with child-owned lifelong learner memory.

**Tagline**

> The tutor that learns how your child learns.