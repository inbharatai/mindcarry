# Security policy

MindCarry handles child-related learning data and must be treated as security-sensitive software.

## Supported code

MindCarry is pre-MVP. No version is approved for production child use.

Security fixes are maintained only on the latest `main` branch. Older commits, old branches, local ZIP files, unsigned installers and prototype packages are not supported releases.

## Report privately

Do not open a public issue containing:

- an exploitable vulnerability;
- API credentials or passphrases;
- child or parent data;
- decrypted learner files or `.childmind` packages;
- screenshots with personal information;
- weaponised reproduction details before remediation.

Send a private report to:

**reetu004@gmail.com**

Subject:

```text
MindCarry Security Report
```

Include:

- affected commit/version;
- operating system and MindCarry installation method;
- clear synthetic-data reproduction steps;
- expected and actual behaviour;
- security/privacy impact;
- proof of concept using only systems/data you control;
- suggested mitigation where available.

## Response expectations

MindCarry is founder-led and has no formal vulnerability-response SLA yet. Reports should be acknowledged as soon as reasonably possible, triaged before public discussion and fixed before the affected feature is used with real child data.

## Priority areas

- learner decryption without the parent passphrase;
- API/device key disclosure;
- plaintext learner PII outside the encrypted boundary;
- renderer escape, arbitrary IPC/filesystem access or Electron code execution;
- insecure credential-backend acceptance;
- cross-learner or cross-session access;
- bypass of parent camera/microphone consent;
- camera/microphone continuing after exit/error;
- malicious `.childmind` path traversal, resource exhaustion or code execution;
- checksum/schema/package-validation bypass;
- parent archive-state bypass;
- complete learner DB/name/raw media reaching an AI provider;
- unsafe generated output bypassing the deterministic teaching boundary;
- export containing API/OS secrets.

## Research rules

- use only accounts, devices, API projects and synthetic learner records you control;
- never access, retain or publish another person’s data;
- never use real-child data in proofs of concept;
- do not perform denial-of-service testing against third-party services;
- do not social-engineer users or maintainers;
- minimise data collection and delete test artefacts securely;
- allow reasonable remediation time before coordinated disclosure.

## Secrets accidentally exposed

Any committed, pasted, logged or screenshotted secret must be treated as compromised even after deletion. Revoke/rotate it immediately, remove it from history where appropriate and review provider/account logs for misuse.

## Security status

Repository tests, dependency auditing and CodeQL are safeguards, not certification. Before public child use MindCarry still requires independent application-security testing, model red-teaming, safeguarding/privacy/legal review, signed releases, secure updates and incident-response procedures.
