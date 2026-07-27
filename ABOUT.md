# About MindCarry

## The tutor that learns how each child learns

MindCarry is a local-first AI tutor being built for children aged 5–10 learning foundational reading, writing and maths.

The product begins with one belief: a good tutor does more than explain a lesson. Over time, the tutor understands how one child reasons, where the child hesitates, which mistakes recur, what motivates the child and which explanation finally makes a concept clear.

MindCarry is designed to preserve that understanding in a private, encrypted Learner Memory controlled by the family.

## The problem

Most learning products can personalise a session, recommend an exercise or save a score. Their deeper learner model is often fragmented across applications or tied to one provider’s cloud.

When a family changes device, application or AI provider, the child may have to begin again.

MindCarry is being built so that the learner’s accumulated context can remain:

- private;
- encrypted;
- portable;
- parent-controlled;
- independent of one AI model provider.

## How MindCarry is different

MindCarry separates the intelligence engine from the persistent learner record.

```text
Optional AI provider
        ↓
MindCarry teaching and assessment logic
        ↓
Encrypted Learner Memory controlled by the family
```

Gemini is the first optional provider. It can help generate short alternative explanations, but it is not the permanent source of truth. The learner database remains local and can be exported as an encrypted `.childmind` package for another supported MindCarry installation.

## Honest current status

MindCarry is **pre-MVP**.

Completed work includes:

- product specification;
- initial tutoring flow;
- Learner Memory schema;
- portability design;
- concept walkthrough;
- desktop implementation code;
- automated encryption, vault, lesson-engine and portability tests;
- Windows installation and local-verification scripts.

The codebase is not the same as a validated functioning product. The next milestone is to install it on the target Windows computer, run the complete application, add a real Gemini test key, verify microphone and optional camera permissions, complete the lesson flow, restart the application and test transfer between two installations.

## First prototype

The first prototype is intentionally narrow. It should:

1. conduct a short voice-enabled maths lesson;
2. identify a child’s misconception;
3. change the teaching representation;
4. check independent understanding with a transfer question;
5. write structured evidence to the encrypted local Learner Memory;
6. close and reopen without losing the learner state;
7. export the memory as a `.childmind` package;
8. import it into another installation and resume with the same learning context.

## Automatic storage

Parents should not create, name or connect folders manually.

MindCarry automatically creates:

- the application vault;
- the encrypted learner catalogue;
- one isolated learner directory per child;
- the encrypted learner database;
- rotating encrypted backups;
- reserved media, handwriting and pronunciation directories;
- temporary session storage;
- export and recovery directories.

The exact operating-system location is displayed inside the application. Learner names and ages are not stored in plaintext manifests.

## Multimodal personalisation

The long-term direction includes learning from more than correct and incorrect answers.

With explicit parental permission, MindCarry may use:

- voice and pronunciation;
- spoken reasoning;
- response time;
- repeated hint usage;
- posture and movement changes;
- observable engagement cues;
- teaching methods that improved performance.

These cues should help choose a teaching action. They must not be treated as certain emotional states or used to diagnose mental health, attention disorders or developmental conditions.

The current camera experiment only measures frame-to-frame movement intensity locally. It does not perform face recognition, identity matching or emotion inference, and it does not store raw video.

## Product principles

### 1. The Learner Memory belongs to the family

The child’s progress and learning history should not depend on one cloud provider.

### 2. The AI model is replaceable

Gemini is the first optional provider. Another API or local model should be able to use the same Learner Memory later.

### 3. Personalisation requires evidence

MindCarry should not create permanent conclusions from one answer, expression or session. Stable memories should be supported by repeated observations.

### 4. Teaching is different from answering

The tutor should diagnose, explain, ask the child to reason, check independent understanding and plan what comes next. It should not merely provide homework answers.

### 5. Child safety is a product requirement

Camera and microphone access must be visible, optional and parent-controlled. Sensitive data should not be retained by default.

### 6. Accuracy is more important than hype

Implemented code, automated verification, device testing and long-term vision must always be described separately.

## Initial product focus

MindCarry is initially focused on:

- early English reading;
- foundational maths;
- writing in a later phase.

The first implementation concentrates on addition within 20 because it provides a small, measurable environment for testing the complete learner-memory loop.

## Long-term direction

The goal is a private learning companion that becomes more useful over time because it understands:

- what the child has mastered;
- what the child repeatedly misunderstands;
- how the child explains an answer;
- which examples improve comprehension;
- when a skill should be reviewed;
- how the child learns most effectively.

The AI provider may change. The device may change. The application may evolve.

The learner’s accumulated context should continue with the family.

## Positioning

**GitHub About description**

> Local-first AI tutor with encrypted, portable and family-controlled Learner Memory.

**Short product description**

> AI tutor with child-owned lifelong learner memory.

**Tagline**

> The tutor that learns how your child learns.

**Suggested repository topics**

`ai-tutor` · `edtech` · `adaptive-learning` · `local-first` · `privacy` · `encrypted-memory` · `electron` · `react` · `typescript` · `gemini` · `child-learning`
