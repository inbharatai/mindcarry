# Privacy model

MindCarry is local-first. It is not fully offline when Gemini is enabled. This describes the implemented pre-MVP technical boundary, not a complete privacy notice or legal opinion.

## Local learner data

The encrypted learner database may contain:

- preferred name, age, language, interests and parent goal;
- consent choices;
- questions, answers, correctness, hint use and response time;
- misconception/intervention/reasoning observations;
- mastery, session summaries and recommendations;
- Memory Inbox content, confidence, evidence and archive state;
- memory lifecycle events;
- graph nodes, edges, source and provenance;
- optional consented numeric movement events.

The database is encrypted before disk persistence. A small plaintext technical manifest contains no child name, age, interest, goal, lesson, memory or graph content.

## Encrypted device catalogue

The home-screen learner list is stored in `learner-catalog.enc`. A random device key is protected by Electron `safeStorage`.

MindCarry rejects:

- unavailable credential storage;
- Linux `basic_text`;
- unknown Linux backend.

On Windows, the expected target backend is DPAPI. This must be confirmed on the founder’s device.

## Context selection

Before an AI-backed explanation, MindCarry ranks active local evidence using:

- objective and skill overlap;
- memory type;
- evidence count;
- confidence;
- recency;
- review state.

The current caps are eight memories, twelve graph facts and 1,800 provider-context characters.

The parent-visible `summaryText` and provider-safe `providerText` are separate. The provider-safe graph replaces learner-node identity with `Learner`.

## Gemini boundary

Gemini is optional. Demo mode uses no AI API.

When enabled, a request may contain:

- learner age;
- current maths question;
- one relevant interest;
- current misconception;
- one teaching strategy;
- selected active memory and graph context.

It does not contain:

- child preferred name;
- complete learner profile/database;
- complete Memory Inbox or graph;
- complete session history;
- parent passphrase;
- API key as prompt content;
- raw camera frames/video;
- raw microphone audio;
- device catalogue;
- `.childmind` package.

Selected interests and learning observations are still personal data after an approved provider request. Local encryption cannot control provider processing after transmission. Provider use remains subject to the tester’s account, project and API terms.

## Gemini test key

The key is:

- entered only in the local masked Settings field;
- tested before Gemini mode activates;
- stored in the main process through accepted OS credential protection;
- outside learner folders;
- excluded from logs and exports by design;
- removable through Settings.

Never commit or paste a key into GitHub, source, `.env`, logs, screenshots, chat or learner exports.

## Camera and microphone

- microphone follows selected learner consent and has typed fallback;
- camera is off by default;
- local movement analysis needs both camera and local-analysis consent;
- media is permitted only during an active lesson;
- camera frames remain in renderer memory;
- only a clamped numeric movement value may be stored;
- tracks stop on cancellation, lock, unmount and startup/play error;
- raw audio/video storage is forced off;
- no face recognition, biometric template, identity inference or emotion/condition diagnosis.

## Parent controls implemented

- choose passphrase and camera consent at learner creation;
- unlock/lock the learner database;
- view Memory Inbox, confidence, evidence and source;
- view explained graph relations/provenance;
- archive a memory from future context;
- restore it explicitly;
- download/import encrypted complete memory;
- remove Gemini key;
- use deterministic demo mode;
- inspect session summaries and provider-context preview.

Reinforcing evidence does not automatically reactivate an archived memory.

## Parent controls not yet implemented

- edit/correct a memory;
- permanent individual-memory deletion with secure-erasure semantics;
- complete learner deletion;
- retention-period configuration;
- passphrase change or recovery;
- verified backup/restore UI;
- parent-confirmed graph relations;
- full transcript-retention controls;
- downloadable human-readable data report.

## `.childmind` portability

The package contains the already-encrypted learner database, a non-personal technical manifest and checksum. It carries Inbox, graph and audit history without a separate graph service.

Import validates size, versions, schema, UUID, canonical base64 and checksum. The receiving installation displays **Imported learner** until the original passphrase verifies the profile. Gemini/device keys do not travel.

## Analytics

No product analytics provider is configured in this repository. Learner profile, lesson data, Inbox, graph and movement events are not intentionally sent to analytics by the implementation.

## Residual privacy limitations

- passphrase/decrypted database exist in main-process memory while unlocked;
- selected provider context is external personal-data processing;
- no retention/deletion policy or full parent deletion UI yet;
- no independent child-privacy/security/legal review;
- no public-production incident process;
- target-device permission/backend behaviour is not yet evidenced.

Before use beyond controlled founder testing, MindCarry requires jurisdiction-specific parental-consent, privacy, child-safety, safeguarding and retention review.
