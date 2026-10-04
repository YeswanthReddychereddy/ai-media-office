import { randomUUID } from "node:crypto";
import { CompanyRepository } from "../src/lib/db";
import { createWorkflow, processNext } from "../src/lib/workflow";
const repo = new CompanyRepository();
repo.seed();
const owner = randomUUID();
if (!repo.acquire(owner)) {
  console.error("Another company worker already owns the studio lease.");
  repo.close();
  process.exit(1);
}
const flow = createWorkflow(repo);
let stopped = false;
const beat = setInterval(() => {
  if (!repo.acquire(owner)) {
    console.error("Worker lease lost; stopping to prevent duplicate work.");
    process.exit(1);
  }
}, 4000);
process.on("SIGTERM", () => {
  stopped = true;
});
process.on("SIGINT", () => {
  stopped = true;
});
console.log(
  "Company worker started. Jobs continue while this process is running. Press Ctrl+C to stop after the current production pass.",
);
async function main() {
  try {
    while (!stopped) {
      const worked = await processNext(repo, flow);
      if (!worked) await new Promise((r) => setTimeout(r, 1000));
      else await new Promise((r) => setTimeout(r, 250));
    }
  } finally {
    clearInterval(beat);
    repo.release(owner);
    repo.close();
    flow.saver.db.close();
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Worker stopped");
  process.exitCode = 1;
});
