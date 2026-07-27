# Privacy model

MindCarry is local-first. It is not fully offline when Gemini is enabled.

This document describes the implemented pre-MVP technical boundary, not a complete legal privacy policy.

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

### Memory Inbox data

- bounded memory observation;
- memory type;
- confidence;
- evidence count;
- source lesson;
- created and last-confirmed dates;
- active or archived state;
- memory lifecycle events.

### Local learner-graph data

- learner, skill, interest, memory and session nodes;
- explained relations between nodes;
- edge confidence and evidence count;
- source memory and source session;
- provenance: extracted, deterministically derived or future parent-confirmed.

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
- Memory Inbox archive state;
- memory-event audit history;
- local graph nodes and edges;
- optional consented engagement events.

The database is encrypted with the parent passphrase before being written to disk. The graph is not stored in a cloud graph database and no external graph service is required.

The local learner list is stored in a separate encrypted catalogue protected by an operating-system-backed device key.

## Plaintext technical metadata

A small technical manifest remains readable before decryption so MindCarry can validate and migrate the encrypted file. It contains no child name, age, interest, parent goal, inbox item or graph content.

It may contain:

- format and schema version;
- random learner UUID;
- timestamps;
- encryption identifier;
- encrypted-file hash.

## Provider-independent context selection

Before an AI-backed lesson, MindCarry creates a bounded Learner Context Packet locally. The current limits are:

- a small set of current skills;
- up to eight active relevant memory items;
- up to twelve explained graph facts;
- a short summary capped before it reaches the provider adapter.

Archived memory items are not included. The canonical evidence, Inbox and graph remain local even when a provider changes.

## Gemini boundary

Gemini is optional. Demo mode does not require an AI API.

When Gemini is enabled, MindCarry may send only the information required to phrase one short reteaching explanation:

- current maths question;
- learner age;
- one relevant interest;
- current misconception;
- one teaching strategy;
- selected bounded active-memory context.

The implementation does not send:

- complete learner database;
- complete Memory Inbox;
- complete graph;
- complete session history;
- encrypted database file;
- parent passphrase;
- API key as prompt content;
- raw camera video;
- raw microphone audio;
- device catalogue;
- `.childmind` package.

Memory context is explicitly treated as fallible evidence, not a diagnosis or permanent label. Third-party-provider processing remains subject to the provider account and API terms chosen by the parent/tester. Local encryption cannot control data after an approved request is sent to that provider.

## Gemini API key

The key is:

- entered in the local Settings screen;
- tested before Gemini mode is enabled;
- encrypted using Electron `safeStorage`;
- stored outside learner directories;
- omitted from logs and exports by design.

The key must never be committed to GitHub, placed in `.env`, pasted into chat or included in screenshots.

## Camera and microphone

- microphone permission is associated with the selected learner consent;
- camera permission is off by default;
- local behaviour analysis requires a separate enabled consent flag;
- media permission is enabled only during an active lesson;
- raw audio and raw video storage are forced off in the current implementation;
- camera frames remain in renderer memory and are not uploaded by the camera module;
- only a clamped movement value may be stored.

## Parent controls currently available

- choose camera consent at learner creation;
- choose a parent passphrase;
- lock the learner database;
- open the Memory Inbox;
- see confidence, evidence count and source lesson;
- inspect explained graph relationships and provenance;
- archive a memory from future context;
- restore an archived memory;
- download the complete encrypted learner package;
- import the package on another supported installation;
- remove the Gemini key;
- use deterministic demo mode;
- view stored session summaries.

## Parent controls still required before public release

- edit or correct a stored memory;
- permanently delete individual memories with a defined secure-erasure workflow;
- delete the complete learner and confirm removal;
- configure retention periods;
- change or recover a passphrase;
- verify an export before deleting a local copy;
- explicit transcript-retention controls in the UI;
- review and confirm future parent-authored graph relationships;
- clear data-use and provider disclosures suitable for launch jurisdictions.

## Portability

A `.childmind` package contains the already-encrypted learner database and non-personal technical metadata. Because the Inbox, memory-event ledger and graph are inside that database, they travel in the same package without exposing a separate graph file.

The original parent passphrase is required on the receiving installation. The receiving device creates its own encrypted learner catalogue after successful unlock. Device credentials and Gemini keys do not travel with the learner package.

After import and unlock, MindCarry applies schema migrations, verifies the database, rebuilds the deterministic graph and creates a fresh local context packet.

## Analytics

No product analytics service is configured in the current repository. Child data, transcripts, camera signals, Memory Inbox contents and learner-graph data are not sent to an analytics provider by the implementation.

## Legal and safeguarding boundary

Before use beyond controlled founder-led testing, MindCarry requires jurisdiction-specific privacy, parental-consent, child-safety, safeguarding, model-behaviour and data-retention review. Repository-level technical controls are necessary but not sufficient for compliance.