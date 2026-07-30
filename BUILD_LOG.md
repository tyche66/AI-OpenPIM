# AI OpenPIM Build Log

## Current Release

- Version: v1.8.5
- Source sync: private v1.8.5 codebase copied into this open-source repository with runtime secrets, private paths, customer data, private assets, local logs, certificates, dependency directories and build artifacts excluded.
- Public defaults: AI adapter remains environment-driven; real API keys and production credentials must be supplied outside Git.
- Sanitization status: project naming, sample data, environment examples and release scripts use public placeholders.

## Verification Scope

- Backend source and tests are expected to run from `backend/`.
- Frontend source and tests are expected to run from `frontend/`.
- Portal source and tests are expected to run from `portal/`.
- Release checks include lint/typecheck/test/build, Docker Compose static validation and `scripts/secret_scan.sh`.

## Notes

- Do not commit `.env`, provider keys, database dumps, local logs, TLS keys/certificates, `node_modules/`, `dist/`, `docker/volumes/`, or private customer sample files.
- Seed and demo data in the open-source repository must remain generic placeholder content.
