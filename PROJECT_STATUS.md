# MindCarry project status

## Product stage

**Pre-MVP repository implementation.**

MindCarry now has an implemented desktop vertical slice for tutoring, encrypted Learner Memory, Memory Inbox, deterministic local graph, ranked provider context and `.childmind` portability. This is not evidence that the application has completed target-device, supervised-family, safeguarding, curriculum, independent-security or legal validation.

## Implemented in the repository

### Desktop and trust boundary

- Electron main process and React + TypeScript renderer;
- renderer sandbox, context isolation and disabled Node integration;
- production DevTools disabled;
- arbitrary navigation and new windows denied;
- exact renderer origin/file validation for IPC;
- restrictive renderer Content Security Policy with no external network access;
- narrow preload API;
- default-deny media permission policy;
- startup failure handling.

### Automatic local storage

- automatic operating-system app-data vault;
- UUID folder per learner;
- encrypted learner database;
- encrypted device learner catalogue;
- non-personal plaintext technical manifests;
- rotating encrypted backups;
- export, recovery, temporary and reserved media directories;
- vault path and open-folder action in Settings.

### Cryptography and validation

- AES-256-GCM authenticated encryption;
- asynchronous scrypt parent-key derivation;
- random salt and IV;
- learner UUID as authenticated associated data;
- strict canonical-base64 and versioned-envelope parsing;
- bounded encrypted payload sizes;
- atomic writes and checksum verification;
- exactly one matching learner profile required after decryption;
- consent record and SQLite integrity required;
- parent passphrase not persisted.

### Device credential protection

- Gemini key tested before storage;
- device catalogue key and Gemini key protected through Electron `safeStorage`;
- Linux `basic_text` and unknown storage backends rejected;
- API key excluded from learner folders, logs and `.childmind` exports;
- secure-storage backend shown in Settings.

### Tutoring vertical slice

- three distinct addition-within-20 questions;
- concrete, pictorial and independent transfer stages;
- typed answer input;
- supported browser/OS speech recognition;
- locale-aware speech output and recognition codes;
- robust final-number parsing from natural spoken answers;
- bounded response time and reasoning fields;
- misconception classification;
- interest-based teaching intervention;
- independent transfer requirement;
- mastery cap when evidence is insufficient;
- duplicate lesson-start cancellation;
- double-answer/concurrent-submit protection;
- deterministic demo provider and Gemini fallback.

### Memory Inbox and local graph

- active and archived memories;
- confidence, evidence count, source lesson and confirmation date;
- archive and restore controls;
- archived memories remain archived when reinforced;
- `memory_events` lifecycle ledger;
- deterministic graph nodes and edges;
- explained `EXTRACTED`, `DERIVED` and reserved `PARENT` provenance;
- transactional memory-event and graph updates;
- graph rebuild after creation, unlock and completed lesson.

### Ranked provider-independent context

- objective and skill overlap ranking;
- memory-type, evidence, confidence, recency and review weighting;
- maximum eight memories and twelve graph facts;
- maximum 1,800-character provider context;
- separate parent-visible and provider-safe context;
- child name omitted from Gemini requests;
- complete learner database and graph never sent;
- Gemini output cannot write directly to the learner database.

### Camera experiment

- off by default;
- consent-bound access during active lessons only;
- local frame-to-frame movement calculation;
- stream cleanup after cancellation, unmount and startup errors;
- no face recognition;
- no emotion, health or developmental diagnosis;
- raw audio and raw video storage forced off.

### Portability

- versioned `.childmind` package;
- encrypted database remains encrypted during export;
- non-personal technical manifest;
- strict size, package, schema, UUID, base64 and checksum validation;
- receiving installation initially shows **Imported learner**;
- learner identity resolved only after passphrase unlock;
- Memory Inbox, graph and audit history travel inside the encrypted database;
- Gemini and device keys do not travel.

### Automation and supply chain

- `main` is the only maintained branch;
- Windows installer clones only `main`;
- installer refuses a wrong repository or uncommitted local changes;
- Node.js 22.12 minimum check;
- committed `package-lock.json`;
- deterministic `npm ci` setup;
- exact dependency versions;
- Windows and Ubuntu CI;
- production dependency audit at high severity;
- security smoke, unit/integration, type/build and Windows package-layout checks;
- CodeQL security-and-quality analysis.

## Automated coverage

The repository tests cover:

- encryption round trip;
- wrong-passphrase and associated-data rejection;
- tampered and malformed envelopes;
- canonical-base64 validation;
- encrypted catalogue validation and failure without secure storage;
- exact renderer trust rules;
- Linux insecure credential-backend rejection;
- automatic vault and learner folders;
- robust answer parsing and distinct lesson questions;
- misconception, transfer and mastery rules;
- invalid/closed session rejection;
- encrypted close/reopen persistence;
- absence of child PII from plaintext manifests;
- Memory Inbox creation, archive, reinforcement and restore;
- relevant context and de-identified provider context;
- graph node/edge creation and persistence;
- malformed `.childmind` rejection;
- two-installation export/import restoration;
- Gemini request minimisation and zero thinking budget;
- TypeScript/Vite build and Windows package layout.

## Required before describing MindCarry as a functioning prototype

- clean installation on the founder’s Windows computer;
- successful Electron launch and visual review of every screen;
- automatic vault and secure-storage backend confirmation;
- learner creation, unlock and plaintext-leakage inspection;
- complete deterministic lesson;
- Memory Inbox, graph, archive and restore UI test;
- close/reopen persistence;
- real Gemini test-key success;
- Gemini timeout, revocation, rate-limit and network-failure fallback;
- microphone allow/deny and language tests;
- camera allow/deny, startup failure and cleanup tests;
- `.childmind` export/import between two actual clean installations;
- confirmation that API/device keys do not transfer;
- Windows installer and portable executable launch test.

## Required before supervised family testing

- fix every founder-device defect;
- parent correction and permanent memory deletion;
- complete learner deletion;
- passphrase change/recovery decision;
- verified backup/restore UI;
- stronger crash/session recovery;
- Electron fuse configuration;
- accessibility and usability testing;
- written parent consent and safeguarding protocol;
- educator review of curriculum and assessment logic.

## Required before public child use

- independent penetration and application-security assessment;
- model red-team testing;
- child-safety and safeguarding review;
- jurisdiction-specific privacy/legal review;
- code signing/notarisation;
- secure update channel;
- incident-response process;
- retention/deletion policy;
- graph-ontology and memory-quality governance;
- measured educational outcomes.

## Verification commands

```bash
npm ci --no-audit --no-fund
npm run check
```

GitHub Actions additionally runs a production dependency audit and verifies the Windows Electron package layout.