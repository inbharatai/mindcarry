# Automatic local vault

MindCarry parents do not create, connect or manage technical learner folders manually.

The Electron main process creates the complete runtime structure under `app.getPath('userData')`. The exact location and secure credential backend are displayed in **Settings → Automatic local vault**.

## Runtime layout

```text
<electron-user-data>/
└── MindCarryVault/
    ├── vault.json
    ├── settings.json
    ├── learner-catalog.enc
    ├── learners/
    │   └── <learner-uuid>/
    │       ├── manifest.json
    │       ├── learner.db.enc
    │       ├── backups/
    │       ├── media/
    │       ├── handwriting/
    │       ├── pronunciation/
    │       └── session-cache/
    ├── exports/
    ├── backups/
    ├── recovery/
    └── temp/
```

## Plaintext technical boundary

A learner directory uses a random UUID, not the child’s name. `manifest.json` contains only:

- format and schema versions;
- learner UUID;
- creation/update timestamps;
- encryption identifier;
- encrypted-database SHA-256 hash;
- a flag stating that the technical manifest itself has no personal fields.

The child’s name, age, language, interests, parent goal, consent, sessions, attempts, memories, graph and audit events are inside `learner.db.enc`.

The home-screen list lives in `learner-catalog.enc`, protected by a random device key wrapped through Electron `safeStorage`. MindCarry rejects Linux `basic_text`/unknown fallback instead of storing names or an API key through an insecure backend.

## Learner creation

1. Main process validates name, age, language, interests, goal, consent and passphrase.
2. A random UUID and complete learner folder are created.
3. SQLite schema, profile, consent and initial skill are written in an explicit transaction.
4. The database bytes are exported in main-process memory.
5. Bytes are encrypted with the parent passphrase.
6. `learner.db.enc` is written atomically.
7. A non-personal manifest and encrypted catalogue entry are written.
8. The deterministic graph is created inside the encrypted database.
9. Any incomplete learner folder is removed after failure.

## Learner database encryption

- AES-256-GCM authenticated encryption;
- 256-bit key derived asynchronously with scrypt;
- random 16-byte salt and 12-byte IV;
- learner UUID as authenticated associated data;
- fixed supported KDF parameters;
- strict canonical-base64 and envelope-version parsing;
- bounded encrypted payload size;
- passphrase never written to disk by MindCarry.

After decryption, MindCarry requires:

- successful SQLite integrity check;
- exactly one profile;
- profile UUID matching the folder UUID;
- a matching consent record;
- supported schema migration.

The decrypted SQL.js database and passphrase remain in Electron main-process memory while unlocked. JavaScript cannot guarantee deterministic heap wiping; this is a documented residual risk.

## Catalogue and API-key protection

- random 256-bit catalogue key;
- AES-256-GCM catalogue encryption;
- key wrapped by an accepted OS credential backend;
- strict UUID, age, timestamp and duplicate-entry validation;
- Gemini key tested before storage;
- catalogue/device key and Gemini key never included in `.childmind`.

On Windows, the expected backend is `dpapi`. Target-device testing must confirm it.

## Atomic persistence and backups

For each material update MindCarry:

1. exports the in-memory SQLite bytes;
2. encrypts new bytes;
3. copies the previous encrypted database into the learner backup folder;
4. writes a destination-local temporary file;
5. flushes and atomically renames it;
6. updates the technical checksum manifest.

The current implementation retains the five newest encrypted database backups per learner. This reduces corruption risk but does not replace a verified external backup.

## Memory Inbox and graph storage

The following remain inside the same encrypted database:

- active and archived memory items;
- evidence counts and confidence;
- lifecycle events;
- graph nodes and edges;
- relation provenance;
- ranked context source data.

No separate graph server, graph folder or provider-specific embedding index is needed.

## `.childmind` format

A `.childmind` file is JSON containing:

- package format/version and export time;
- non-personal technical learner manifest;
- base64 of the already-encrypted learner database;
- SHA-256 checksum.

Import validates:

- regular-file and total-size bounds;
- package and learner-manifest format/version;
- supported schema version;
- UUID;
- canonical base64 and encrypted-payload bound;
- checksum;
- absence of an existing learner directory.

After the parent enters the original passphrase, database identity/integrity is verified and the graph is rebuilt. Until then the receiving UI displays **Imported learner**.

## Reserved folders

`media`, `handwriting` and `pronunciation` reserve future boundaries. Their existence does not mean data is currently stored there.

Raw audio and raw video storage are forced off in the current implementation.

## Parent responsibility

The parent needs to:

1. choose and retain a strong passphrase;
2. keep the signed-in OS account/device protected;
3. export a `.childmind` backup when needed;
4. protect exported files;
5. understand that no passphrase recovery currently exists.

Normal operation requires no folder selection.
