# Roadmap

MindCarry’s roadmap is organised by evidence gates, not feature count. A stage is complete only when its acceptance evidence exists.

## Stage 0 — Product and trust-boundary specification

**Status: complete for the first vertical slice.**

- product purpose and child/family ownership principle;
- addition-within-20 tutoring flow;
- encrypted Learner Memory schema;
- Memory Inbox and local graph design;
- provider-independent context boundary;
- portable `.childmind` format;
- privacy, architecture and threat documents;
- synthetic acceptance scenario.

## Stage 1 — Repository-complete pre-MVP

**Status: implemented; final CI is the repository gate. Target-device evidence is still missing.**

- hardened Electron + React + TypeScript shell;
- automatic encrypted local vault and learner catalogue;
- deterministic three-question maths lesson;
- typed and supported OS/browser speech input;
- optional local movement experiment;
- parent-visible Memory Inbox;
- deterministic graph and ranked context;
- Gemini test-key adapter and deterministic fallback;
- strict `.childmind` export/import;
- main-only Windows setup;
- committed dependency lockfile and `npm ci`;
- Windows/Ubuntu CI, production dependency audit and CodeQL;
- security, portability and integration tests.

**Exit criteria:**

- final Windows and Ubuntu CI succeeds;
- CodeQL succeeds;
- no committed key, learner export or real-child data;
- README and status documents match the tested repository.

## Stage 2 — Functioning founder-tested prototype

**Status: next.**

- clean install and launch on the founder’s Windows machine;
- verify DPAPI secure storage and automatic vault;
- visually test every screen and interaction;
- complete deterministic and real-Gemini lessons;
- test timeout, rate-limit, revoked-key and offline fallback;
- verify microphone and optional camera allow/deny/cleanup;
- verify archive/restore changes next-session context;
- verify close/reopen and forced-interruption behaviour;
- transfer `.childmind` across two actual clean installations;
- launch unsigned Windows installer and portable build;
- fix every discovered defect;
- retain reproducible synthetic evidence.

**Exit criteria:**

- repeated clean installs work without developer repair;
- one complete synthetic demo is reproducible;
- no known critical/high repository or device defect;
- all README claims match demonstrated behaviour.

## Stage 3 — Parent controls and supervised-family readiness

- parent correction of a memory;
- permanent individual-memory deletion and audit semantics;
- full learner deletion;
- passphrase change/recovery decision;
- verified external backup and restore UI;
- stronger crash/session recovery;
- Electron fuse configuration;
- accessibility and usability review;
- educator validation of assessment/mastery rules;
- written parent consent, safeguarding and incident protocol;
- retention configuration and complete data inventory.

**Exit criteria:**

- families can understand and control stored data;
- restore and deletion claims are demonstrable;
- educator/safeguarding review approves supervised use;
- founder-device defects are closed.

## Stage 4 — Supervised family alpha

**Target: a small founder-supervised cohort using synthetic setup first, followed by explicit parent consent.**

- 5–10 parent/child participants;
- supervised sessions only;
- no raw camera/audio retention;
- expanded foundational maths;
- phonics/early-reading vertical slice;
- parent session feedback;
- latency/API-cost measurement;
- contradiction, confidence and expiry rules;
- personal engagement baselines based on repeated sessions;
- accessibility fixes.

**Exit criteria:**

- parents operate the product without developer intervention;
- records remain accurate across repeated sessions;
- no important decision relies on one behavioural cue;
- parents understand local data and provider data clearly.

## Stage 5 — Private beta

- real-time voice provider or equivalent turn-taking;
- curriculum prerequisite graph and spaced review;
- richer mastery model validated with educators;
- writing support with explicit parent consent;
- parent dashboard for goals, retention and correction;
- tablet-friendly interface;
- code signing/notarisation and secure updates;
- independent penetration/security review;
- child-safety, safeguarding and privacy/legal approval;
- model red-team and measured learning/usability outcomes.

## Stage 6 — Portable multi-device product

- Android/tablet implementation of the versioned memory format;
- tested cross-platform migrations;
- family-controlled encrypted backup options;
- provider selection and supported local models;
- multilingual curriculum and speech;
- deterministic offline lesson paths;
- documented interoperability and memory-governance standard.

## Explicit non-goals for the first prototype

- unrestricted general chatbot;
- medical, emotional or developmental diagnosis;
- face recognition;
- cloud-hosted permanent learner database;
- school administration platform;
- competitive leaderboards or manipulative engagement;
- full curriculum before the learner-memory loop is validated.
