# Gemini API test checklist

Use a revocable test key and synthetic learner data only.

1. Launch MindCarry from the verified `main` installation.
2. Open **Settings** and confirm an accepted secure-storage backend.
3. Paste the key only in the masked local field.
4. Select **Save securely and test Gemini**.
5. Confirm provider/model status.
6. Deliberately answer one lesson question incorrectly.
7. Confirm a short relevant explanation appears.
8. Confirm correctness/mastery remain deterministic.
9. Inspect synthetic request evidence and confirm the child name and complete DB/graph are absent.
10. Test offline/revoked/rate-limited behaviour and confirm deterministic fallback.
11. Remove the key and confirm demo mode.
12. Confirm the key is absent from logs, learner folders and `.childmind` exports.

Never paste the key into GitHub, source, `.env`, screenshots, chat or this document.