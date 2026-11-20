// Run from backend/:  node scripts/test-shutdown.mjs
// Starts the real server (needs a working .env + MongoDB), opens a websocket, asks the
// server to shut down, and checks it exits cleanly with code 0 well before the 10s force timer.
// Windows cannot deliver SIGTERM to a Node child, so there it uses the IPC "shutdown" message.
import { fork } from "node:child_process";
import net from "node:net";

const fails = [];
const check = (ok, msg) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (!ok) fails.push(msg);
};

const freePort = () =>
  new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once("error", reject);
    s.listen(0, () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });

const port = await freePort();
let output = "";
const child = fork("server.js", [], {
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe", "ipc"],
});
child.stdout.on("data", (d) => (output += d));
child.stderr.on("data", (d) => (output += d));

const exited = new Promise((resolve) => child.once("exit", (code, signal) => resolve({ code, signal, at: Date.now() })));

try {
  // 1. wait until the server is listening
  const ready = await Promise.race([
    new Promise((resolve) => {
      const t = setInterval(() => {
        if (output.includes("Server running on port")) {
          clearInterval(t);
          resolve(true);
        }
      }, 100);
    }),
    exited.then(() => false),
    new Promise((resolve) => setTimeout(() => resolve(false), 40000)),
  ]);
  check(ready, `server started on port ${port}`);
  if (!ready) throw new Error("server did not start. Output:\n" + output);

  const health = await fetch(`http://127.0.0.1:${port}/health`).catch(() => null);
  check(health?.status === 200, "GET /health returns 200 before shutdown");

  // 2. hold a websocket open (this is what used to delay shutdown)
  let ws = null;
  let wsClosed = null;
  try {
    const { default: WebSocket } = await import("ws");
    ws = new WebSocket(`ws://127.0.0.1:${port}/socket.io/?EIO=4&transport=websocket`);
    await new Promise((resolve, reject) => {
      ws.once("open", resolve);
      ws.once("error", reject);
    });
    wsClosed = new Promise((resolve) => ws.once("close", () => resolve(true)));
    check(true, "websocket client connected");
  } catch (e) {
    console.log(`SKIP  websocket part (could not use the 'ws' package: ${e.message})`);
  }

  // 3. trigger shutdown and time it
  const started = Date.now();
  if (process.platform === "win32") child.send("shutdown");
  else child.kill("SIGTERM");

  const result = await Promise.race([exited, new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), 15000))]);
  if (result.timeout) {
    check(false, "server exited within 15s");
  } else {
    const secs = ((result.at - started) / 1000).toFixed(2);
    check(result.code === 0, `exit code is 0 (got ${result.code}, signal ${result.signal})`);
    check(result.at - started < 8000, `exited in ${secs}s (force timer is 10s)`);
  }
  check(/received, shutting down/.test(output), "shutdown handler logged its message");

  if (wsClosed) {
    const closed = await Promise.race([wsClosed, new Promise((resolve) => setTimeout(() => resolve(false), 2000))]);
    check(closed === true, "websocket client was disconnected");
  }

  const after = await fetch(`http://127.0.0.1:${port}/health`).then(() => true).catch(() => false);
  check(after === false, "server no longer accepts connections");
} catch (e) {
  console.error(e.message);
  fails.push(e.message);
} finally {
  if (child.exitCode === null) child.kill("SIGKILL");
}

console.log(fails.length ? `\nFAILED (${fails.length})` : "\nALL SHUTDOWN CHECKS PASSED");
process.exit(fails.length ? 1 : 0);
