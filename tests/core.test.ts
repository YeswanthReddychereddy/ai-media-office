import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CompanyRepository } from "../src/lib/db";
import { createWorkflow, processNext } from "../src/lib/workflow";
import {
  judgeIdeas,
  submitIdea,
  productionOutput,
  CRITERIA,
} from "../src/lib/providers";
import { ProviderLimitError } from "../src/lib/provider-limit";
import { Command } from "@langchain/langgraph";
import {
  checkOrigin,
  validSession,
  makeSession,
  passwordMatches,
} from "../src/lib/auth";
import { NextRequest } from "next/server";
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "media-office-test-"));
  const db = join(dir, "company.sqlite"),
    checkpoint = join(dir, "checkpoint.sqlite");
  const repo = new CompanyRepository(db);
  repo.seed();
  const flow = createWorkflow(repo, checkpoint, 0);
  return {
    dir,
    db,
    checkpoint,
    repo,
    flow,
    close() {
      repo.close();
      flow.saver.db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
test("persistent plan, agent roles, task assignment and messages survive reopening", () => {
  const f = fixture();
  try {
    const p = f.repo.snapshot().projects[0];
    assert.equal(f.repo.snapshot().agents.length, 16);
    assert.equal(f.repo.snapshot().tasks.length, 13);
    assert.equal(
      f.repo.snapshot().tasks.find((t) => t.stage === "research")
        ?.assigned_agent,
      "maya",
    );
    f.repo.message("maya", "founder", "Show me the evidence.", p.id);
    const reopened = new CompanyRepository(f.db);
    assert.equal(reopened.snapshot().messages[0].body, "Show me the evidence.");
    assert.equal(reopened.snapshot().projects[0].id, p.id);
    reopened.close();
  } finally {
    f.close();
  }
});
test("blind independent entries and five judges cover all thirteen criteria", () => {
  const brief = {
    objective: "Explain lightning and thunder",
    revision: 1,
    feedback: [],
  };
  const entries = Array.from({ length: 5 }, (_, i) => submitIdea(i, brief));
  assert.equal(new Set(entries.map((e) => e.angle)).size, 5);
  assert.ok(entries.every((e) => !("competitors" in e)));
  const jury = judgeIdeas(entries);
  assert.equal(jury.rankings.length, 5);
  assert.equal(jury.rankings[0].votes.length, 5);
  assert.equal(
    Object.keys(jury.rankings[0].votes[0].scores).length,
    CRITERIA.length,
  );
  assert.throws(() => judgeIdeas(entries.slice(0, 4)));
});
test("quality gates reject missing evidence, missing artifacts and early approval", () => {
  const f = fixture();
  try {
    const p = f.repo.snapshot().projects[0];
    assert.throws(() =>
      productionOutput(
        "facts",
        p,
        {
          research: {
            claims: [{ id: "fake", source: "missing" }],
            sources: [],
          },
        },
        [],
      ),
    );
    assert.throws(() => f.repo.requireApproval(p.id, 1), /Quality gate/);
    assert.throws(() => f.repo.decide("does-not-exist", "approve", ""));
    const t = f.repo.snapshot().tasks.find((t) => t.stage === "hooks")!;
    assert.throws(() => f.repo.begin(p.id, "hooks", 1), /handoff/);
    assert.equal(
      f.repo.one<{ status: string }>(
        "SELECT status FROM tasks WHERE id=?",
        t.id,
      )?.status,
      "QUEUED",
    );
  } finally {
    f.close();
  }
});
test("LangGraph persists Founder interrupt, resumes after restart and never duplicates artifacts", async () => {
  const f = fixture();
  try {
    const p = f.repo.snapshot().projects[0];
    f.repo.control(p.id, "start");
    await f.flow.run(p.id);
    assert.equal(f.repo.project(p.id).status, "awaiting_approval");
    const before = f.repo.snapshot().artifacts.length;
    const approval = f.repo.snapshot().approvals[0];
    const config = { configurable: { thread_id: `${p.id}:1` } };
    assert.ok(
      (await f.flow.graph.getState(config)).tasks.some(
        (t) => t.interrupts?.length,
      ),
    );
    const second = new CompanyRepository(f.db),
      resumed = createWorkflow(second, f.checkpoint, 0);
    second.decide(approval.id, "approve", "Clear question; approved.");
    await resumed.run(p.id);
    assert.equal(second.project(p.id).status, "complete");
    assert.equal(second.snapshot().artifacts.length, before);
    assert.equal(
      second.snapshot().tasks.filter((t) => t.status === "COMPLETE").length,
      13,
    );
    assert.equal(second.snapshot().memory.length, 1);
    assert.equal(
      second.snapshot().artifacts.find((a) => a.kind === "review")?.approved,
      1,
    );
    resumed.saver.db.close();
    second.close();
    assert.throws(
      () => f.repo.decide(approval.id, "approve", ""),
      /no longer pending/,
    );
  } finally {
    f.close();
  }
});
test("forged graph resume cannot bypass server approval", async () => {
  const f = fixture();
  try {
    const p = f.repo.snapshot().projects[0];
    f.repo.control(p.id, "start");
    await f.flow.run(p.id);
    await assert.rejects(
      () =>
        f.flow.graph.invoke(new Command({ resume: true }), {
          configurable: { thread_id: `${p.id}:1` },
        }),
      /Founder approval/,
    );
    assert.equal(f.repo.project(p.id).status, "awaiting_approval");
  } finally {
    f.close();
  }
});
test("revision preserves old artifacts and carries Founder feedback into a new blind round", async () => {
  const f = fixture();
  try {
    const p = f.repo.snapshot().projects[0];
    f.repo.control(p.id, "start");
    await f.flow.run(p.id);
    const approval = f.repo.snapshot().approvals[0];
    const old = f.repo.artifact(p.id, "idea-a", 1)!;
    assert.throws(() => f.repo.decide(approval.id, "revise", ""), /feedback/);
    f.repo.decide(approval.id, "revise", "Make the explanation quieter.");
    assert.equal(f.repo.project(p.id).revision, 2);
    await f.flow.run(p.id);
    assert.equal(f.repo.artifact(p.id, "idea-a", 1)?.body, old.body);
    assert.ok(
      JSON.parse(
        f.repo.artifact(p.id, "idea-a", 2)!.body,
      ).founderFeedback[0].includes("quieter"),
    );
    assert.equal(
      f.repo.snapshot().approvals.filter((a) => a.status === "pending").length,
      1,
    );
  } finally {
    f.close();
  }
});
test("pause interrupts at a safe boundary, restart resumes the saved work", async () => {
  const f = fixture();
  let slow: ReturnType<typeof createWorkflow> | undefined;
  try {
    const p = f.repo.snapshot().projects[0];
    f.repo.control(p.id, "start");
    slow = createWorkflow(f.repo, f.checkpoint, 60);
    const running = slow.run(p.id);
    await new Promise((r) => setTimeout(r, 25));
    f.repo.control(p.id, "pause");
    await assert.rejects(() => running, /PROJECT_STOPPED/);
    assert.equal(f.repo.project(p.id).status, "paused");
    f.repo.control(p.id, "resume");
    await f.flow.run(p.id);
    assert.equal(f.repo.project(p.id).status, "awaiting_approval");
    const counts = f.repo.all<{ kind: string; n: number }>(
      "SELECT kind,COUNT(*) n FROM artifacts WHERE project_id=? GROUP BY kind",
      p.id,
    );
    assert.ok(counts.every((x) => x.n === 1));
  } finally {
    slow?.saver.db.close();
    f.close();
  }
});
test("cancel stops queued tasks and cannot be resumed", async () => {
  const f = fixture();
  try {
    const p = f.repo.snapshot().projects[0];
    f.repo.control(p.id, "start");
    f.repo.control(p.id, "cancel");
    assert.equal(f.repo.next(), undefined);
    assert.ok(f.repo.snapshot().tasks.every((t) => t.status === "CANCELLED"));
    assert.throws(() => f.repo.control(p.id, "resume"));
    await assert.rejects(() => f.flow.run(p.id), /PROJECT_STOPPED/);
  } finally {
    f.close();
  }
});
test("transient failure retries a saved stage and stops at the bounded attempt limit", async () => {
  const f = fixture();
  try {
    const p = f.repo.snapshot().projects[0];
    f.repo.control(p.id, "start");
    const save = f.repo.saveArtifact.bind(f.repo);
    f.repo.saveArtifact = () => {
      throw new Error("Temporary provider failure");
    };
    await processNext(f.repo, f.flow);
    assert.equal(f.repo.project(p.id).status, "queued");
    await processNext(f.repo, f.flow);
    await processNext(f.repo, f.flow);
    assert.equal(f.repo.project(p.id).status, "failed");
    assert.equal(
      f.repo.snapshot().tasks.find((t) => t.stage === "research")?.attempt,
      3,
    );
    f.repo.saveArtifact = save;
    f.repo.control(p.id, "resume");
    await processNext(f.repo, f.flow);
    assert.equal(f.repo.project(p.id).status, "awaiting_approval");
  } finally {
    f.close();
  }
});
test("unsupported topics block honestly and do not acquire invented research", async () => {
  const f = fixture();
  try {
    const id = f.repo.createProject(
      "A different topic",
      "Explain the history of ceramic pottery.",
    );
    await processNext(f.repo, f.flow);
    assert.equal(f.repo.project(id).status, "failed");
    assert.match(f.repo.project(id).error!, /only contains verified/);
    assert.equal(f.repo.snapshot().artifacts.length, 0);
  } finally {
    f.close();
  }
});
test("single-worker lease prevents concurrent ownership and permits stale recovery", async () => {
  const f = fixture();
  try {
    assert.equal(f.repo.acquire("worker-a", 5), true);
    assert.equal(f.repo.acquire("worker-b"), false);
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(f.repo.acquire("worker-b"), true);
    f.repo.release("worker-a");
    assert.equal(f.repo.snapshot().worker.alive, true);
    f.repo.release("worker-b");
    assert.equal(f.repo.snapshot().worker.alive, false);
  } finally {
    f.close();
  }
});
test("loopback, CSRF, expiring signed sessions and password comparison", () => {
  const previous = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = "test-only-".repeat(5);
  const oldPassword = process.env.FOUNDER_PASSWORD;
  process.env.FOUNDER_PASSWORD = "test-passphrase";
  try {
    assert.doesNotThrow(() =>
      checkOrigin(
        new NextRequest("http://localhost:3000/api/company", {
          headers: { host: "localhost:3000", origin: "http://localhost:3000" },
        }),
        true,
      ),
    );
    assert.throws(() =>
      checkOrigin(
        new NextRequest("http://localhost:3000/api/company", {
          headers: { host: "localhost:3000", origin: "https://evil.example" },
        }),
        true,
      ),
    );
    assert.throws(() =>
      checkOrigin(
        new NextRequest("http://localhost:3000/api/company", {
          headers: { host: "evil.example" },
        }),
      ),
    );
    assert.throws(() =>
      checkOrigin(
        new NextRequest("http://localhost:3000/api/company", {
          headers: { host: "localhost:3000" },
        }),
        true,
      ),
    );
    const token = makeSession();
    assert.equal(validSession(token), true);
    assert.equal(validSession(token + "x"), false);
    assert.equal(validSession("1.expired.invalid"), false);
    assert.equal(passwordMatches("wrong"), false);
    assert.equal(passwordMatches("test-passphrase"), true);
  } finally {
    if (previous === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previous;
    if (oldPassword === undefined) delete process.env.FOUNDER_PASSWORD;
    else process.env.FOUNDER_PASSWORD = oldPassword;
  }
});

test("usage limits hold persisted work without automatic retries or a paid fallback", async () => {
  const f = fixture();
  f.flow.saver.db.close();
  let calls = 0;
  let limited = true;
  const generate = async (...args: Parameters<typeof productionOutput>) => {
    calls++;
    if (args[0] === "idea-b" && limited) throw new ProviderLimitError();
    return productionOutput(...args);
  };
  let flow = createWorkflow(f.repo, f.checkpoint, 0, generate);
  try {
    const p = f.repo.snapshot().projects[0];
    f.repo.control(p.id, "start");
    await processNext(f.repo, flow);
    assert.equal(f.repo.project(p.id).status, "paused");
    assert.match(f.repo.project(p.id).error!, /No paid fallback/);
    assert.equal(
      f.repo.snapshot().tasks.find((t) => t.stage === "idea-b")?.status,
      "WAITING",
    );
    assert.equal(
      f.repo.snapshot().tasks.find((t) => t.stage === "idea-b")?.attempt,
      0,
    );
    const before = calls;
    const artifacts = f.repo.snapshot().artifacts;
    assert.equal(artifacts.length, 3);
    for (let i = 0; i < 4; i++)
      assert.equal(await processNext(f.repo, flow), false);
    assert.equal(calls, before);
    flow.saver.db.close();
    const reopened = new CompanyRepository(f.db);
    flow = createWorkflow(reopened, f.checkpoint, 0, generate);
    assert.equal(await processNext(reopened, flow), false);
    limited = false;
    reopened.control(p.id, "resume");
    await processNext(reopened, flow);
    assert.equal(reopened.project(p.id).status, "awaiting_approval");
    for (const a of artifacts)
      assert.equal(reopened.artifact(p.id, a.kind, 1)?.id, a.id);
    reopened.close();
  } finally {
    flow.saver.db.close();
    f.repo.close();
    rmSync(f.dir, { recursive: true, force: true });
  }
});
