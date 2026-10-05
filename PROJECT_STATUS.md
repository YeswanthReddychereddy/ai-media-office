# Project status

Updated: 2026-10-04. Scope: Phase 0 and the first vertical slice, not the entire autonomous studio.

## Completed
- New public repository, main/develop/feature branches and pushed milestone commits.
- Fourteen requested repository READMEs and root licenses inspected; architecture and notices documented.
- SQLite company repository: 16 named AI roles, 13 tasks per production, versioned artifacts, conversations, approvals, events, memory and worker lease.
- LangGraph with on-disk SQLite checkpoints, blind idea submissions, rubric judging, source traceability, hooks, concept scripts, storyboard, review and Founder interrupt.
- Thirteen passing automated tests for persistence, gate enforcement, replay, revisions, pause/resume, cancellation, retries, blind entries and request security.
- Next.js production build and TypeScript check pass.
- GitHub CI passed all 12 engine/security tests and 3 browser/API tests. Desktop/mobile screenshots saved.
- Local in-app browser verified chat, evidence, five entries, mobile Founder controls, and refresh persistence.
- Demo currently awaits the Founder’s decision; nothing published.

## Desktop milestone completed
- Native macOS app installed on the Founder’s Desktop, with a bundled Node 22 runtime and per-user login service.
- Staged integration check passed: forced web/worker crashes recovered, saved work survived, and no paid fallback/local model was enabled.
- Installed app visually verified in native WebKit; company worker online with 13 preserved artifacts and one pending Founder review.
- Quitting the app window left the independent service online; reopening reconnected to the same saved studio.
- Provider-limit test pauses persisted unfinished work without retries, then resumes at the saved stage after an explicit Founder action.
- This release includes an experimental, disabled Ollama production adapter; no actual model was downloaded or configured.

## Blocked / future milestones
- Astra/ChatGPT plan sign-in is not connected. Use the official OAuth authorization flow in a later provider milestone; never reuse Codex credentials or fall back to paid API billing.
- Astra does not render video. Heavy video generation needs a supported video provider and remains outside this first concept-workflow slice.
- Arbitrary-topic research, final media production, rights review and publishing integrations remain future work.

## Confirmed Founder policy
- Keep unfinished jobs saved when AI usage is limited; wait for explicit Resume. No extra charges and no automatic paid fallback. Local-model installation is disabled.

## Founder decisions required
- Review the sample concept package when ready. No paid providers or external accounts are needed for this demo.

## Honest boundaries
- Research uses a developer-verified NWS source fixture; no autonomous browsing or ongoing verification.
- Creative entries, judges, hooks and scripts are deterministic examples. Optional Ollama chat exists, but no local model has been configured or validated in this environment.
- Eight production/growth specialists are visible as planned and offline.
- No rendered video, captions, voice, images, paid advertising, analytics connection or publishing pipeline yet.
- Default local Founder access; optional passphrase shell. Not for public deployment or multi-user hosting.
