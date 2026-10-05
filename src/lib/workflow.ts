import {
  Annotation,
  StateGraph,
  START,
  END,
  interrupt,
  Command,
} from "@langchain/langgraph";
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { CompanyRepository, now } from "./db";
import { STAGES, type Task, type Artifact } from "./types";
import { productionOutput } from "./providers";
import { localProduction } from "./local-production";
import { ProviderLimitError } from "./provider-limit";
const State = Annotation.Root({
  projectId: Annotation<string>(),
  revision: Annotation<number>(),
  completed: Annotation<string>(),
});
export function createWorkflow(
  repo: CompanyRepository,
  checkpointPath = process.env.CHECKPOINT_PATH || "./data/checkpoints.sqlite",
  delay = Number(process.env.WORKER_STEP_MS ?? 2200),
  generate: typeof localProduction = async (...args) =>
    process.env.PRODUCTION_PROVIDER === "ollama"
      ? localProduction(...args)
      : productionOutput(...args),
) {
  if (checkpointPath !== ":memory:")
    mkdirSync(dirname(resolve(checkpointPath)), { recursive: true });
  const saver = SqliteSaver.fromConnString(checkpointPath);
  const graph = new StateGraph<
    typeof State.spec,
    typeof State.State,
    typeof State.Update,
    string
  >(State);
  for (const [stage, title] of STAGES) {
    graph.addNode(stage, async (state: typeof State.State) => {
      let p = repo.project(state.projectId);
      if (
        p.revision !== state.revision ||
        ["paused", "cancelled", "rejected"].includes(p.status)
      )
        throw new Error("PROJECT_STOPPED");
      if (stage === "founder") {
        const existing = repo.artifact(p.id, "review", p.revision);
        if (!existing) repo.requireApproval(p.id, p.revision);
        // Always encounter the same interrupt on replay. A resume value alone grants no permission.
        interrupt({
          kind: "founder-review",
          projectId: p.id,
          revision: p.revision,
        });
        p = repo.project(p.id);
        const approved = repo.one<{ status: string }>(
          "SELECT status FROM approvals WHERE artifact_id=?",
          repo.artifact(p.id, "review", p.revision)!.id,
        );
        if (p.status !== "approved" || approved?.status !== "approve")
          throw new Error("Founder approval is required");
        repo.db.transaction(() => {
          const task = repo.one<Task>(
            "SELECT * FROM tasks WHERE project_id=? AND stage=? AND revision=?",
            p.id,
            stage,
            p.revision,
          )!;
          repo.finish(task, repo.artifact(p.id, "review", p.revision)!);
          repo.run(
            "UPDATE projects SET status='complete',stage='concept-approved',updated_at=? WHERE id=?",
            now(),
            p.id,
          );
          repo.event(
            "Concept approved and safely saved. Final video production is a future milestone; nothing was published.",
            p.id,
            "atlas",
            "complete",
          );
        })();
        return { completed: stage };
      }
      const task = repo.begin(p.id, stage, p.revision);
      if (task.status === "COMPLETE") return { completed: stage };
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
      p = repo.project(p.id);
      if (
        p.revision !== state.revision ||
        ["paused", "cancelled", "rejected"].includes(p.status)
      )
        throw new Error("PROJECT_STOPPED");
      const artifacts = repo.all<Artifact>(
        "SELECT * FROM artifacts WHERE project_id=? AND version=?",
        p.id,
        p.revision,
      );
      // Entries are blind: only the brief and Founder feedback reach submitIdea.
      const inputs = stage.startsWith("idea-")
        ? {}
        : Object.fromEntries(
            artifacts.map((a) => [a.kind, JSON.parse(a.body)]),
          );
      const feedback = repo
        .all<{ body: string }>(
          "SELECT body FROM memory WHERE project_id=? AND category=?",
          p.id,
          "Founder feedback",
        )
        .map((m) => m.body);
      const output = await generate(stage, p, inputs, feedback);
      repo.db.transaction(() => {
        const a = repo.saveArtifact(p.id, stage, title, output, p.revision);
        repo.finish(task, a);
      })();
      return { completed: stage };
    });
  }
  // Dynamic stage list retains a single tested sequential dependency graph.
  const builder = graph;
  builder.addEdge(START, STAGES[0][0]);
  for (let i = 0; i < STAGES.length - 1; i++)
    builder.addEdge(STAGES[i][0], STAGES[i + 1][0]);
  builder.addEdge("founder", END);
  const compiled = graph.compile({ checkpointer: saver });
  return {
    saver,
    graph: compiled,
    async run(projectId: string) {
      const p = repo.project(projectId);
      const config = {
        configurable: { thread_id: `${p.id}:${p.revision}` },
        recursionLimit: 40,
      };
      const saved = await compiled.getState(config);
      const input =
        p.status === "approved"
          ? new Command({ resume: true })
          : saved.values?.projectId
            ? null
            : { projectId: p.id, revision: p.revision, completed: "" };
      return compiled.invoke(input, config);
    },
  };
}
export async function processNext(
  repo: CompanyRepository,
  workflow: ReturnType<typeof createWorkflow>,
) {
  const p = repo.next();
  if (!p) return false;
  try {
    await workflow.run(p.id);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "The department could not finish its task";
    if (message.includes("PROJECT_STOPPED")) return true;
    repo.db.transaction(() => {
      const task = repo.one<Task>(
        "SELECT * FROM tasks WHERE project_id=? AND revision=? AND status='WORKING' ORDER BY updated_at DESC LIMIT 1",
        p.id,
        p.revision,
      );
      if (err instanceof ProviderLimitError) {
        repo.run(
          "UPDATE projects SET status='paused',error=?,updated_at=? WHERE id=?",
          message,
          now(),
          p.id,
        );
        if (task) {
          repo.run(
            "UPDATE tasks SET status='WAITING',attempt=MAX(0,attempt-1),error=?,updated_at=? WHERE id=?",
            message,
            now(),
            task.id,
          );
          repo.run(
            "UPDATE agents SET status='WAITING' WHERE id=?",
            task.assigned_agent,
          );
        }
        repo.event(
          message,
          p.id,
          task?.assigned_agent || "atlas",
          "usage-limit",
        );
        return;
      }
      const failed =
        !task || task.attempt >= 3 || message.startsWith("Research is blocked");
      repo.run(
        "UPDATE projects SET status=?,error=?,updated_at=? WHERE id=?",
        failed ? "failed" : "queued",
        message.slice(0, 700),
        now(),
        p.id,
      );
      if (task) {
        repo.run(
          "UPDATE tasks SET status=?,error=?,updated_at=? WHERE id=?",
          failed ? "FAILED" : "QUEUED",
          message.slice(0, 700),
          now(),
          task.id,
        );
        repo.run(
          "UPDATE agents SET status=?,task_id=? WHERE id=?",
          failed ? "BLOCKED" : "QUEUED",
          task.id,
          task.assigned_agent,
        );
      }
      repo.event(
        failed
          ? message
          : "The department hit a temporary problem. Atlas will retry the saved task.",
        p.id,
        task?.assigned_agent || "atlas",
        failed ? "blocked" : "retry",
      );
    })();
  }
  return true;
}
