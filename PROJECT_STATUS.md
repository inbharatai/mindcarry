# MindCarry project status

## Product stage

**Pre-MVP.**

The product specification, tutoring flow, Learner Memory schema, portability design, concept walkthrough and desktop implementation code exist. The repository is not yet evidence that a functioning child-facing application has completed an end-to-end run on the founder’s Windows computer.

## Implemented in the repository

### Desktop foundation

- Electron main process
- React + TypeScript renderer
- Vite development and production builds
- restricted context-isolated preload bridge
- renderer sandboxing and disabled Node integration
- blocked arbitrary navigation and new windows
- explicit IPC sender validation
- explicit media permission policy

### Automatic local storage

- operating-system app-data vault creation
- automatic `MindCarryVault` folder structure
- automatic UUID folder per learner
- automatic backups, session-cache and reserved media directories
- encrypted device learner catalogue
- plaintext technical manifests without child name or age
- vault path and open-folder action in Settings

### Learner-memory security

- AES-256-GCM authenticated encryption
- asynchronous scrypt parent-key derivation
- random salt and IV
- learner UUID associated data
- parent passphrase not persisted
- versioned encryption envelope
- legacy envelope decryption support
- atomic encrypted database replacement
- rotating encrypted backups
- SQLite integrity verification
- schema versioning and additive migration

### Tutoring vertical slice

- three-stage addition-within-20 lesson
- typed answer input
- browser/OS speech recognition when available
- spoken English number parsing through twenty
- simple misconception classification
- interest-based teaching intervention
- independent transfer requirement
- mastery cap when evidence is insufficient
- structured session and learner-memory persistence
- deterministic demo provider
- optional Gemini explanation provider
- deterministic fallback after Gemini failure

### Gemini boundary

- stable configured model string
- API key tested before storage
- Electron `safeStorage` protection
- API key excluded from learner folders and exports
- request timeout
- bounded transient retry
- short child-safe system instruction
- minimal current-task context

### Camera experiment

- off by default
- consent-bound permission
- local frame-to-frame movement calculation
- smoothed numeric movement cue
- camera stream cleanup on lesson exit/unmount
- no face recognition
- no emotion or condition diagnosis
- no raw video persistence

### Portability

- versioned `.childmind` package
- encrypted database remains encrypted during export
- non-personal package manifest
- file-size, format, UUID and checksum validation
- API key and device catalogue excluded
- import into a clean installation
- identity verified only after parent-passphrase unlock

### Automation

- one-command Windows Desktop installation script
- automatic Git and Node.js installation through `winget` when missing
- local dependency installation
- complete verification before launch
- GitHub Actions on Windows and Linux
- separated lint, smoke, test and build stages

## Automated test coverage

- encryption round trip
- wrong-passphrase rejection
- associated-data mismatch
- tampered ciphertext rejection
- encrypted device catalogue
- automatic vault creation
- automatic learner subfolder creation
- atomic external write
- answer and number-word parsing
- misconception classification
- personalised intervention selection
- independent-transfer completion rule
- mastery status boundaries
- encrypted close/reopen persistence
- absence of child PII from plaintext manifest
- `.childmind` export/import between two simulated installations
- TypeScript production renderer build

## Required before describing MindCarry as a functioning prototype

- install from a clean Windows environment
- confirm Desktop source-folder automation
- launch Electron successfully
- confirm automatic runtime vault path
- create and unlock a learner
- inspect files for plaintext leakage
- complete the demo lesson
- close and reopen the app
- validate a real Gemini test key
- test Gemini timeout/fallback
- test microphone allow/deny paths
- test camera allow/deny paths
- confirm camera stops on cancellation and lock
- export a `.childmind` package
- import and unlock it in a second clean installation
- confirm the second installation does not inherit the Gemini key
- build the Windows installer and portable package

## Required before supervised family testing

- fix all defects from the founder-device test
- parent memory correction and deletion
- full learner deletion
- passphrase change
- backup verification and restore UI
- crash/session recovery
- dependency lockfile and vulnerability monitoring
- signed synthetic demo evidence
- written parent test consent and safeguarding protocol

## Required before public child use

- independent security assessment
- child-safety and safeguarding review
- curriculum and assessment validation
- privacy/legal review for launch jurisdictions
- code-signed releases
- secure update mechanism
- incident response process
- model red-team testing
- accessibility testing
- retention and deletion policy

## Verification command

```bash
npm install --no-audit --no-fund
npm run check
```

`npm run check` must pass linting, the dependency-free smoke test, unit/integration tests and the production renderer build.
