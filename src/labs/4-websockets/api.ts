import { Hono } from "hono";
import { client } from "../../db";

const app = new Hono();

// In-Memory specific variables for the Optimized route
const bikePositions = new Map<string, { lat: number; lng: number }>();
let flushInterval: any = null;

app.post("/prepare", async (c) => {
	console.log("[Lab 4] Preparing 50,000 IoT Bike Connections...");

	await client`TRUNCATE TABLE lab4_websockets.bikes RESTART IDENTITY CASCADE;`;

	// Seed 50,000 bikes across San Francisco
	await client`
    INSERT INTO lab4_websockets.bikes (id, lat, lng)
    SELECT 
      'bike-' || i,
      37.7749 + (random() * 0.1 - 0.05),
      -122.4194 + (random() * 0.1 - 0.05)
    FROM generate_series(1, 50000) AS i;
  `;

	// Pre-warm the cache for the optimized route
	bikePositions.clear();
	const bikes = await client`SELECT id, lat, lng FROM lab4_websockets.bikes;`;
	for (const b of bikes) bikePositions.set(b.id, { lat: b.lat, lng: b.lng });

	// Start the background flush worker if not started
	if (!flushInterval) {
		flushInterval = setInterval(async () => {
			// In a real app we'd bulk upsert the entire map here every 5 seconds
			// keeping DB load to practically zero regardless of connection count.
			console.log("Flushing cache to DB...");
		}, 5000);
	}

	return c.json({ message: "Seeded 50,000 bikes." });
});

// The Naive Approach: Direct Postgres writes for high-frequency telemetry
app.post("/naive", async (c) => {
	const bikeId = `bike-${Math.floor(Math.random() * 50000) + 1}`;
	const newLat = 37.7749 + (Math.random() * 0.1 - 0.05);
	const newLng = -122.4194 + (Math.random() * 0.1 - 0.05);

	try {
		// Under heavy concurrent load, this instantly exhausts the PostgreSQL connection pool
		// and crashes the backend.
		await client`
      UPDATE lab4_websockets.bikes 
      SET lat = ${newLat}, lng = ${newLng}, last_updated = NOW() 
      WHERE id = ${bikeId};
    `;
		return c.json({ status: "success" });
	} catch (e: any) {
		return c.json({ status: "pool_exhausted", error: e.message }, 503);
	}
});

// The Optimized Approach: In-Memory Node.js Cache
app.post("/optimized", async (c) => {
	const bikeId = `bike-${Math.floor(Math.random() * 50000) + 1}`;
	const newLat = 37.7749 + (Math.random() * 0.1 - 0.05);
	const newLng = -122.4194 + (Math.random() * 0.1 - 0.05);

	// Instantly returns, 0ms latency, zero DB connections used.
	bikePositions.set(bikeId, { lat: newLat, lng: newLng });

	return c.json({ status: "success" });
});

export default app;
