# Security

Run only on 127.0.0.1. Local mode grants the person using this computer Founder authority. Set FOUNDER_PASSWORD and SESSION_SECRET for the optional signed HttpOnly cookie authentication shell. This is not a multi-user production identity system. All API requests enforce loopback Host and same-origin mutation checks; approvals are validated server-side. Deployment beyond localhost is intentionally rejected.

No provider keys are required. Never commit .env files, databases, cookies, accounts, real user messages, or source uploads. .env.example has placeholders only. Artifacts and event text render as text; no arbitrary HTML execution. User input is validated and database writes use bound parameters.

Founder actions: approve, reject, request revision, prioritize, pause/resume and cancel. Approval does not publish content. No outbound publishing, messaging, purchasing, advertising, account changes, deletion tools or sudo exist in the agent tool set.

The deterministic research bundle is a fixture with attributed public evidence. It does not establish an autonomous source verification service. Optional local model answers are untrusted content, never executable instructions. New objectives are stored but cannot claim verified factual completion without supported research.

Report a suspected secret privately to the repository owner; do not paste it into a public issue. Before public pushes run npm run scan:secrets (working tree and every reachable Git blob), and review staged diffs. The scanner is a defense in depth check, not a guarantee.
