# Security and readiness audit

This document records the repository-level A-to-Z review completed before the founder-device acceptance test. It is not an independent certification, penetration test, safeguarding approval or legal opinion.

## Scope reviewed

- Electron window, navigation, renderer and IPC boundaries;
- preload capability surface;
- secure-storage backend handling;
- settings and API-key lifecycle;
- vault, catalogue and per-learner folder lifecycle;
- encryption envelopes, key derivation and atomic persistence;
- database schema, integrity and session ownership;
- lesson state, concurrency, answer parsing and mastery;
- Memory Inbox, graph, ranking and provider context;
- camera, microphone and speech cleanup;
- `.childmind` export/import validation;
- Windows installation and dependency reproducibility;
- CI, CodeQL, tests and documentation accuracy.

## High-priority findings corrected

### Over-broad renderer trust

**Previous risk:** any `file://` sender could satisfy the IPC trust check.

**Correction:** development IPC requires the exact configured origin, and packaged IPC requires the exact built `index.html` file. Production DevTools are disabled, arbitrary navigation/new windows remain denied, and renderer CSP no longer permits direct Gemini network access.

### Insecure Linux credential fallback

**Previous risk:** `safeStorage.isEncryptionAvailable()` alone can be true while Electron uses Linux `basic_text`.

**Correction:** MindCarry reads the selected backend and rejects `basic_text`, `unknown` and unavailable storage. Learner creation and API-key storage fail closed when the backend is not adequately protected.

### Duplicate lessons and answer races

**Previous risk:** repeated renderer effects or double submission could create overlapping active lessons or record the same answer twice.

**Correction:** React development double-effects were removed, renderer startup has cancellation cleanup, a new lesson cancels the prior active lesson, learner lock cancels open lessons, and each lesson has a main-process answer lock.

### Child identity in provider requests

**Previous risk:** Gemini prompts included the learner’s preferred name through system instructions or graph context.

**Correction:** the provider instruction uses only age, not name. A separate provider-safe context replaces learner-node labels with `Learner`; the complete database and graph are never sent.

### Unranked context

**Previous risk:** recent memories were selected without true objective relevance, and graph facts were not included in the provider text.

**Correction:** active memories and graph facts are ranked using objective/skill overlap, type, evidence, confidence, recency and review state, then capped to eight memories, twelve facts and 1,800 characters.

### Archived memory reactivation

**Previous risk:** repeated evidence for an archived item could accidentally make it eligible again.

**Correction:** reinforcement updates confidence/evidence while preserving the archived state. Only an explicit parent restore makes it active.

### Weak package and envelope parsing

**Previous risk:** permissive base64/JSON parsing and incomplete schema checks increased malformed-input risk.

**Correction:** encryption and `.childmind` parsing now require canonical base64, supported versions/KDF settings, bounded payloads, valid UUIDs, supported schema, checksum match and a fixed application-controlled destination.

### Incomplete transaction boundaries

**Previous risk:** session completion, memory updates or graph events could partially apply in memory.

**Correction:** SQL mutations use explicit transactions; session ownership and active status are checked; expected row changes are enforced; graph/event changes are transactional before encrypted persistence.

### Camera stream cleanup

**Previous risk:** a stream acquired before `video.play()` failure could remain active.

**Correction:** acquired tracks are stopped after startup errors, cancellation and unmount, and the preview source is cleared.

### Non-deterministic dependencies

**Previous risk:** exact direct versions existed without a committed dependency graph.

**Correction:** `package-lock.json` is committed, local/CI setup uses `npm ci`, CI performs a production high-severity audit, and CodeQL runs security-and-quality queries.

## Controls currently implemented

### Electron and renderer

- renderer sandbox and context isolation;
- Node integration disabled;
- production DevTools disabled;
- exact IPC sender validation;
- restrictive CSP with renderer external network blocked;
- no arbitrary IPC, filesystem or shell bridge;
- input validation repeated in the main process;
- default-deny media policy.

### Cryptography and local storage

- AES-256-GCM;
- asynchronous scrypt with fixed supported parameters;
- random salt/IV and authenticated learner UUID;
- strict, versioned and bounded envelopes;
- encrypted device catalogue;
- OS-protected device/API keys with insecure Linux fallback rejected;
- no child PII in plaintext learner manifests;
- atomic replacement and rotating encrypted backups;
- SQLite integrity, identity and consent checks;
- sensitive buffers cleared where JavaScript permits.

### Tutoring and memory integrity

- deterministic correctness and lesson state;
- three distinct question answers;
- independent transfer required;
- response/reasoning bounds;
- active-session ownership checks;
- duplicate-answer lock;
- parent archive state preserved;
- memory lifecycle audit events;
- deterministic/rebuildable graph;
- model cannot write directly to canonical memory.

### Provider boundary

- Gemini key tested before activation;
- API key outside learner vault/export;
- 20-second timeout and bounded transient retry;
- deterministic fallback;
- zero model-thinking budget for short tutoring wording;
- de-identified bounded context;
- prompt prohibits diagnosis and internal-system disclosure.

### Child-data boundary

- camera off by default;
- raw audio/video storage forced off;
- camera frames processed locally;
- no face recognition, identity inference or emotion diagnosis;
- movement cue stored only with both consent flags;
- microphone has typed fallback and learner-language mapping.

## Automated verification

The final pipeline is configured to run on Windows and Ubuntu using the committed lockfile:

1. `npm ci`;
2. production dependency audit on Linux;
3. privileged-code lint;
4. dependency-free security smoke;
5. unit/integration tests;
6. TypeScript and production renderer build;
7. Windows Electron package-layout build.

CodeQL runs separately.

Tests cover malformed encryption, secure-storage fallback, renderer trust, catalogue validation, lesson parsing/concurrency support, Memory Inbox lifecycle, graph ranking/context minimisation, persistence and two-installation transfer.

## Residual risks

- no target Windows launch evidence yet;
- no independent penetration test;
- no passphrase recovery/change;
- decrypted DB and passphrase remain in the main-process heap while unlocked;
- SQL.js uses encrypted exported bytes rather than SQLCipher;
- no parent correction/permanent deletion/full learner deletion;
- no verified restore UI or complete crash recovery;
- no Electron fuse hardening yet;
- unsigned, non-notarised builds and no secure updater;
- no completed curriculum, accessibility, safeguarding or legal review;
- no real-child validation.

## Founder-device release gate

Do not describe MindCarry as a functioning prototype until the target Windows test demonstrates:

- clean main-only installation;
- app launch and every screen rendered correctly;
- DPAPI-backed secure storage;
- automatic vault and encrypted learner creation;
- deterministic lesson and Memory Inbox/graph updates;
- archive/restore context behaviour;
- restart persistence;
- real Gemini success and safe failure paths;
- microphone/camera allow, deny and cleanup paths;
- `.childmind` transfer across two clean installations;
- no API key transfer or plaintext learner leakage.
