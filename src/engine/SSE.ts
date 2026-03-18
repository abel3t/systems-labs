import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import postgres from "postgres";
import "dotenv/config";

// 📡 Cross-Cluster Pub/Sub via PostgreSQL
// Because we have 4 horizontally scaled Bun workers behind an AWS ALB (NGINX),
// the browser might be streaming SSE from Worker 2, while the LoadTester is
// running on Worker 4. We use PG LISTEN/NOTIFY as our real-time broker!

export const subscribeToMetrics = async (c: Context) => {
	return streamSSE(c, async (stream) => {
		// Create a dedicated real-time connection for this stream
		const pubsubClient = postgres(process.env.DATABASE_URL as string);

		await pubsubClient.listen("metrics", async (payload: string) => {
			await stream.writeSSE({
				data: payload,
				event: "metrics",
			});
		});

		stream.onAbort(async () => {
			// Cleanup the postgres connection when the browser tab closes
			await pubsubClient.end();
		});

		// Keep connection alive
		while (true) {
			await stream.sleep(1000);
		}
	});
};
