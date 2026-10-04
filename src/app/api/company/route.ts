import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorize, checkOrigin } from "@/lib/auth";
import { getRepository } from "@/lib/db";
import type { Agent, Task } from "@/lib/types";
import { OllamaProvider } from "@/lib/providers";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const command = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    title: z.string().trim().min(3).max(140),
    objective: z.string().trim().min(10).max(3000),
  }),
  z.object({
    action: z.enum(["start", "pause", "resume", "cancel", "prioritize"]),
    projectId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("decide"),
    approvalId: z.string().uuid(),
    decision: z.enum(["approve", "reject", "revise"]),
    feedback: z.string().max(3000).default(""),
  }),
  z.object({
    action: z.literal("chat"),
    agentId: z.string().min(1).max(30),
    projectId: z.string().uuid().nullable().optional(),
    message: z.string().trim().min(1).max(3000),
  }),
]);
function failure(e: unknown) {
  const message = e instanceof Error ? e.message : "Request failed";
  const code =
    message === "AUTH_REQUIRED"
      ? 401
      : message.includes("origin") ||
          message.includes("localhost") ||
          message.includes("Loopback")
        ? 403
        : 400;
  return NextResponse.json({ error: message }, { status: code });
}
export async function GET(req: NextRequest) {
  try {
    checkOrigin(req);
    authorize(req);
    return NextResponse.json(getRepository().snapshot(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    checkOrigin(req, true);
    authorize(req);
    if (Number(req.headers.get("content-length") || 0) > 16000)
      throw new Error("Request is too large");
    const text = await req.text();
    if (text.length > 16000) throw new Error("Request is too large");
    const parsed = command.safeParse(JSON.parse(text));
    if (!parsed.success)
      throw new Error("Please check the required fields and try again");
    const cmd = parsed.data,
      r = getRepository();
    if (cmd.action === "create") {
      const id = r.createProject(cmd.title, cmd.objective);
      return NextResponse.json({ ok: true, projectId: id });
    }
    if (cmd.action === "decide") {
      r.decide(cmd.approvalId, cmd.decision, cmd.feedback);
      return NextResponse.json({ ok: true });
    }
    if (cmd.action === "chat") {
      const agent = r.one<Agent>(
        "SELECT * FROM agents WHERE id=?",
        cmd.agentId,
      );
      if (!agent) throw new Error("Employee not found");
      const p = cmd.projectId ? r.project(cmd.projectId) : undefined;
      r.message(agent.id, "founder", cmd.message, p?.id || null);
      const q = cmd.message.toLowerCase();
      let reply = "";
      if (agent.id === "atlas" && q.startsWith("objective:")) {
        const objective = cmd.message.slice(10).trim();
        if (objective.length < 10)
          throw new Error("Give Atlas an objective of at least 10 characters");
        const id = r.createProject(objective.slice(0, 100), objective);
        reply = `I created a project and queued the production plan. The worker will begin research. Project ${id.slice(0, 8)} is now in Operations.`;
      } else if (p && /^(stop this task|pause project)[.!]?$/.test(q)) {
        r.control(p.id, "pause");
        reply =
          "The project is paused. The worker will stop at the next safe node boundary. Saved work is preserved.";
      } else if (p && /escalate to manager/i.test(q)) {
        r.message(
          "atlas",
          "agent",
          `${agent.name} escalated: ${cmd.message}`,
          p.id,
        );
        r.event(
          `${agent.name} escalated a request to Atlas.`,
          p.id,
          agent.id,
          "handoff",
        );
        reply =
          "I sent your request to Atlas. Open the General Manager’s messages to see the handoff.";
      } else if (/source|evidence/.test(q)) {
        const a = p ? r.artifact(p.id, "research", p.revision) : undefined;
        reply = a
          ? `Here is our research evidence:\n${JSON.parse(a.body)
              .sources.map(
                (s: { title: string; url: string; verification: string }) =>
                  `${s.title}\n${s.url}\n${s.verification}`,
              )
              .join("\n\n")}`
          : "No research artifact is available for this project yet. Start production and inspect Research in the project room.";
      } else if (process.env.TEXT_PROVIDER === "ollama") {
        try {
          reply = await new OllamaProvider().reply(
            agent,
            cmd.message,
            JSON.stringify({
              project: p,
              task: agent.task_id
                ? r.one<Task>("SELECT * FROM tasks WHERE id=?", agent.task_id)
                : null,
              artifacts: p
                ? r
                    .snapshot()
                    .artifacts.filter((a) => a.project_id === p.id)
                    .map((a) => ({ kind: a.kind, title: a.title }))
                : [],
            }),
          );
        } catch {
          reply =
            "The local model did not respond. Check OLLAMA_MODEL and your local Ollama service. Your message is saved; no task changes were made.";
        }
      } else if (/rewrite|alternative|send.*research/.test(q)) {
        reply =
          "Demo chat can report state, show sources, pause work, and escalate requests. Semantic rewrites require a connected local model. For a tracked revision, open Founder review and choose Request revision; your feedback and all versions will be preserved.";
      } else if (agent.id === "atlas") {
        const s = r.snapshot();
        reply = `I’m coordinating ${s.projects.filter((x) => !["complete", "cancelled", "rejected"].includes(x.status)).length} active projects. ${s.approvals.filter((a) => a.status === "pending").length} packages need your decision. ${s.projects.filter((x) => x.status === "failed").length} projects are blocked. ${p ? `“${p.title}” is ${p.status.replaceAll("_", " ")} at ${p.stage}.` : ""}\n\n${s.worker.alive ? "The worker is online." : "The worker is offline. Start npm run worker in a separate terminal to process jobs."}\n\nGive me a new objective using “Objective: …”, or use New production. This is a state-aware demo response.`;
      } else {
        const t = agent.task_id
          ? r.one<Task>("SELECT * FROM tasks WHERE id=?", agent.task_id)
          : undefined;
        reply = `I’m ${agent.name}, your AI ${agent.role}. ${t ? `My current assignment is “${t.title}” (${t.status.toLowerCase()}).` : agent.status === "OFFLINE" ? "My department is planned for a later milestone; I’m not running production work yet." : "I’m available for the next assignment from Atlas."} ${p ? `This project is at ${p.stage}.` : ""}\n\nMy specialty is ${agent.specialty.toLowerCase()}. Ask “Show me your sources” to inspect available evidence. This is a state-aware demo response.`;
      }
      r.message(agent.id, "agent", reply, p?.id || null);
      return NextResponse.json({ ok: true, reply });
    }
    r.control(cmd.projectId, cmd.action);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
