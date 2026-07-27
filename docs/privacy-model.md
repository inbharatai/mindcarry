# Privacy model

MindCarry is local-first. It is not fully offline when Gemini is enabled.

This document describes the implemented pre-MVP boundary, not a complete legal privacy policy.

## Data categories

### Profile data

- preferred name;
- age;
- preferred language;
- interests;
- parent goal.

### Learning evidence

- question and answer;
- correctness;
- independence and hint use;
- response time;
- simple misconception classification;
- teaching intervention;
- reasoning observation;
- mastery score;
- session summary and recommendation.

### Optional observable cue

- one numeric movement-intensity value calculated locally from camera frames.

The movement value is not an emotion, diagnosis, identity or biometric template.

## Local storage boundary

The following are stored inside the encrypted learner database:

- profile data;
- consent choices;
- learning evidence;
- session history;
- structured learner memories;
- optional consented engagement events.

The database is encrypted with the parent passphrase before being written to disk.

The local learner list is stored in a separate encrypted catalogue protected by an operating-system-backed device key.

## Plaintext technical metadata

A small technical manifest remains readable before decryption so MindCarry can validate and migrate the encrypted file. It contains no child name, age, interest or parent goal.

It may contain:

- format and schema version;
- random learner UUID;
- timestamps;
- encryption identifier;
- encrypted-file hash.

## Gemini boundary

Gemini is optional. Demo mode does not require an AI API.

When Gemini is enabled, MindCarry sends only the information required to phrase one short reteaching explanation:

- current maths question;
- learner age;
- one relevant interest;
- current misconception;
- one teaching strategy.

The implementation does not send:

- complete learner database;
- complete session history;
- encrypted database file;
- parent passphrase;
- API key as prompt content;
- raw camera video;
- raw microphone audio;
- device catalogue;
- `.childmind` package.

Third-party provider processing remains subject to the provider account and API terms chosen by the parent/tester. This repository does not claim that local encryption controls data after a request is sent to the provider.

## Gemini API key

The key is:

- entered in the local Settings screen;
- tested before Gemini mode is enabled;
- encrypted using Electron `safeStorage`;
- stored outside learner directories;
- omitted from logs and exports by design.

The key must never be committed to GitHub or placed in `.env`.

## Camera and microphone

- microphone permission is associated with the selected learner consent;
- camera permission is off by default;
- local behaviour analysis requires a separate enabled consent flag;
- media permission is enabled only during an active lesson;
- raw audio and raw video storage are forced off in the current implementation;
- camera frames remain in renderer memory and are not uploaded by the camera module;
- only a clamped movement value may be stored.

## Parent control currently available

- choose camera consent at learner creation;
- choose a parent passphrase;
- lock the learner database;
- export an encrypted learner package;
- remove the Gemini key;
- use deterministic demo mode;
- view stored structured memories and session summaries.

## Parent control still required before public release

- edit or correct a stored memory;
- delete individual memories;
- delete the complete learner and confirm removal;
- configure retention periods;
- change passphrase;
- verify an export before deleting a local copy;
- explicit transcript-retention controls in the UI;
- clear data-use and provider disclosures suitable for launch jurisdictions.

## Portability

A `.childmind` package contains the already-encrypted learner database and non-personal technical metadata. It can be copied by the family. The original parent passphrase is required on the receiving installation.

The receiving device creates its own encrypted learner catalogue after successful unlock. Device credentials and Gemini keys do not travel with the learner package.

## Analytics

No product analytics service is configured in the current repository. Child data, transcripts, camera signals and learner-memory contents are not sent to an analytics provider by the implementation.

## Legal and safeguarding boundary

Before use beyond controlled founder-led testing, MindCarry requires jurisdiction-specific privacy, parental-consent, child-safety, safeguarding and data-retention review. Repository-level technical controls are necessary but not sufficient for compliance.
