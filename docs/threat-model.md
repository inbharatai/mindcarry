# Threat model

This threat model covers the current desktop pre-MVP. It does not claim that MindCarry is ready for production child use.

## Protected assets

- child profile, lessons, memories and graph;
- parent passphrase;
- Gemini test API key;
- encrypted learner database and backups;
- encrypted device learner catalogue;
- `.childmind` exports;
- camera and microphone permissions;
- lesson/mastery integrity;
- source, dependency and release integrity.

## Trust assumptions

- the parent controls the signed-in operating-system account;
- the operating system is not already fully compromised;
- the parent keeps the passphrase private;
- installed dependencies and GitHub Actions are authentic;
- provider transport/account controls work as documented.

MindCarry cannot protect secrets from an attacker with full administrator access, same-user malware or reliable process-memory inspection.

## Threats, controls and residual risk

### Stolen device or disk

**Risk:** learner data is read from storage.

**Controls:** AES-256-GCM learner database, scrypt parent key, encrypted catalogue, OS-protected API/device keys, no plaintext database file.

**Residual risk:** a weak 12-character passphrase may still be guessed offline. No strength meter or recovery system exists.

### Stolen `.childmind` export

**Risk:** the portable file is copied from USB, email or cloud storage.

**Controls:** database remains passphrase-encrypted; technical manifest excludes child identity and credentials; default filename uses a short UUID.

**Residual risk:** surrounding filenames/folders chosen by the parent can reveal context.

### Wrong passphrase or corrupted database

**Risk:** partial decryption or inconsistent state is exposed.

**Controls:** authenticated decryption, UUID-associated data, strict envelope/KDF/base64 validation, SQLite integrity check, exactly one matching profile and consent record.

**Residual risk:** corrupted local data may still require restoration from an encrypted backup/export.

### Malicious `.childmind` package

**Risk:** path traversal, oversized allocation, unsupported schema or database confusion.

**Controls:** bounded file and encrypted-payload size, JSON/package/version/schema validation, UUID validation, canonical base64, checksum, fixed destination, no archive extraction, no overwrite of an existing learner, post-passphrase database identity verification.

**Residual risk:** encrypted SQLite bytes cannot be structurally inspected before a valid passphrase is supplied. Fuzzing remains required.

### Renderer compromise or XSS

**Risk:** malicious renderer content accesses keys/files or invokes privileged functions.

**Controls:** sandbox, context isolation, Node disabled, production DevTools disabled, exact IPC sender check, no external renderer network, new windows/navigation denied, narrow named preload API, main-process argument validation.

**Residual risk:** Electron/main-process vulnerabilities or compromised packaged source can bypass renderer controls.

### API-key theft

**Risk:** Gemini key appears in source, renderer state, logs or learner export.

**Controls:** key entered only in Settings, tested and stored in main process, masked input, OS `safeStorage`, insecure Linux `basic_text` rejected, excluded from learner folders/exports/logging.

**Residual risk:** DPAPI/Keychain/secret-service protection does not defeat same-user malware. A public service should avoid distributing a vendor-owned production key.

### Unauthorised camera or microphone

**Risk:** media begins without the selected learner’s consent.

**Controls:** default deny, active-lesson policy, encrypted consent, camera off by default, typed fallback, media policy cleared on completion/cancel/lock/close, stream stopped on startup failure/unmount, raw storage forced off.

**Residual risk:** browser and OS permission behaviour requires target-device testing.

### Behaviour overinterpretation

**Risk:** movement or delay is treated as emotion, identity or diagnosis.

**Controls:** numeric movement only, local frames, explicit non-diagnostic wording, no face/emotion model, prompt prohibits diagnosis, repeated evidence required for stable memory.

**Residual risk:** users can still overinterpret a displayed number. Public UX requires further safeguarding review.

### Incorrect or unsafe model output

**Risk:** Gemini generates unsuitable, wrong or unrelated wording.

**Controls:** model never determines correctness/mastery or writes memory; bounded de-identified context; short output; zero thinking budget; timeout/retry; deterministic fallback; diagnosis/personal-information prohibitions.

**Residual risk:** moderation, curriculum validation and model red-teaming are incomplete.

### Child identity leakage to provider

**Risk:** the learner’s name or full history is sent externally.

**Controls:** provider system instruction omits name; provider-safe graph replaces learner-node label with `Learner`; context is ranked/capped; complete database, complete graph, raw media, passphrase and export never sent.

**Residual risk:** selected interests and learning observations are still personal data once intentionally sent to the configured provider.

### Lesson race or state corruption

**Risk:** duplicate start/answer actions produce incorrect evidence.

**Controls:** one active lesson per learner, old lesson cancellation, answer-processing lock, active-session ownership checks, SQL transactions and expected-row checks.

**Residual risk:** abrupt process termination can still interrupt the in-memory session; stronger crash recovery is pending.

### Parent archive bypass

**Risk:** a memory archived by a parent becomes active automatically after repeated evidence.

**Controls:** reinforcement preserves `active = 0`; only explicit restore reactivates; lifecycle event is recorded; graph excludes archived memory.

**Residual risk:** parent correction and permanent deletion are not yet implemented.

### Data loss during save

**Risk:** crash, power loss or disk failure damages data.

**Controls:** encrypted export to new bytes, rotating prior backups, destination-local temporary write, flush and atomic rename, verification on unlock.

**Residual risk:** one disk failure can affect primary and local backups. Families need verified external exports and restore UI.

### Forgotten passphrase

**Risk:** permanent loss of access.

**Current behaviour:** no recovery key or vendor backdoor.

**Required decision:** an opt-in family-controlled recovery design or clear unrecoverability/backup workflow.

### Supply-chain compromise

**Risk:** malicious npm dependency, action or build artefact.

**Controls:** exact direct versions, committed lockfile, `npm ci`, limited workflow permissions, official pinned-major GitHub actions, production high-severity audit, CodeQL, Windows/Linux verification.

**Residual risk:** action references are not pinned to immutable commit SHAs, releases are unsigned, and reproducible builds are not established.

## Production gates

- independent penetration/application-security assessment;
- passphrase and recovery review;
- Electron fuse hardening;
- signed/notarised application and secure updates;
- parent correction/deletion/full-learner controls;
- verified backup/restore UX;
- child-safety and safeguarding review;
- model red-team and curriculum validation;
- jurisdiction-specific privacy/legal review;
- incident response and retention policy.
