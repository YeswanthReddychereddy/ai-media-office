/** Independent macOS service. No Codex process, API key, or cloud subscription. */
import { spawn } from "node:child_process";
import {
  readFileSync,
  realpathSync,
  mkdirSync,
  openSync,
  closeSync,
  existsSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
export function startStudio(supportDirectory) {
  const support = resolve(supportDirectory);
  const config = JSON.parse(
    readFileSync(join(support, "desktop-config.json"), "utf8"),
  );
  const root = join(support, "app"),
    logDir = join(support, "logs");
  mkdirSync(logDir, { recursive: true });
  const env = {
    ...process.env,
    DATABASE_PATH: join(support, "data/company.sqlite"),
    CHECKPOINT_PATH: join(support, "data/checkpoints.sqlite"),
    TEXT_PROVIDER: config.localModel ? "ollama" : "demo",
    PRODUCTION_PROVIDER: config.localModel ? "ollama" : "demo",
    OLLAMA_MODEL: config.model || "qwen3:1.7b",
    OLLAMA_URL: `http://127.0.0.1:${config.modelPort || 11435}`,
    OLLAMA_HOST: `127.0.0.1:${config.modelPort || 11435}`,
    OLLAMA_MODELS: join(support, "models"),
    OLLAMA_NO_CLOUD: "1",
    OLLAMA_MAX_LOADED_MODELS: "1",
    OLLAMA_NUM_PARALLEL: "1",
    OLLAMA_CONTEXT_LENGTH: "4096",
    NEXT_TELEMETRY_DISABLED: "1",
    STUDIO_DESKTOP: "1",
    WORKER_STEP_MS: "250",
  };
  // Next and worker load the same optional private Founder settings.
  const secretEnv = join(support, ".env");
  if (existsSync(secretEnv)) process.loadEnvFile(secretEnv);
  if (process.env.FOUNDER_PASSWORD)
    env.FOUNDER_PASSWORD = process.env.FOUNDER_PASSWORD;
  if (process.env.SESSION_SECRET)
    env.SESSION_SECRET = process.env.SESSION_SECRET;
  const children = new Map();
  const timers = new Set();
  let stopping = false;
  function start(name, executable, args) {
    if (stopping) return;
    const log = join(logDir, `${name}.log`);
    if (existsSync(log) && statSync(log).size > 5_000_000)
      renameSync(log, log + ".previous");
    const fd = openSync(log, "a");
    const child = spawn(executable, args, {
      cwd: root,
      env,
      stdio: ["ignore", fd, fd],
    });
    closeSync(fd);
    children.set(name, child);
    child.on("error", (e) => {
      console.error(`${name} could not start: ${e.message}`);
    });
    child.on("close", () => {
      children.delete(name);
      if (!stopping) {
        const timer = setTimeout(() => {
          timers.delete(timer);
          start(name, executable, args);
        }, 5000);
        timers.add(timer);
      }
    });
  }
  if (config.localModel)
    start("model", join(support, "runtime/ollama/ollama"), ["serve"]);
  start("web", process.execPath, [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(config.port || 4318),
  ]);
  start("worker", process.execPath, ["--import", "tsx", "scripts/worker.ts"]);
  // -s prevents system sleep on AC power, permits display sleep, does not defeat lid closure.
  if (config.keepAwakeOnPower) start("awake", "/usr/bin/caffeinate", ["-s"]);
  const heartbeat = setInterval(
    () =>
      writeFileSync(
        join(support, "service-status.json"),
        JSON.stringify({
          updatedAt: new Date().toISOString(),
          processes: Object.fromEntries(
            [...children].map(([name, child]) => [name, child.pid]),
          ),
          pid: process.pid,
        }),
      ),
    5000,
  );
  function stop() {
    if (stopping) return;
    stopping = true;
    clearInterval(heartbeat);
    for (const timer of timers) clearTimeout(timer);
    for (const child of children.values()) child.kill("SIGTERM");
    const timeout = setTimeout(() => {
      for (const child of children.values()) child.kill("SIGKILL");
    }, 10000);
    timeout.unref();
  }
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  console.log(
    "AI Media Office background service ready. Local-only execution; no Codex dependency.",
  );

  return { children, stop };
}
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === realpathSync(process.argv[1])
) {
  startStudio(process.env.STUDIO_SUPPORT || process.argv[2] || ".");
}
