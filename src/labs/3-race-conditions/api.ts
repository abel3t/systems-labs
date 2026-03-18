import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { client, db } from "../../db";

const app = new Hono();

app.post("/prepare", async (c) => {
	console.log("[Lab 3] Preparing Race Conditions Sandbox...");

	await client`TRUNCATE TABLE lab3_race_conditions.inventory_naive RESTART IDENTITY CASCADE;`;
	await client`TRUNCATE TABLE lab3_race_conditions.inventory_optimized RESTART IDENTITY CASCADE;`;

	// Seed both tables with exactly 100 items
	await client`INSERT INTO lab3_race_conditions.inventory_naive (id, name, stock) VALUES (1, 'Modern Sneaker (Limited)', 100);`;
	await client`INSERT INTO lab3_race_conditions.inventory_optimized (id, name, stock) VALUES (1, 'Modern Sneaker (Limited)', 100);`;

	return c.json({ message: "Inventory reset to exactly 100 items." });
});

// The Naive Approach: Read-Check-Write
app.post("/naive", async (c) => {
	// 1. Read
	const [item] =
		await client`SELECT stock FROM lab3_race_conditions.inventory_naive WHERE id = 1;`;

	if (item && item.stock > 0) {
		// Artificial 20ms delay to widen the race condition window for the emulator
		// In real life, network latency or complex data serializations cause this naturally.
		await new Promise((r) => setTimeout(r, 20));

		// 2. Write
		await client`UPDATE lab3_race_conditions.inventory_naive SET stock = stock - 1 WHERE id = 1;`;
		return c.json({ status: "success" });
	}

	return c.json({ status: "sold_out" }, 400);
});

// The Optimized Approach: FOR UPDATE Lock
app.post("/optimized", async (c) => {
	try {
		// Wraps the read and write in a strictly serial Database Transaction
		await db.transaction(async (tx) => {
			// The FOR UPDATE statement locks this specific row so no other concurrently running
			// API threads can modify OR READ it until this transaction commits.
			const res = await tx.execute(
				sql`SELECT stock FROM lab3_race_conditions.inventory_optimized WHERE id = 1 FOR UPDATE;`,
			);
			const item = res[0] as any;

			if (item && item.stock > 0) {
				// Even with the 20ms delay here, because of the DB lock, 500 concurrent users
				// will safely queue up and process sequentially!
				await new Promise((r) => setTimeout(r, 20));

				await tx.execute(
					sql`UPDATE lab3_race_conditions.inventory_optimized SET stock = stock - 1 WHERE id = 1;`,
				);
			} else {
				// Break out of the transaction if sold out
				throw new Error("sold_out");
			}
		});

		return c.json({ status: "success" });
	} catch (e: any) {
		return c.json({ status: "sold_out" }, 400);
	}
});

// Helper for UI to poll the live stock amounts
app.get("/stock", async (c) => {
	const [naive] =
		await client`SELECT stock FROM lab3_race_conditions.inventory_naive WHERE id = 1;`;
	const [optimized] =
		await client`SELECT stock FROM lab3_race_conditions.inventory_optimized WHERE id = 1;`;

	return c.json({
		naive: naive?.stock ?? "?",
		optimized: optimized?.stock ?? "?",
	});
});

export default app;
