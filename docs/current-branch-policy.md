# Branch policy

`main` is the only maintained MindCarry branch.

- Installers clone `main` only.
- CI runs on pushes to `main` and pull requests targeting `main`.
- Merged audit or feature branches are deleted.
- Old branches, ZIP files and unsigned prototype packages are not supported releases.
- API keys, passphrases, `.childmind` exports and real-child data must never be committed.

This document records repository policy; GitHub branch protection settings must be reviewed separately in the repository UI.