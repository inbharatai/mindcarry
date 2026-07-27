# About MindCarry

## The tutor that learns how each child learns

MindCarry is a local-first AI tutor being built for children learning foundational reading, writing and maths.

The product is based on one belief: a good tutor does more than explain a lesson. Over time, the tutor learns how one child thinks, where the child hesitates, which mistakes recur, what motivates them and which explanation finally makes a concept clear.

MindCarry is designed to preserve that understanding in a private learner memory controlled by the family.

## The problem

Most digital learning products can personalise a session, recommend an exercise or save a score. But the deeper learner model is usually fragmented across applications or locked inside a provider’s cloud.

When a family changes device, application or AI provider, the child often starts again.

MindCarry is being built so that the learner’s accumulated history can remain:

- private;
- encrypted;
- portable;
- inspectable by the parent;
- independent of one AI model provider.

## How MindCarry is different

MindCarry separates the intelligence engine from the learner memory.

```text
AI provider
    ↓
MindCarry teaching and assessment logic
    ↓
Encrypted learner memory owned by the family
```

Gemini is the first optional AI provider in the alpha, but it is not the permanent source of truth. The learner memory is stored locally and can be exported as an encrypted `.childmind` package for use with another supported MindCarry installation.

## What the current alpha does

The current repository contains a working desktop alpha focused on a narrow foundational maths flow.

It can:

- create a separate learner profile;
- protect the profile with a parent passphrase;
- run a short adaptive addition lesson;
- accept typed or supported speech input;
- detect simple misconceptions using deterministic logic;
- choose a teaching intervention;
- optionally ask Gemini for a short alternative explanation;
- calculate a simple mastery score;
- save session summaries and structured memories locally;
- preserve the learner state across application restarts;
- export and import an encrypted `.childmind` learner package;
- optionally calculate a local movement-intensity cue without storing webcam video.

## What the alpha does not yet do

MindCarry is not yet a complete AI tutor.

The current build does not yet provide:

- a full reading, writing and maths curriculum;
- Gemini Live real-time voice;
- production-grade assessment across multiple subjects;
- full parent memory review, editing and selective deletion;
- mobile or tablet applications;
- independent child-safety, privacy or security certification;
- medical, behavioural or emotional diagnosis.

These limitations are deliberate and documented so the repository represents what has actually been built.

## Multimodal personalisation

The long-term product direction includes learning from more than correct and incorrect answers.

With explicit parental permission, MindCarry may use signals such as:

- voice and pronunciation;
- spoken reasoning;
- response time;
- repeated hint usage;
- posture and movement changes;
- observable engagement cues;
- teaching approaches that improved performance.

These signals should help the tutor choose a better teaching action. They must not be used to diagnose emotions, mental health, attention disorders or developmental conditions.

The current camera experiment only measures frame-to-frame movement intensity locally. It does not perform face recognition, identity matching or emotion inference.

## Product principles

### 1. The learner memory belongs to the family

The child’s progress and learning history should not depend on one cloud provider.

### 2. The AI model is replaceable

Gemini is the first optional provider. The product architecture should allow another API or local model to use the same learner memory later.

### 3. Personalisation requires evidence

MindCarry should not create permanent conclusions from one answer, one expression or one session. Stable learner memories should be based on repeated observations.

### 4. Teaching is different from answering

The tutor should diagnose, explain, ask the child to reason, check independent understanding and plan what comes next. It should not simply provide homework answers.

### 5. Child safety is a product requirement

Camera and microphone access must be visible, optional and parent-controlled. Sensitive data should not be retained by default.

### 6. Accuracy is more important than hype

The repository clearly separates implemented alpha features from the long-term vision.

## Initial product focus

MindCarry is initially focused on children aged 5–10 learning:

- early English reading;
- foundational maths;
- writing in a later phase.

The first alpha concentrates on addition within 20 because it provides a small, measurable environment for testing the complete learner-memory loop.

## Long-term direction

The long-term goal is a private learning companion that grows more useful over months and years because it understands:

- what the child has mastered;
- what the child repeatedly misunderstands;
- how the child explains an answer;
- which examples improve comprehension;
- when a skill should be reviewed;
- how the child learns most effectively.

The AI provider may change. The device may change. The application may evolve.

The learner’s accumulated understanding should continue with them.

## Current positioning

**GitHub About description**

> Local-first AI tutor that adapts to each child and keeps learner memory encrypted, portable and family-controlled.

**Short product description**

> AI tutor with child-owned lifelong learner memory.

**Tagline**

> The tutor that learns how your child learns.

**Suggested repository topics**

`ai-tutor` · `edtech` · `adaptive-learning` · `local-first` · `privacy` · `encrypted-memory` · `electron` · `react` · `typescript` · `gemini` · `child-learning`
