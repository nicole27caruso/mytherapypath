# MyTherapyPath — Project Documentation

Complete operational and usage documentation for MyTherapyPath, a home-exercise
adherence platform bridging in-clinic occupational therapy sessions and
at-home practice.

## Table of Contents

1. [Production Support & Testing Scenarios](01-production-support.md)
   Service dependency diagram, monitoring, common incidents & recovery steps,
   unit/integration/manual/smoke test results.
2. [System Setup Instructions](02-system-setup.md)
   Step-by-step setup for the database, backend, therapist web app, and client
   mobile app, from a clean machine.
3. [Issue Diagnosis, Research, Resolution, and Sharing](03-issue-diagnosis.md)
   Four real issues encountered during development — description, diagnosis,
   research process, resolution, and verification for each.
4. [System Usage Guide](04-usage-guide.md)
   End-user instructions for therapists and clients — no coding knowledge assumed.
5. [Architecture Diagram](05-architecture-diagram.md)
   Component diagram, deployment/CI-CD flow, and environment summary.

## Supplementary Reference Docs

These pre-date the sections above and go deeper on specific topics; the sections
above are the authoritative, current source if anything conflicts:

- [`api-documentation.md`](api-documentation.md) — full REST endpoint reference
- [`database-design.md`](database-design.md) — entity/table reference (note: written
  before several schema changes documented in Issue Diagnosis and System Setup;
  cross-check against `apps/backend/app/models.py` for the current source of truth)
- [`test-cases.md`](test-cases.md) — earlier API test pass, superseded by the
  Testing Scenarios in Production Support for current endpoint behavior

## Deployment Pipeline Overview

Three independent GitHub Actions workflows, each triggered on every push to
`main`, deploy the three applications separately (see the CI/CD diagram in
[Architecture Diagram](05-architecture-diagram.md#deployment--ci-cd-flow)). There
are no manual approval gates and no staging environment — every push to `main`
goes straight to production. There is no automated rollback; reverting means
pushing a new commit that undoes the change (or, for the frontends, redeploying
a prior commit via `workflow_dispatch`). Database migrations are **not** part of
any pipeline and must be run manually — see
[System Setup](02-system-setup.md#2-backend-fastapi) and the "migration not
applied" incident in [Production Support](01-production-support.md#4-backend-deployed-code-expects-a-database-column-that-doesnt-exist-yet).

## Security Considerations

- **Authentication:** the therapist side currently has no login (single hardcoded
  therapist for this milestone). The client side uses a simple access code with no
  password, by design, for accessibility.
- **Authorization:** not yet enforced beyond the therapist/client split at the API
  route level — there is no per-therapist data isolation since only one therapist
  exists.
- **PHI/privacy:** submission media (photos/video of clients) is stored in Blob
  Storage without encryption-at-rest guarantees confirmed, and there is no audit
  logging of who viewed what. A specific privacy control that **is** implemented:
  exercise-library videos recorded of a specific client are flagged and excluded
  from every other client's program until re-recorded (see Issue Diagnosis and
  Usage Guide).
- **Known gap:** real multi-therapist authentication and HIPAA-aligned data
  handling (audit logs, encryption guarantees, a signed BAA-ready hosting
  configuration) are explicitly on the roadmap, not yet built. This is stated
  plainly rather than implied as "handled" — see the capstone presentation's
  Status & Roadmap slide for the same acknowledgment.
