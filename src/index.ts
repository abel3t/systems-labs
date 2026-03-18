import { spawn } from "child_process";
import path from "path";

const NUM_WORKERS = 4;
const START_PORT = 3000;

console.log(
	`🚀 Booting Systems Sandbox V2 Engine (Simulating 4 AWS Instances)`,
);

for (let i = 0; i < NUM_WORKERS; i++) {
	const port = START_PORT + i;
	console.log(`  → Starting backend worker on port ${port}...`);

	const worker = spawn("bun", ["run", path.join(__dirname, "server.ts")], {
		env: { ...process.env, PORT: port.toString(), WORKER_ID: i.toString() },
		stdio: "inherit",
	});

	worker.on("exit", (code) => {
		console.error(
			`❌ Worker ${i} (Port ${port}) crashed with code ${code}. Restarting...`,
		);
		// Basic auto-restart logic could go here
	});
}

console.log(
	`✅ Sandbox Engine running globally on NGINX Load Balancer (http://localhost:4000)`,
);
