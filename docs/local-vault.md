# Automatic local vault

MindCarry parents do not create, connect or manage a learner folder manually.

The Electron main process creates the complete folder structure under the operating system’s application-data location on first launch. The path is returned by `app.getPath('userData')` and displayed in **Settings → Automatic local vault**.

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

## Why the folder name is not the child’s name

Each learner directory uses a random UUID. A child’s name, age, interests and parent goal remain inside the encrypted database. The plaintext `manifest.json` contains only technical values needed before decryption:

- file format;
- format and schema versions;
- learner UUID;
- creation and update timestamps;
- encryption identifier;
- encrypted-database SHA-256 hash.

The local home-screen learner list is stored separately in `learner-catalog.enc`, encrypted with a random device key protected through Electron `safeStorage`.

## Folder creation sequence

When the app starts:

1. `VaultManager` resolves the absolute vault path.
2. It creates the root, learners, exports, backups, recovery and temporary directories.
3. It creates a non-personal technical vault descriptor when missing.
4. It removes stale temporary files on a best-effort basis.
5. `CatalogStore` opens the encrypted learner catalogue.
6. Legacy plaintext manifests are migrated into the encrypted catalogue when possible.

When a parent creates a learner:

1. MindCarry generates a random learner UUID.
2. It creates the complete learner subdirectory structure.
3. It creates the SQLite schema in memory.
4. It writes the profile, consent and initial skill records.
5. It exports the SQLite bytes in memory.
6. It encrypts those bytes with the parent passphrase.
7. It atomically writes `learner.db.enc`.
8. It writes a non-personal manifest.
9. It adds the learner to the encrypted device catalogue.
10. It removes the incomplete learner directory if any step fails.

## Encryption layers

### Portable learner database

- AES-256-GCM authenticated encryption;
- scrypt-derived 256-bit key;
- random 16-byte salt;
- random 12-byte IV;
- learner UUID used as authenticated associated data;
- envelope versioning for migrations;
- parent passphrase never written to disk.

This layer is portable because another installation can derive the same key from the parent passphrase and the salt stored in the encrypted envelope.

### Device learner catalogue

- random 256-bit device key;
- device key protected with Electron `safeStorage`;
- AES-256-GCM catalogue encryption;
- device-specific and not included in `.childmind` exports.

Imported learners first appear as **Imported learner** until the original parent passphrase successfully decrypts the database. The verified child name is then written into the receiving device’s encrypted catalogue.

## Atomic persistence

MindCarry writes new encrypted content to a temporary file in the destination directory, flushes it and renames it over the previous file. The old encrypted database is copied into the learner’s backup directory before replacement.

The current prototype retains the five newest encrypted database backups per learner.

Atomic replacement reduces, but cannot eliminate, data-loss risk caused by power failure, disk failure or operating-system interruption.

## Export format

A `.childmind` file is a JSON package containing:

- package format and version;
- non-personal technical manifest;
- base64-encoded encrypted learner database;
- SHA-256 integrity checksum.

It does not contain:

- Gemini API key;
- device catalogue key;
- plaintext child name;
- plaintext learner database;
- operating-system credentials.

The import process validates file size, package version, learner UUID and checksum before creating the new learner structure.

## Reserved directories

The `media`, `handwriting` and `pronunciation` directories exist so future modules have predictable storage boundaries. Their existence does not mean the current prototype stores those data types.

Raw audio and video storage remain disabled in the current implementation.

## Parent experience

The parent only needs to:

1. create the learner inside the app;
2. choose a strong passphrase;
3. keep that passphrase safe;
4. use Export when they want a portable backup or transfer.

No folder selection is required for normal operation.
