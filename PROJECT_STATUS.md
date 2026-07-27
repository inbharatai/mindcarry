# MindCarry alpha status

## Implemented
- Electron + React + TypeScript desktop scaffold
- Secure context-isolated IPC bridge
- Encrypted per-child local SQLite memory
- Parent passphrase create/unlock flow
- Local learner list and dashboard
- Adaptive addition lesson vertical slice
- Typed and browser/OS speech input
- Optional local-only camera movement cue
- Demo AI provider and Gemini provider adapter
- OS-secured Gemini test-key settings
- `.childmind` encrypted export/import
- Core encryption/assessment smoke test
- Windows setup and GitHub push scripts
- Architecture, privacy, threat-model, roadmap and demo docs

## Verified in this build environment
- Core encryption round trip
- Wrong-passphrase rejection
- Assessment and misconception detection
- Interest-based intervention selection
- Mastery calculation
- JavaScript syntax checks

## Requires testing on the user's Windows desktop
- `npm install` (the build environment cannot reach npm)
- Electron launch and webcam/microphone permissions
- Gemini key health check
- Renderer TypeScript production build after dependencies install
- Windows installer/portable package
