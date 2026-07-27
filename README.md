# MindCarry

MindCarry is a desktop-first, voice-enabled AI tutor alpha for children learning foundational maths. It demonstrates the core product thesis: the AI provider is replaceable, while each child's structured learner memory remains encrypted, local and portable.

## What works in this alpha

- Parent creates a separate learner profile and passphrase.
- Learner database is encrypted at rest with AES-256-GCM; the key is derived from the parent passphrase using scrypt.
- Short adaptive addition lesson with typed or spoken answers.
- Deterministic assessment, misconception detection, intervention selection and mastery calculation.
- Optional local camera movement signal. It does not identify faces, upload frames or claim emotion detection.
- Structured learner memories and session reports survive app restarts.
- Encrypted `.childmind` export/import for moving a learner to another supported installation.
- Safe demo provider works without an API key.
- Optional Gemini explanation provider using a BYO test key stored separately with Electron `safeStorage`.

## Important limitations

- This is an alpha, not a finished child product.
- Voice input currently uses the Chromium/OS speech-recognition capability when available; Gemini Live voice is a later phase.
- The current curriculum is a small addition-within-20 demonstration.
- The camera module measures frame-to-frame movement intensity only. It does not infer a child's emotions or diagnose attention.
- The database is an encrypted SQL.js SQLite file. Before production, commission independent security/privacy review and child-safety testing.
- MindCarry is not fully offline when Gemini is enabled. The permanent learner record remains local, but current-task context is sent to Gemini for generated explanations.

## Windows local setup

Prerequisites: Node.js 22 LTS or newer and Git.

```powershell
cd "$HOME\Desktop\MindCarry"
npm install
npm run test:core
npm run dev
```

The app also works in demo mode without a Gemini key. Open **Settings** inside MindCarry to add and test a Gemini key. Do not paste an API key into source code or `.env` files.

## Useful commands

```bash
npm run dev        # Vite renderer + Electron
npm run test:core  # Dependency-free core smoke test
npm test           # Vitest suite after npm install
npm run build      # Type check + renderer build
npm run dist       # Build installer/portable package
```

## Local data

Electron stores learner folders under its per-user application-data directory. The exact location is displayed in Settings. Use `.childmind` export rather than copying an unlocked database.

## Vercel

Do not deploy this Electron application to Vercel. Electron is the local app that owns the learner memory. Vercel can later host a public website, waitlist or carefully designed web companion. That is intentionally not configured in this alpha.

See `docs/architecture.md`, `docs/privacy-model.md`, `docs/threat-model.md`, and `docs/demo-script.md`.
