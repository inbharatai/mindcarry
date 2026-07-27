# MindCarry project status

## Product stage

**Pre-MVP.**

The product specification, tutoring flow, encrypted Learner Memory, parent-facing Memory Inbox, local graph design, portability flow and desktop implementation code exist. The repository is not evidence that a child-facing application has completed the full acceptance test on the founder’s Windows computer or with real children and parents.

## Implemented in the repository

### Desktop foundation

- Electron main process;
- React + TypeScript renderer;
- Vite development and production builds;
- restricted context-isolated preload bridge;
- renderer sandboxing and disabled Node integration;
- blocked arbitrary navigation and new windows;
- explicit IPC sender validation;
- explicit media permission policy.

### Automatic local storage

- operating-system app-data vault creation;
- automatic `MindCarryVault` structure;
- automatic UUID folder per learner;
- automatic backups, session-cache and reserved media directories;
- encrypted device learner catalogue;
- plaintext technical manifests without child name or age;
- vault path and open-folder action in Settings.

### Learner-memory security

- AES-256-GCM authenticated encryption;
- asynchronous scrypt parent-key derivation;
- random salt and IV;
- learner UUID as authenticated associated data;
- parent passphrase not persisted;
- versioned encryption envelope;
- legacy envelope decryption support;
- atomic encrypted database replacement;
- rotating encrypted backups;
- SQLite integrity verification;
- schema versioning and additive migration.

### Memory Inbox and local graph

- parent-facing Memory Inbox inside the desktop application;
- active and archived memory states;
- confidence, evidence count, source lesson and confirmation date;
- parent archive and restore controls;
- `memory_events` audit ledger;
- embedded `memory_graph_nodes` and `memory_graph_edges` tables;
- deterministic node and edge identifiers;
- explained edge provenance: `EXTRACTED`, `DERIVED` and reserved `PARENT`;
- learner, skill, interest, memory and session nodes;
- bounded provider-independent Learner Context Packet;
- graph rebuild after creation, unlock and completed lesson;
- graph and inbox stored inside the encrypted learner database;
- graph and inbox transported inside the existing encrypted `.childmind` package;
- no cloud graph database or vector store.

### Tutoring vertical slice

- three-stage addition-within-20 lesson;
- typed answer input;
- browser/OS speech recognition when available;
- spoken English number parsing through twenty;
- simple misconception classification;
- interest-based teaching intervention;
- independent transfer requirement;
- mastery cap when evidence is insufficient;
- structured session and learner-memory persistence;
- deterministic demo provider;
- optional Gemini explanation provider;
- deterministic fallback after Gemini failure;
- relevant local memory loaded before the lesson begins.

### Gemini boundary

- stable configured model string;
- API key tested before storage;
- Electron `safeStorage` protection;
- API key excluded from learner folders and exports;
- request timeout;
- bounded transient retry;
- short child-safe system instruction;
- selected, bounded current-task and learner-memory context;
- memory treated as fallible evidence rather than diagnosis or permanent label;
- complete learner database and graph never sent as prompt content.

### Camera experiment

- off by default;
- consent-bound permission;
- local frame-to-frame movement calculation;
- smoothed numeric movement cue;
- camera stream cleanup on lesson exit/unmount;
- no face recognition;
- no emotion or condition diagnosis;
- no raw video persistence.

### Portability

- versioned `.childmind` package;
- encrypted database remains encrypted during export;
- non-personal package manifest;
- file-size, format, UUID and checksum validation;
- API key and device catalogue excluded;
- import into a clean installation;
- identity verified only after parent-passphrase unlock;
- Memory Inbox, event history and local graph retained because they live inside the encrypted database;
- deterministic graph rebuilt after import and unlock.

### Automation

- one-command Windows Desktop installation script;
- automatic Git and Node.js installation through `winget` when missing;
- local dependency installation;
- complete verification before launch;
- GitHub Actions on Windows and Linux;
- separated lint, smoke, test, build and Windows package-layout stages;
- CodeQL JavaScript/TypeScript analysis.

## Automated test coverage

- encryption round trip;
- wrong-passphrase rejection;
- associated-data mismatch;
- tampered ciphertext rejection;
- encrypted device catalogue;
- automatic vault creation;
- automatic learner subfolder creation;
- atomic external write;
- answer and number-word parsing;
- misconception classification;
- personalised intervention selection;
- independent-transfer completion rule;
- mastery status boundaries;
- encrypted close/reopen persistence;
- absence of child PII from plaintext manifest;
- Memory Inbox generation;
- learner, interest and memory graph nodes;
- explained graph edge relations;
- archive removes an item from future context;
- restore returns it to future context;
- bounded context packet generation;
- `.childmind` export/import between two simulated installations;
- inbox, graph and context restoration after import;
- TypeScript production renderer build;
- Windows package-layout verification in CI.

## Required before describing MindCarry as a functioning prototype

- install from a clean Windows environment;
- confirm Desktop source-folder automation;
- launch Electron successfully;
- confirm automatic runtime vault path;
- create and unlock a learner;
- inspect files for plaintext leakage;
- complete the demo lesson;
- inspect Memory Inbox and graph in the real UI;
- archive and restore one memory;
- confirm the next lesson’s context changes accordingly;
- close and reopen the app;
- validate a real Gemini test key;
- inspect that the Gemini request contains only bounded selected context;
- test Gemini timeout and deterministic fallback;
- test microphone allow/deny paths;
- test camera allow/deny paths;
- confirm camera stops on cancellation and lock;
- export a `.childmind` package;
- import and unlock it in a second clean installation;
- confirm inbox, graph and context return;
- confirm the second installation does not inherit the Gemini key;
- build and launch the Windows installer and portable package.

## Required before supervised family testing

- fix all defects from the founder-device test;
- parent editing or correction of a memory;
- permanent individual-memory deletion and secure-erasure design;
- full learner deletion;
- passphrase change and recovery design;
- backup verification and parent-facing restore UI;
- crash/session recovery;
- dependency lockfile and vulnerability monitoring;
- signed synthetic demo evidence;
- written parent test consent and safeguarding protocol.

## Required before public child use

- independent security assessment;
- child-safety and safeguarding review;
- curriculum and assessment validation;
- privacy/legal review for launch jurisdictions;
- code-signed releases;
- secure update mechanism;
- incident response process;
- model red-team testing;
- accessibility testing;
- retention and deletion policy;
- documented graph-ontology and memory-quality governance.

## Verification command

```bash
npm install --no-audit --no-fund
npm run check
```

`npm run check` must pass linting, the dependency-free smoke test, unit/integration tests and the production renderer build. A successful CI run also verifies the Windows Electron package layout.