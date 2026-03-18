import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { loadTester } from "./engine/LoadTester";
import { subscribeToMetrics } from "./engine/SSE";

// Import Labs
import lab1Indexing from "./labs/1-indexing/api";
import lab2Partitioning from "./labs/2-partitioning/api";
import lab3RaceConditions from "./labs/3-race-conditions/api";
import lab4Websockets from "./labs/4-websockets/api";
import lab5EventLoop from "./labs/5-eventloop/api";

const app = new Hono();

app.use("*", cors());

// Health Check for NGINX
app.get("/", (c) => {
	return c.json({
		status: "ok",
		message: "Systems Sandbox V2 Cluster Node",
		workerId: process.env.WORKER_ID,
		port: process.env.PORT,
	});
});

// --- Engine Routes ---
app.get("/api/engine/stream", subscribeToMetrics);
app.route("/api/labs/1-indexing", lab1Indexing);
app.route("/api/labs/2-partitioning", lab2Partitioning);
app.route("/api/labs/3-race-conditions", lab3RaceConditions);
app.route("/api/labs/4-websockets", lab4Websockets);
app.route("/api/labs/5-eventloop", lab5EventLoop);

app.post("/api/engine/run", async (c) => {
	const body = await c.req.json();
	try {
		// Run the load test in the background
		loadTester.run({
			method: body.method || "GET",
			url: body.url,
			concurrency: body.concurrency || 50,
			durationSeconds: body.durationSeconds || 10,
		});
		return c.json({ status: "started" });
	} catch (e: any) {
		return c.json({ error: e.message }, 400);
	}
});

export default {
	port: parseInt(process.env.PORT || "3000", 10),
	fetch: app.fetch,
	// Seed operations can take >10s. Bun's idleTimeout max is 255.
	idleTimeout: 255,
};
