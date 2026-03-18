import { client } from "../db";

interface LoadTestOptions {
	method: "GET" | "POST" | "PUT";
	url: string;
	concurrency: number;
	durationSeconds: number;
}

export class LoadTester {
	private isRunning: boolean = false;
	private totalRequests: number = 0;
	private successfulRequests: number = 0;
	private failedRequests: number = 0;
	private latencies: number[] = [];

	async run(options: LoadTestOptions) {
		if (this.isRunning)
			throw new Error("A load test is already running on this worker.");

		this.isRunning = true;
		this.totalRequests = 0;
		this.successfulRequests = 0;
		this.failedRequests = 0;
		this.latencies = [];

		const startTime = Date.now();
		const endTime = startTime + options.durationSeconds * 1000;

		// Background interval to NOTIFY metrics across the cluster every 1000ms
		const reporterInterval = setInterval(async () => {
			const now = Date.now();
			const payload = JSON.stringify({
				totalRequests: this.totalRequests,
				successfulRequests: this.successfulRequests,
				failedRequests: this.failedRequests,
				timeRemaining: Math.max(0, Math.round((endTime - now) / 1000)),
				p99: this.calculateP99(),
			});

			// Broadcast over PostgreSQL so any SSE stream on any worker sees it.
			// Must use client.unsafe() — NOTIFY does not support parameterized queries ($1).
			await client.unsafe(`NOTIFY metrics, '${payload.replace(/'/g, "''")}'`);

			this.latencies = []; // clear window for next tick
		}, 1000);

		// The workers loop
		const workerPromises = Array.from({ length: options.concurrency }).map(
			async () => {
				while (Date.now() < endTime && this.isRunning) {
					const reqStart = performance.now();
					try {
						const res = await fetch(options.url, { method: options.method });
						if (res.ok) this.successfulRequests++;
						else this.failedRequests++;
					} catch (e) {
						this.failedRequests++;
					} finally {
						this.latencies.push(performance.now() - reqStart);
						this.totalRequests++;
					}
				}
			},
		);

		await Promise.all(workerPromises);

		// Stop reporting
		clearInterval(reporterInterval);
		this.isRunning = false;

		// Send the final summary broadcast
		const finalPayload = JSON.stringify({
			status: "complete",
			totalRequests: this.totalRequests,
			successfulRequests: this.successfulRequests,
			failedRequests: this.failedRequests,
		});
		await client.unsafe(
			`NOTIFY metrics, '${finalPayload.replace(/'/g, "''")}'`,
		);
	}

	calculateP99(): number {
		if (this.latencies.length === 0) return 0;
		this.latencies.sort((a, b) => a - b);
		const index = Math.floor(this.latencies.length * 0.99);
		return Math.round(
			this.latencies[index] ?? this.latencies[this.latencies.length - 1] ?? 0,
		);
	}
}

export const loadTester = new LoadTester();
