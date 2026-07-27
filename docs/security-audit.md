# Security and readiness audit

This document records the repository-level review performed before the first target-device test. It is not an independent certification or legal opinion.

## Audit scope

Reviewed areas:

- Electron window and renderer isolation;
- preload bridge and IPC validation;
- local folder lifecycle;
- learner-database encryption;
- device catalogue protection;
- Gemini API-key handling;
- lesson-state persistence;
- `.childmind` export/import;
- camera and microphone permissions;
- automated setup;
- test and CI coverage;
- documentation accuracy.

## High-priority issues corrected

### Plaintext learner identity in manifests

**Previous risk:** the learner manifest included preferred name, age and language outside the encrypted database.

**Correction:** learner folders now use UUIDs, plaintext manifests contain only technical metadata, and the home-screen learner list is stored in an encrypted device catalogue.

### Parent-managed folder expectation

**Previous risk:** documentation could imply that a parent had to create or move a folder manually for normal use.

**Correction:** `VaultManager` automatically creates the app vault and every per-learner directory. Parents interact only through the application and encrypted export flow.

### Incomplete media permission enforcement

**Previous risk:** a broad media permission handler could approve camera or microphone access without checking the selected learner’s consent.

**Correction:** the main process now denies permissions by default and enables audio/video only for an active lesson whose learner consent permits it.

### Invalid or unstable model default

**Previous risk:** model configuration was hard-coded to a model string without a verified compatibility boundary.

**Correction:** the provider defaults to stable `gemini-2.5-flash`, centralises the model name, applies a request timeout, retries only transient failures and falls back to deterministic demo teaching.

### API key stored before validation

**Previous risk:** an invalid API key could be stored and leave the application in a broken provider state.

**Correction:** MindCarry tests the key first, enables Gemini only after success and stores it through Electron `safeStorage` outside the learner vault.

### Weak lesson completion condition

**Previous risk:** the prototype could complete after a small number of correct answers without a clear transfer requirement.

**Correction:** the lesson now requires three stages and an independent transfer answer. Mastery is capped below 80 when independent evidence is insufficient.

### Unversioned data evolution

**Previous risk:** schema changes could break previously created learner databases.

**Correction:** the database includes schema metadata and additive migration logic. Decrypted databases also undergo SQLite integrity and learner-identity checks.

### Export/import boundary

**Previous risk:** package validation and metadata minimisation were incomplete.

**Correction:** import now validates size, format version, UUID and checksum. Export metadata excludes child name, age and API credentials.

### Non-atomic database replacement

**Previous risk:** a process or power interruption during save could damage the only encrypted database file.

**Correction:** encrypted saves use a destination-local temporary file, flush and atomic rename, with rotating encrypted backups.

## Controls currently implemented

### Electron

- Node.js integration disabled in the renderer;
- context isolation enabled;
- renderer sandbox enabled;
- web security enabled;
- navigation restricted;
- new windows denied;
- restrictive Content Security Policy;
- explicit permission handlers;
- narrow `contextBridge` API;
- IPC sender URL checked in the main process;
- no general-purpose filesystem or shell API exposed to the renderer.

### Cryptography and storage

- AES-256-GCM authenticated encryption;
- asynchronous scrypt key derivation;
- random salt and IV;
- associated data binds an encrypted database to its learner UUID;
- timing-safe checksum comparison;
- encrypted learner catalogue;
- OS-protected device key;
- no plaintext learner PII in technical manifests;
- API key excluded from learner exports;
- import size and checksum validation;
- atomic writes and backup rotation.

### AI provider

- provider can be disabled completely through demo mode;
- API key is tested before storage;
- short request timeout;
- bounded transient retry;
- deterministic fallback when Gemini fails;
- minimal lesson context;
- child-safe system instruction;
- model does not write directly to the learner database.

### Child-data boundary

- camera off by default;
- raw audio/video storage forced off in the alpha;
- no face recognition;
- no identity or demographic inference;
- no emotion or condition diagnosis;
- movement stored only when camera and local-analysis consent are both enabled;
- behavioural cue text explicitly states that it is not a diagnosis.

## Automated verification

The CI pipeline runs on Windows and Linux and separates:

1. dependency installation;
2. security-sensitive linting;
3. dependency-free smoke test;
4. unit and integration tests;
5. TypeScript checking and renderer build.

Coverage includes:

- encryption round trip;
- wrong key and associated-data rejection;
- ciphertext tampering;
- encrypted device catalogue;
- automatic vault creation;
- per-learner folder creation;
- atomic external writes;
- answer parsing and misconception detection;
- transfer-based mastery;
- encrypted persistence after close/reopen;
- PII absence from plaintext manifest;
- export/import between two simulated installations.

## Known risks and remaining work

### Target-device execution

The app must still be installed and launched on the target Windows computer. CI does not prove webcam, microphone, OS credential-store prompts, display rendering or Gemini connectivity on that device.

### Passphrase recovery

There is no passphrase recovery. A forgotten passphrase makes the portable learner database inaccessible. A future recovery design must not introduce a hidden vendor master key.

### In-memory secrets

The parent passphrase remains in the Electron main-process JavaScript heap while a learner is unlocked. JavaScript does not guarantee deterministic memory wiping. The application limits renderer access, but a production security review must consider stronger key/session handling.

### SQL.js architecture

The prototype encrypts exported SQLite bytes rather than using SQLCipher. This protects data at rest, but the decrypted database exists in process memory while unlocked. Production architecture should be reviewed against the target threat model and device constraints.

### OS credential semantics

Electron `safeStorage` security differs by operating system. Windows uses the signed-in user’s DPAPI context. Linux systems without a secure secret store may fall back to a weaker backend; production Linux support must explicitly reject insecure fallback storage.

### Dependency assurance

The repository pins exact dependency versions, but a committed lockfile and continuous vulnerability monitoring are still required before releases.

### Signed distribution and updates

Installers are not code-signed, notarised or connected to a secure update channel. Production releases require signed artefacts, protected release keys and update verification.

### Parent data controls

Memory inspection exists in the dashboard, but correction, selective deletion, retention rules, passphrase change, full learner deletion and export verification UI remain incomplete.

### Safeguarding and legal review

Child-safety, safeguarding, privacy, age-assurance, consent and launch-jurisdiction legal review remain mandatory before use beyond controlled founder-led testing.

## Merge gate for this audit

This branch should merge only when:

- Windows CI passes;
- Linux CI passes;
- lint passes;
- smoke test passes;
- unit and integration tests pass;
- TypeScript and production renderer build pass;
- documentation describes MindCarry as pre-MVP;
- no Gemini key or learner export is committed.

## First-device test gate

The codebase should be described as a functioning prototype only after all of the following are demonstrated on the founder’s Windows machine:

- automatic Desktop source-folder setup;
- automatic runtime vault creation;
- learner creation and unlock;
- encrypted database present and unreadable as plaintext;
- demo lesson completion;
- app close/reopen persistence;
- successful Gemini key validation;
- safe fallback after network/API failure;
- microphone consent and denial paths;
- camera consent and denial paths;
- `.childmind` export;
- import and unlock on a second installation;
- no API key in the exported package.
