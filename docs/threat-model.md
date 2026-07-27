# Threat model

This threat model covers the pre-MVP desktop architecture. It does not claim that MindCarry is ready for production child use.

## Assets

- child profile and learning history;
- parent passphrase;
- Gemini API key;
- encrypted learner database;
- encrypted device learner catalogue;
- `.childmind` exports;
- camera and microphone permissions;
- lesson integrity and mastery records;
- application update and release integrity.

## Trust assumptions

- the parent controls the signed-in operating-system account;
- the operating system and device are not already fully compromised;
- the repository dependencies installed by npm are authentic;
- Gemini API transport and account controls operate as documented by the provider;
- the parent does not share the learner passphrase with untrusted people.

MindCarry does not defend against an attacker with complete administrator control, memory inspection capability or malware already running as the same user.

## Threats and controls

### Stolen laptop or disk

**Risk:** an attacker reads the learner database from disk.

**Controls:**

- learner database encrypted with AES-256-GCM;
- key derived from parent passphrase with scrypt;
- learner name stored in encrypted device catalogue;
- API key protected through operating-system credential storage;
- no plaintext database file persisted by the application.

**Residual risk:** weak parent passphrases remain vulnerable to offline guessing. The current prototype requires 12 characters but does not yet provide a strength meter or recovery plan.

### Stolen `.childmind` export

**Risk:** portable learner package is copied from email, USB storage or cloud drive.

**Controls:**

- database remains passphrase encrypted;
- package metadata excludes name, age and API key;
- learner UUID is not treated as an authentication secret.

**Residual risk:** filename or surrounding storage location may reveal information chosen by the parent. The default filename uses a short UUID rather than the child’s name.

### Wrong passphrase or corrupted database

**Risk:** invalid input returns partial data or causes unsafe state.

**Controls:**

- authenticated decryption fails before database creation;
- learner UUID is associated data;
- SQLite integrity check after decryption;
- database learner identity must match the folder UUID;
- errors do not return decrypted content.

### Malicious `.childmind` file

**Risk:** imported content triggers path traversal, oversized allocation or database confusion.

**Controls:**

- file-size limit;
- strict package format/version check;
- UUID validation;
- fixed application-controlled destination path;
- SHA-256 checksum validation;
- no archive extraction;
- existing learner directories cannot be overwritten;
- decrypted database identity checked at unlock.

**Residual risk:** encrypted content is not structurally inspectable until the parent supplies a valid passphrase. Fuzzing and deeper malformed-SQLite testing remain necessary.

### Renderer compromise or XSS

**Risk:** malicious renderer code accesses files, keys or Electron APIs.

**Controls:**

- Node integration disabled;
- context isolation enabled;
- renderer sandbox enabled;
- restrictive CSP;
- arbitrary navigation and new windows denied;
- narrow preload methods;
- main-process IPC sender validation;
- all privileged arguments validated again in the main process;
- no arbitrary filesystem function exposed.

**Residual risk:** a main-process or Electron vulnerability could bypass these controls. Electron and dependencies must be kept current.

### API-key theft

**Risk:** Gemini key appears in source, logs, renderer state or learner export.

**Controls:**

- key entered only through Settings;
- main process tests and stores it;
- Electron `safeStorage` encryption;
- masked password input;
- excluded from learner folder and `.childmind` package;
- `.env` and secret files ignored by Git;
- no key logging.

**Residual risk:** Windows DPAPI protects against other users, not necessarily malware running as the same signed-in user. A public product should use a server-mediated credential model rather than distributing vendor keys.

### Camera or microphone without consent

**Risk:** media starts when the parent disabled it.

**Controls:**

- camera off by default;
- learner consent stored in encrypted database;
- media permission denied by default;
- active media policy set from unlocked learner consent;
- camera movement value accepted only when both camera and local-analysis consent are enabled;
- media policy cleared on lesson completion, cancellation, lock and window close;
- raw media storage forced off.

**Residual risk:** target-device testing is required because Chromium and operating-system permission behaviours vary.

### Misclassification of child behaviour

**Risk:** movement or hesitation is presented as an emotion, diagnosis or judgement.

**Controls:**

- current camera output is a numeric movement value only;
- UI and stored cue explicitly state it is not a diagnosis;
- no face recognition or emotion model;
- no medical or developmental labels;
- model prompt prohibits diagnosis.

**Residual risk:** parents may still overinterpret a number. The public product should prefer descriptive observations and require multiple-session evidence.

### Unsafe or incorrect Gemini output

**Risk:** generated wording is inappropriate, wrong or unrelated.

**Controls:**

- Gemini does not determine correctness or write memory directly;
- deterministic assessment and lesson state remain authoritative;
- minimal prompt scope;
- child-safe system instruction;
- short output limit;
- timeout and bounded retry;
- deterministic fallback on provider failure.

**Residual risk:** output moderation, red-team testing and curriculum validation are not complete. The current prototype should be used only in supervised tests.

### Data loss during save

**Risk:** crash or power interruption damages the learner database.

**Controls:**

- export database to new encrypted bytes;
- copy previous encrypted database into rotating backup;
- write temporary file in destination directory;
- flush and atomically rename;
- validate database on next unlock.

**Residual risk:** disk failure can affect both primary and local backups. Parents need verified external `.childmind` backups.

### Forgotten passphrase

**Risk:** family permanently loses access.

**Current behaviour:** MindCarry has no recovery key or vendor backdoor.

**Required future decision:** design an opt-in recovery mechanism that preserves family control, or communicate unrecoverability clearly and support verified backup practices.

### Supply-chain compromise

**Risk:** malicious npm package, GitHub Action or build artefact.

**Current controls:**

- exact dependency versions;
- limited GitHub Actions permissions;
- official checkout/setup actions;
- CI verification.

**Required before release:**

- committed lockfile;
- dependency-review automation;
- vulnerability scanning;
- signed tags and release artefacts;
- code signing/notarisation;
- protected release credentials;
- reproducible-build investigation.

## Production gates

- independent penetration test;
- threat review of passphrase and recovery design;
- Electron fuse configuration;
- signed application and update channel;
- parent data deletion and correction controls;
- child-safety and safeguarding review;
- model red-team testing;
- jurisdiction-specific privacy/legal review;
- incident-response process;
- verified backup and restore UX.
