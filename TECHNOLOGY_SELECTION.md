# Technology selection

Reviewed upstream root LICENSE and README on 2026-10-04 before adoption. This is an engineering evaluation, not a blanket license grant for every optional dependency or asset.

| Repository | Inspected license | Decision |
|---|---|---|
| [crewAIInc/crewAI](https://github.com/crewAIInc/crewAI) | MIT | Study only: role-based teams, manager delegation; avoid a second orchestration runtime. |
| [langchain-ai/langgraph](https://github.com/langchain-ai/langgraph) | MIT | Selected: explicit graph stages, checkpoints and resumable work; use the JS package. |
| [langchain-ai/deepagents](https://github.com/langchain-ai/deepagents) | MIT | Study only: scoped long-horizon plans; defer filesystem agents. |
| [OpenHands/OpenHands](https://github.com/OpenHands/OpenHands) | MIT at inspected root | Study only: Agent Canvas conversations, workspace activity, job visibility. No UI/assets copied. Recheck any enterprise subtree before reuse. |
| [FoundationAgents/MetaGPT](https://github.com/FoundationAgents/MetaGPT) | MIT | Study only: SOPs and company structure, per Founder instruction. |
| [VRSEN/agency-swarm](https://github.com/VRSEN/agency-swarm) | MIT | Study only: directional communication; enforce manager-owned assignments. |
| [microsoft/agent-framework](https://github.com/microsoft/agent-framework) | MIT | Study only: hosting and human control; defer MCP/A2A integration. |
| [vercel/next.js](https://github.com/vercel/next.js) | MIT | Selected application framework and server route handlers. |
| [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | MIT | Reference for accessible panel composition; use Radix primitives with original authored UI, no copied registry components. |
| [xyflow/xyflow](https://github.com/xyflow/xyflow) | MIT | Selected organization/dependency graph library. |
| [FFmpeg/FFmpeg](https://github.com/FFmpeg/FFmpeg) | LGPL-2.1+; optional GPL/nonfree changes | Deferred: future subprocess inspection/export, audit actual build configuration first. |
| [Zulko/moviepy](https://github.com/Zulko/moviepy) | MIT | Deferred: Python compositing once timeline requirements are concrete. |
| [ManimCommunity/manim](https://github.com/ManimCommunity/manim) | MIT; community notice also applies | Deferred: specialist animation worker; no installation or assets copied. |
| [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper) | MIT | Deferred: local transcription; separately audit model and native dependency licenses. |

SQLite is suitable for a single local Founder and worker. Use WAL, bound SQL, leases and repository methods; migrate to Postgres before multiple-host deployment. The workflow uses the official TypeScript LangGraph implementation to keep this vertical slice in one language. No huge models or media runtimes are installed.
