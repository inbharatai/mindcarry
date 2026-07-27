# Roadmap

The roadmap is organised by evidence gates rather than feature count. A stage is complete only when its acceptance tests pass.

## Stage 0 — Specification and architecture

Status: substantially complete.

- product specification;
- first tutoring flow;
- Learner Memory schema;
- portable `.childmind` design;
- privacy and trust boundaries;
- concept walkthrough;
- first acceptance-test scenario.

## Stage 1 — Implementation-ready pre-MVP

Status: repository implementation created; CI and target-device verification are the gate.

- Electron + React + TypeScript desktop shell;
- automatic local vault;
- automatic per-learner folders;
- encrypted learner database;
- encrypted device catalogue;
- parent-passphrase flow;
- deterministic addition-within-20 lesson;
- typed and browser/OS speech input;
- optional local movement cue;
- Gemini provider adapter and deterministic fallback;
- `.childmind` export/import;
- Windows installation automation;
- Windows/Linux CI;
- unit and integration tests.

Exit criteria:

- CI green on Windows and Linux;
- target Windows application launches;
- vault is created automatically;
- first lesson persists after restart;
- Gemini key success and failure paths pass;
- export/import works across two installations.

## Stage 2 — Functioning founder-tested prototype

- fix all defects found in the first-device acceptance test;
- package Windows portable and installer builds;
- verify microphone consent paths;
- verify optional camera consent paths;
- add parent-visible complete data inventory;
- add learner deletion;
- add individual memory deletion and correction;
- add passphrase change;
- add verified backup/restore flow;
- add explicit session crash recovery;
- commit dependency lockfile and add vulnerability scanning;
- configure Electron fuses;
- create signed synthetic demo evidence.

Exit criteria:

- repeated clean installs work;
- no known critical/high security defect;
- one complete demo can be reproduced without developer intervention;
- all claims in README match demonstrated behaviour.

## Stage 3 — Supervised family alpha

Target: 5–10 children and parents already accessible to the founder.

- informed parent consent and test protocol;
- supervised sessions only;
- no raw camera/audio retention;
- foundational maths curriculum expansion;
- phonics and early reading vertical slice;
- session-level parent feedback;
- usability and accessibility testing;
- latency and API-cost measurement;
- error and safeguarding incident process;
- personal engagement baseline based on repeated sessions;
- memory confidence, contradiction and expiry rules.

Exit criteria:

- families can operate the product without developer support;
- learning records remain accurate after repeated sessions;
- no important decision relies on one behavioural cue;
- parents understand what is local and what is sent to Gemini.

## Stage 4 — Private beta

- Gemini Live or another real-time voice provider;
- interruption and turn-taking;
- stronger curriculum graph and prerequisite checks;
- spaced review;
- richer mastery model validated with educators;
- writing support with explicit parent consent;
- parent dashboard for goals, memories and retention;
- tablet-friendly interface;
- secure application update channel;
- code signing and notarisation;
- independent security review;
- child-safety and safeguarding review;
- launch-jurisdiction privacy/legal review.

Exit criteria:

- signed builds;
- independent high-severity findings resolved;
- safeguarding and privacy launch gates approved;
- measured educational and usability outcomes.

## Stage 5 — Portable multi-device product

- Android/tablet client using the versioned `.childmind` specification;
- tested cross-platform schema migrations;
- family-controlled encrypted backup options;
- model-provider selection;
- local-model provider where hardware permits;
- multilingual curriculum and speech support;
- offline deterministic lessons when AI provider is unavailable.

## Later research

- consented handwriting analysis;
- pronunciation models;
- multimodal engagement patterns based on personal baselines;
- school distribution without surrendering family ownership;
- privacy-preserving aggregate curriculum improvement;
- portable learner memory standards and interoperability.

## Explicit non-goals for the first prototype

- unrestricted general chatbot;
- medical or developmental diagnosis;
- face recognition;
- cloud-hosted permanent learner database;
- school administration platform;
- competitive leaderboards or manipulative engagement loops;
- full curriculum before the learner-memory loop is proven.
