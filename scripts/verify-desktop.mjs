/** Integration check against a staged installation; never point this at live user data. */
import { startStudio } from "./desktop-supervisor.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const support = process.argv[2];
if (!support) throw new Error("Pass a staged support directory");
const config = JSON.parse(
  readFileSync(join(support, "desktop-config.json"), "utf8"),
);
assert.equal(config.paidFallback, false);
assert.equal(config.localModel, false);
const service = startStudio(support);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function ready(after = 0) {
  for (let i = 0; i < 40; i++) {
    await sleep(1000);
    try {
      const r = await fetch(`http://127.0.0.1:${config.port}/api/company`);
      const data = await r.json();
      if (
        r.ok &&
        data.worker.alive &&
        Date.parse(data.worker.updated_at) > after &&
        service.children.get("worker")
      )
        return data;
    } catch {}
  }
  throw new Error("Studio did not become ready");
}
try {
  const initial = await ready();
  const oldWeb = service.children.get("web");
  const oldWorker = service.children.get("worker");
  const crashedAt = Date.now();
  assert(oldWeb.kill("SIGKILL"));
  assert(oldWorker.kill("SIGKILL"));
  await sleep(6000);
  const restored = await ready(crashedAt + 1000);
  assert.notEqual(service.children.get("web").pid, oldWeb.pid);
  assert.notEqual(service.children.get("worker").pid, oldWorker.pid);
  assert.deepEqual(
    restored.projects.map((p) => p.id),
    initial.projects.map((p) => p.id),
  );
  assert.equal(restored.mode, "Demo studio · no paid APIs");
  console.log(
    "PASS: independent web/worker startup, forced-crash recovery, saved data and no-paid-fallback defaults.",
  );
} finally {
  service.stop();
}
