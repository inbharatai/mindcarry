# Validation matrix

| Area | Repository implementation | Automated evidence | Target-device evidence |
|---|---|---|---|
| Encrypted learner database | Implemented | Covered | Pending |
| Encrypted learner catalogue | Implemented | Covered | OS backend pending |
| Renderer/IPC isolation | Implemented | Covered | Packaged-app inspection pending |
| Deterministic lesson | Implemented | Covered | Supervised UI run pending |
| Duplicate lesson/answer protection | Implemented | Covered | Rapid-click test pending |
| Memory Inbox/graph | Implemented | Covered | Parent UI review pending |
| Ranked provider context | Implemented | Covered | Real request inspection pending |
| Gemini test-key connection | Implemented | Mocked/provider logic covered | Real key pending |
| Speech input/output | Implemented where supported | Parsing/helpers covered | Microphone/language test pending |
| Local camera movement cue | Implemented | Cleanup code reviewed | Camera/permission test pending |
| `.childmind` portability | Implemented | Two-install simulation covered | Two clean installs pending |
| Windows package layout | Configured | CI gate | Installer/portable launch pending |
| Code signing and updater | Not implemented | None | Required before release |
| Parent deletion/correction | Not implemented | None | Required before family testing |
| Child-safety/legal review | Not completed | None | Required before public use |

A repository row marked **Covered** means automated code-level verification, not production certification.