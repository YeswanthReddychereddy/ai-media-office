# macOS desktop edition

The native Cocoa/WebKit app opens your private studio on `127.0.0.1:4318`. A per-user LaunchAgent runs a bundled Node 22 runtime, the production Next.js server and the persistent worker. Codex is not needed to open the app or run its installed queue.

## Daily use

Open **AI Media Office.app** on your Desktop. Closing its window or choosing Quit leaves the background company running. Use **AI Media Office → Stop Background Company** to stop it, or **Start Background Company** to start it again. It starts automatically at the next login.

The laptop must remain on and logged in. The service prevents system sleep while connected to power; it does not defeat lid closure, shutdown or logout. A sleeping laptop cannot process jobs. Saved work resumes after service restart, except projects paused for your review or usage limits, which need your action.

## No-extra-charges policy

The installed version uses the free deterministic demo. No cloud credentials, Astra connection, paid video provider, model download or paid fallback are configured. An experimental local Ollama production adapter is included in source but is disabled and has not been tested with a real model on this laptop.

The workflow's provider-limit contract pauses unfinished work on disk and waits for an explicit Founder Resume. It does not repeatedly call a limited provider or switch billing methods. A restart/persistence test verifies this with an injected limit at the fourth task. Future subscription and video adapters must map both HTTP and terminal streaming limit errors to that contract before they can be enabled.

Astra is a text/reasoning model, not a video renderer. Real video generation remains a future milestone. Eligible ChatGPT plan use may be connected through the official open-source app OAuth flow after user sign-in; this app does not reuse Codex credentials. No subscription integration is claimed by this release.

## Build and install (Apple Silicon)

Build the web app with Node 22 using `npm ci && npm run build`. Build `MediaOffice.swift` with `swiftc -framework Cocoa -framework WebKit`. Run `package.py --binary <compiled-binary> --output <AI Media Office.app>`.

Then run `install.py --source <repo> --node <Node-22-bin/node> --bundle <AI Media Office.app>`. This creates:

- `~/Desktop/AI Media Office.app`
- `~/Library/Application Support/AI Media Office/` (private databases, runtime, releases and logs)
- `~/Library/LaunchAgents/com.aimediaoffice.studio.plist`

No sudo. Installation requires write access to those destinations. Existing private databases are preserved; an initial install copies the current demo via SQLite backup. Versioned releases and previous app bundles are retained on upgrades. `--stage-only --support <temporary-support> --desktop <temporary-desktop> --agents <temporary-agents>` prepares an installation without registering it.

The supervisor restarts crashed web/worker processes, keeps separate logs, and rotates child logs on restart above 5 MB. Credentials, if later configured, belong in private Application Support settings and never in Git. The app is locally built and unsigned; it is not a notarized distribution package.

## Stopping or uninstalling

Use the app's Stop Background Company menu. To disable login startup, move its LaunchAgent plist out of `~/Library/LaunchAgents` after stopping it. Removing the Desktop app alone does not stop the service. Keep or back up Application Support data before removing the installation; that folder contains your work.
