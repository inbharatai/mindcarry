# Security policy

MindCarry handles child-related learning data and should be treated as security-sensitive software.

## Supported versions

MindCarry is currently pre-MVP. No version is approved for production child use.

Security fixes are applied to the latest `main` branch and active audit branches. Older commits and prototype packages should not be considered supported releases.

## Reporting a vulnerability

Do not open a public GitHub issue containing:

- an exploitable security flaw;
- API credentials;
- child or parent data;
- decrypted learner files;
- screenshots containing personal information;
- detailed steps that could put users at risk before a fix is available.

Send a private report to:

**reetu004@gmail.com**

Use the subject:

```text
MindCarry Security Report
```

Include:

- affected commit or version;
- operating system;
- clear reproduction steps;
- expected and actual behaviour;
- impact assessment;
- proof of concept with synthetic data only;
- suggested mitigation when available.

## Response expectations

Because this is a founder-led pre-MVP project, response times are not yet covered by a formal SLA. Reports should be acknowledged as soon as reasonably possible, triaged before public discussion and fixed before the affected feature is used with real child data.

## Scope priorities

Highest-priority reports include:

- learner database decryption without the parent passphrase;
- API-key exposure;
- plaintext learner PII outside the intended encrypted boundary;
- arbitrary filesystem access from the renderer;
- Electron remote-code execution;
- bypass of parent camera or microphone consent;
- malicious `.childmind` import leading to code execution or path traversal;
- cross-learner data access;
- unsafe model output reaching a child despite the teaching boundary;
- export packages containing operating-system secrets or API keys.

## Research rules

- use only accounts, devices and synthetic learner records you control;
- do not access another person’s data;
- do not retain or publish child data;
- do not perform denial-of-service testing against third-party APIs;
- do not attempt social engineering;
- allow reasonable time for remediation before disclosure.

## Secrets accidentally committed

A committed secret must be treated as compromised even after the file is deleted. Revoke or rotate it immediately, remove it from history when appropriate and review logs for misuse.
