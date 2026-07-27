# Threat model

## Covered in alpha

- Stolen exported file: encrypted database requires passphrase.
- Wrong passphrase: authenticated decryption fails without returning data.
- Tampered export: checksum verification rejects corruption.
- Renderer compromise: Node integration disabled, sandbox/context isolation enabled, narrow IPC bridge.
- API-key leakage: key is absent from learner folders, exports and logs.
- Accidental camera retention: frames remain in renderer memory and are not written to disk.

## Before production

- Replace/strengthen key derivation with audited Argon2id implementation.
- Add signed manifests and rollback-safe schema migrations.
- Add parent PIN and granular memory review/deletion.
- Add application code signing and hardened Electron fuses.
- Complete child privacy legal review for every launch jurisdiction.
- Conduct independent penetration test and adversarial model testing.
