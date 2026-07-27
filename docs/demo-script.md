# First end-to-end acceptance test

This is a test script, not a marketing walkthrough. Record every failure, screenshot the error and do not claim the prototype works until all required stages pass.

## Test environment

- Windows 10 or 11
- Node.js 22.12 or newer
- Git
- working microphone
- optional working webcam
- Gemini test API key
- internet connection
- second Windows user profile, VM or separate installation directory for portability testing

## Stage 1: automated installation

1. Run `INSTALL_TO_DESKTOP.ps1` from a trusted local copy.
2. Confirm it creates:

```text
C:\Users\<user>\Desktop\MindCarry
```

3. Confirm dependency installation completes.
4. Confirm lint, smoke tests, unit/integration tests and production build all pass.
5. Confirm MindCarry opens.

**Pass condition:** the application opens only after the verification pipeline succeeds.

## Stage 2: automatic vault creation

1. Open **Settings**.
2. Confirm **Vault ready** appears.
3. Note the displayed runtime vault path.
4. Select **Open vault folder**.
5. Confirm the following exist without manual creation:

```text
MindCarryVault/
├── learners/
├── exports/
├── backups/
├── recovery/
├── temp/
├── learner-catalog.enc
├── settings.json
└── vault.json
```

**Pass condition:** the parent did not create or select any runtime folder.

## Stage 3: create the learner

Create:

- preferred name: `Aarav`
- age: `7`
- language: `English`
- interest: `dinosaurs`
- goal: `Build confidence in foundational maths.`
- camera: off for the first run
- parent passphrase: a new test-only passphrase of at least 12 characters

After creation:

1. Confirm one UUID-named directory appears under `learners/`.
2. Confirm it contains `manifest.json`, `learner.db.enc` and the reserved subfolders.
3. Open `manifest.json` in a text editor.
4. Confirm it does not contain `Aarav`, age `7`, `dinosaurs` or the parent goal.
5. Search `learner.db.enc` as text.
6. Confirm it does not expose the profile as readable plaintext.

**Pass condition:** all folders were automatic and personal fields are not present in plaintext technical files.

## Stage 4: demo-mode lesson

1. Keep MindCarry in deterministic demo mode.
2. Unlock Aarav with the parent passphrase.
3. Start the maths lesson.
4. For `7 + 5`, answer `11`.
5. In the reasoning field, write: `I counted the objects but stopped one early.`
6. Confirm MindCarry identifies an off-by-one counting error and gives a counting-on intervention.
7. Answer the second question correctly without a hint.
8. Answer the final transfer question correctly without a hint.
9. Confirm the session completes only after the transfer question.
10. Confirm the dashboard shows:
    - a completed session;
    - mastery evidence;
    - a misconception memory;
    - an independent transfer memory.

**Pass condition:** deterministic assessment and persistent memory work without Gemini.

## Stage 5: restart persistence

1. Lock Aarav.
2. Close MindCarry completely.
3. Start MindCarry again.
4. Confirm Aarav appears in the learner list.
5. Unlock with the same passphrase.
6. Confirm the completed session and memories remain.
7. Confirm an incorrect passphrase does not open the learner.

**Pass condition:** learner state survives process restart and wrong-passphrase access fails safely.

## Stage 6: Gemini connection

1. Open Settings.
2. Paste the Gemini test API key.
3. Select **Save securely and test Gemini**.
4. Confirm the connection test returns success.
5. Confirm the app reports Gemini and model `gemini-2.5-flash`.
6. Run another lesson and deliberately answer the first question incorrectly.
7. Confirm the reteaching explanation is generated and remains short and relevant.
8. Disconnect the internet or use an invalid/revoked test key in a separate test.
9. Confirm the lesson continues with deterministic fallback rather than losing learner data.
10. Remove the Gemini key and confirm demo mode returns.

**Pass condition:** model success and failure paths are both safe.

## Stage 7: microphone consent

1. Use a learner with microphone consent enabled.
2. Start a lesson and use the microphone button.
3. Confirm the operating-system permission flow appears when required.
4. Speak `twelve` and confirm it is transcribed into the answer field.
5. Use a learner whose microphone permission is disabled.
6. Confirm the microphone button cannot start recognition and typing remains available.

**Pass condition:** microphone use follows learner consent and has a typed fallback.

## Stage 8: optional camera consent

Use a synthetic test profile only.

1. Create a learner with camera observation enabled.
2. Start a lesson.
3. Confirm the camera preview appears only during the lesson.
4. Confirm the movement value changes when the person moves.
5. Confirm no raw video file appears in the vault.
6. Cancel the lesson and confirm the camera stops.
7. Lock the learner and confirm the camera cannot continue.
8. Repeat with camera consent disabled and confirm access is denied/off.

**Pass condition:** camera activity is local, visible, consent-bound and not retained as raw video.

## Stage 9: export

1. Unlock Aarav.
2. Select **Export encrypted .childmind**.
3. Save to the default exports directory or another chosen location.
4. Confirm the file extension is `.childmind`.
5. Open the package as text.
6. Confirm it does not contain:
    - Gemini API key;
    - `Aarav`;
    - parent goal;
    - readable lesson history.
7. Confirm modifying the encrypted payload causes import integrity validation to fail.

**Pass condition:** the export is portable but does not expose plaintext learner PII or credentials.

## Stage 10: second-installation import

1. Install MindCarry in a second Windows profile, VM or clean app-data environment.
2. Import the original `.childmind` package.
3. Confirm the home screen initially shows **Imported learner** rather than trusting plaintext identity metadata.
4. Enter the original parent passphrase.
5. Confirm the profile resolves to Aarav after successful decryption.
6. Confirm the previous session and learner memories are present.
7. Start another lesson and confirm the same learner context is available.
8. Confirm the receiving installation does not inherit the first device’s Gemini key.

**Pass condition:** learning context moves, while device credentials and AI credentials do not.

## Final evidence to retain

- setup log;
- CI link and commit SHA;
- screenshot of vault structure with UUID only;
- screenshot of non-personal manifest;
- lesson completion screen;
- restart persistence screen;
- Gemini success and fallback result;
- export/import result;
- list of defects found and fixed.

Use synthetic learner details in all screenshots shared publicly.
