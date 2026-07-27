# Repository audit manifest — July 2026

This manifest records the final repository-level review before founder-device testing. It is not a production certification.

## Code reviewed

- `electron/main.cjs`
- `electron/preload.cjs`
- all `electron/services/*.cjs`
- renderer application, speech, camera and Memory Inbox components
- global TypeScript contracts
- encryption, vault, catalogue, lesson, memory and runtime-security tests
- Windows bootstrap/setup scripts
- package/build/test/lint configuration
- CI, CodeQL and Dependabot configuration
- README, status, architecture, privacy, threat, security, roadmap and acceptance-test documents

## Confirmed repository design

- one maintained branch: `main`;
- exact pinned direct dependencies plus committed lockfile;
- deterministic `npm ci` installation;
- Electron privileged operations remain in main process;
- exact renderer IPC trust checks;
- encrypted learner DB and device catalogue;
- accepted OS credential backend required for learner catalogue/API key;
- deterministic assessment and memory writes;
- transactional session/memory/graph updates;
- ranked, bounded and de-identified provider context;
- strict `.childmind` validation;
- automatic Windows setup and vault creation;
- Windows/Ubuntu CI, production dependency audit and CodeQL.

## Tests expected at merge gate

- lint;
- dependency-free security smoke;
- unit/integration suite;
- TypeScript/Vite production build;
- Windows Electron package-layout build;
- production dependency audit;
- CodeQL security-and-quality analysis.

## Explicitly not claimed

- target-device launch success;
- signed installer readiness;
- passphrase recovery;
- parent correction/permanent deletion/full learner deletion;
- complete crash recovery;
- production child-safety, privacy/legal or curriculum approval;
- independent penetration test;
- real-child validation.

The repository should remain described as **pre-MVP** until the founder-device acceptance script passes.