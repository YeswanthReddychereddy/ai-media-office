// Dedicated, disposable databases. Never touch the normal local company.
import { rmSync } from "node:fs";
import { spawn } from "node:child_process";
for (const prefix of ["e2e-company.sqlite", "e2e-checkpoints.sqlite"])
  for (const suffix of ["", "-wal", "-shm"])
    rmSync(`./data/${prefix}${suffix}`, { force: true });
const env = {
  ...process.env,
  DATABASE_PATH: "./data/e2e-company.sqlite",
  CHECKPOINT_PATH: "./data/e2e-checkpoints.sqlite",
  WORKER_STEP_MS: "100",
  FOUNDER_PASSWORD: "",
  SESSION_SECRET: "",
  NEXT_TELEMETRY_DISABLED: "1",
};
const web = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3001",
  ],
  { stdio: "inherit", env },
);
const worker = spawn(
  process.execPath,
  ["--import", "tsx", "scripts/worker.ts"],
  { stdio: "inherit", env },
);
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  web.kill("SIGTERM");
  worker.kill("SIGTERM");
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
web.on("exit", () => {
  stop();
});
worker.on("exit", () => {
  stop();
});
