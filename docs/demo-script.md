# Founder-device end-to-end acceptance test

This is a verification script, not a marketing walkthrough. Use synthetic learner details, record every failure and do not describe MindCarry as a functioning prototype until all mandatory stages pass.

## Test environment

- clean Windows 10/11 user profile or VM;
- Node.js 22.12 or newer;
- Git and `winget` where automatic prerequisite installation is tested;
- working microphone;
- optional webcam;
- revocable Gemini test API key;
- internet connection plus an offline/failure test;
- second clean Windows/app-data environment for transfer testing.

## 1. Main-only installation

1. Run the README PowerShell installation command.
2. Confirm the source is created at:

```text
C:\Users\<user>\Desktop\MindCarry
```

3. Confirm `git branch --show-current` returns `main`.
4. Confirm `package-lock.json` exists.
5. Confirm setup uses `npm ci`.
6. Confirm lint, smoke, unit/integration and production build pass before launch.
7. Confirm the application opens.
8. Retain both setup logs.

**Pass:** clean main-only installation launches only after verification.

## 2. Secure vault and credential backend

1. Open **Settings**.
2. Confirm **Vault ready**.
3. Confirm the secure-storage backend reports `dpapi` on Windows.
4. Open the displayed vault folder.
5. Confirm the automatic structure contains `learners`, `exports`, `backups`, `recovery`, `temp`, `learner-catalog.enc`, `settings.json` and `vault.json`.
6. Confirm no runtime folder was selected or created by the parent.

**Pass:** vault is automatic and OS credential protection is acceptable.

## 3. Synthetic learner creation

Create:

```text
preferred name: Aarav
age: 7
language: English
interest: dinosaurs
parent goal: Build confidence in foundational maths.
camera: off
passphrase: unique test-only value of at least 12 characters
```

Then:

1. Confirm one UUID folder appears under `learners`.
2. Confirm `manifest.json`, `learner.db.enc` and reserved folders exist.
3. Search plaintext files for `Aarav`, `dinosaurs`, age and goal.
4. Confirm those values are not present in `manifest.json` or readable database text.
5. Confirm the learner appears on the home screen through the encrypted catalogue.
6. Test an incorrect passphrase and confirm unlock fails.

**Pass:** learner identity is usable in the UI but absent from plaintext technical storage.

## 4. Deterministic lesson and concurrency

1. Keep demo mode active.
2. Unlock Aarav and start the lesson.
3. For `7 + 5`, answer `11` and explain that counting stopped early.
4. Confirm the off-by-one classification and counting-on intervention.
5. For `8 + 3`, answer `11` without a hint.
6. For the transfer question `9 + 6`, answer `15` without a hint.
7. Confirm completion occurs only after independent transfer.
8. During a separate run, double-click **Check my thinking** and confirm only one attempt is recorded.
9. During another run, start/leave/start quickly and confirm only one lesson remains active.
10. Lock during an unfinished lesson and confirm it is cancelled, not left active.

**Pass:** deterministic assessment is correct and duplicate UI actions do not corrupt evidence.

## 5. Memory Inbox and graph

After completing a lesson:

1. Open **Memory Inbox**.
2. Confirm skill/misconception memories show confidence, evidence count and source lesson.
3. Confirm learner, skill, interest, memory and session nodes appear.
4. Confirm relations display provenance.
5. Confirm the parent-visible context preview is bounded.
6. Archive one memory.
7. Start another lesson and confirm the archived item is absent from selected context.
8. Complete matching evidence again and confirm the item remains archived while evidence count increases.
9. Restore it explicitly and confirm it returns to future context.

**Pass:** parent control is respected and graph/context updates are explainable.

## 6. Restart persistence

1. Lock the learner.
2. Close MindCarry completely.
3. Restart it.
4. Unlock with the original passphrase.
5. Confirm sessions, mastery, Inbox, archive state, graph and context remain.
6. Force-close during an unfinished session and record actual recovery behaviour.

**Pass:** completed state survives restart. Any crash-recovery limitation is documented as a defect/gate.

## 7. Gemini test-key boundary

1. Open Settings.
2. Paste the test key only into the masked field.
3. Select **Save securely and test Gemini**.
4. Confirm provider and `gemini-2.5-flash` status.
5. Deliberately answer incorrectly and confirm the explanation is short and relevant.
6. Inspect available network/debug evidence using synthetic data and confirm the child name is not in the provider request.
7. Confirm selected context is capped and the complete database/graph is not sent.
8. Test disconnected internet, revoked key, timeout/rate-limit conditions where feasible.
9. Confirm deterministic fallback continues without losing evidence.
10. Remove the key and confirm demo mode returns.
11. Confirm no key appears in repository, logs, vault learner folders or exports.

**Pass:** provider success and failure are safe, minimised and de-identified.

## 8. Microphone and speech

1. Use a learner with microphone consent enabled.
2. Speak `Seven plus five is twelve`.
3. Confirm the final answer `12` is selected rather than the first number.
4. Confirm speech output uses the learner language code.
5. Deny microphone permission and confirm typed input remains usable.
6. Use a learner with microphone disabled and confirm recognition cannot start.
7. Exit mid-recognition and confirm it stops without an error loop.

**Pass:** speech is consent-bound, robust and has a typed fallback.

## 9. Optional camera

Use synthetic data only.

1. Create a camera-enabled learner.
2. Confirm preview appears only during the active lesson.
3. Confirm movement changes the local numeric cue.
4. Confirm no raw video appears in the vault.
5. Cancel, lock and navigate away; confirm the camera indicator turns off.
6. Simulate camera denial/unavailable device/playback error and confirm tracks stop.
7. Repeat with camera disabled.

**Pass:** camera use is visible, local, consent-bound and cleaned up on every exit/error path.

## 10. Export integrity

1. Select **Download complete memory**.
2. Confirm `.childmind` extension and UUID-based default name.
3. Open the JSON package as text.
4. Confirm it does not reveal child name, goal, readable history, passphrase or Gemini key.
5. Add whitespace to the encrypted base64 or alter its payload/checksum.
6. Confirm import rejects it.
7. Set an unsupported schema version and confirm rejection.

**Pass:** export is encrypted, minimally described and strictly validated.

## 11. Clean second-installation import

1. Install from `main` in a separate clean environment.
2. Import the original unmodified `.childmind`.
3. Confirm **Imported learner** appears before unlock.
4. Unlock with the original passphrase.
5. Confirm name, sessions, Inbox, evidence counts, graph and context return.
6. Start a new lesson and confirm relevant context is available.
7. Confirm Gemini key and device catalogue key did not transfer.

**Pass:** learner context moves while device/provider credentials do not.

## Evidence to retain

- commit SHA and CI/CodeQL links;
- installation and setup logs;
- secure backend and vault screenshots;
- non-personal manifest search evidence;
- lesson and duplicate-action result;
- Memory Inbox/graph/archive/restore result;
- restart result;
- Gemini success/failure and request-minimisation evidence;
- microphone/camera consent and cleanup evidence;
- tampered-export rejection;
- second-install transfer result;
- defect register with severity, reproduction and fix status.

Do not publish real API keys, real child data, passphrases, vault paths containing personal usernames or `.childmind` files.
