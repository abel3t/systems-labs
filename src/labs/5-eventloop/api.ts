import crypto from "crypto";
import { Hono } from "hono";

const app = new Hono();

// Simulate a massive CPU workload (e.g., hashing a user's password, data compression)
const doHeavyWorkSync = () => {
	// pbkdf2Sync completely blocks the single main JS thread for ~100ms
	// Absolutely nothing else can execute during this time.
	crypto.pbkdf2Sync("password123", "somesalt", 200000, 64, "sha512");
};

const doHeavyWorkAsync = (): Promise<void> => {
	return new Promise((resolve, reject) => {
		// The async version pushes the CPU work off the main thread into the C++ libuv thread pool
		crypto.pbkdf2("password123", "somesalt", 200000, 64, "sha512", (err) => {
			if (err) reject(err);
			resolve();
		});
	});
};

app.post("/prepare", async (c) => {
	return c.json({ message: "Environment Ready." });
});

app.post("/naive", async (c) => {
	doHeavyWorkSync();
	return c.json({ status: "success" });
});

app.post("/optimized", async (c) => {
	await doHeavyWorkAsync();
	return c.json({ status: "success" });
});

// A lightweight ping endpoint for the UI to constantly poll.
// If the Node event loop is blocked, this endpoint becomes completely unresponsive.
app.get("/ping", (c) => {
	return c.text("pong");
});

export default app;
