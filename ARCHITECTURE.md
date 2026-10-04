# Architecture

Browser → Next.js route handlers → CompanyRepository → SQLite (WAL).
Separate Node worker → leased job queue → LangGraph → SQLite checkpoints.

The web process never runs production jobs. Closing a browser does not stop the worker; closing the worker does. Local uninterrupted operation requires both processes and an awake computer. No cloud deployment is implied.

The queue owns scheduling, retries, dependencies, task attempts and worker leases. LangGraph owns the production state transitions and persists checkpoints. Node side effects are idempotent with project/stage/version keys. Founder approval is a separate authenticated transaction and never a prompt instruction. Artifacts are immutable versions. Postgres can replace repository methods and use a Postgres checkpointer; do not share SQLite across multiple hosts.

Company data: projects, employees, jobs, artifacts, approvals, messages, events, memory, worker heartbeat. Checkpoints live in a separate SQLite file. One active worker is supported in this slice, protected by a database lease. Stale leases permit recovery after a crash. Project pause and cancel are observed at node boundaries.

Provider boundary: a no-cost deterministic demo provider and optional local Ollama conversations. Images, video, music, voice and analytics have typed interfaces only; not activated integrations. No framework has unrestricted tools, shell access, or publishing credentials.

Planned production extension: identity provider, per-Founder ownership, Postgres, object storage, durable cloud workers, observability, paid-provider budgets, media inspection and human-reviewed account connections. This local single-Founder slice must not be exposed publicly.
