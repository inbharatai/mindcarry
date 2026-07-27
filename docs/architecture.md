# Architecture

## Trust boundaries

1. **Renderer:** React interface, lesson interaction, browser speech, optional local camera frames.
2. **Preload:** Narrow typed bridge; no raw Electron API is exposed.
3. **Main process:** Validates IPC, owns filesystem access, encryption, learner database, model credentials and Gemini calls.
4. **Learner Memory:** Encrypted SQL.js/SQLite bytes per child plus non-sensitive manifest.
5. **AI provider:** Receives only minimal current-task context. It is not the source of truth for memory.

## Core flow

Child answer → deterministic assessment → optional Gemini explanation → encrypted attempt write → lesson completion → structured memory write → relevant retrieval next session.

## Portability

A `.childmind` file contains an already-encrypted database, a manifest and integrity checksum. API credentials are never included. Another MindCarry installation imports the file and asks for the original parent passphrase when opening it.
