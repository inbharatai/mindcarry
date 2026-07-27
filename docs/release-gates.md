# Release gates

## Repository merge gate

- Windows and Ubuntu CI pass.
- Production dependency audit has no high/critical finding.
- CodeQL passes.
- No API key, passphrase, learner export or real-child data is committed.
- README/status documents describe MindCarry as pre-MVP.

## Founder-device prototype gate

- Clean main-only install and packaged app launch.
- Accepted secure-storage backend.
- Full UI, lesson, Inbox, graph and restart test.
- Real Gemini success and failure tests.
- Microphone/camera consent and cleanup tests.
- Two-clean-install `.childmind` transfer.

## Supervised-family gate

- Parent correction/deletion/full learner deletion.
- Passphrase/backup/restore decision.
- Crash recovery and accessibility review.
- Educator, safeguarding and parent-consent protocol.

## Public-use gate

- Independent security and model red-team review.
- Child-safety, privacy/legal and curriculum approval.
- Signed builds, secure updates, incident response and retention/deletion policy.
