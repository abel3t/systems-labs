import { desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { client, db } from "../../db";
import { ordersIndexed, ordersUnindexed } from "./schema";

const app = new Hono();

app.post("/prepare", async (c) => {
	console.log("[Lab 1] Preparing 1,000,000 rows...");

	// 1. Truncate existing data to start fresh
	await client`TRUNCATE TABLE lab1_indexing.orders_unindexed RESTART IDENTITY CASCADE;`;
	await client`TRUNCATE TABLE lab1_indexing.orders_indexed RESTART IDENTITY CASCADE;`;

	// 2. Generate 1,000,000 random rows directly inside postgres for extreme speed
	await client`
    INSERT INTO lab1_indexing.orders_unindexed (user_id, amount, status, created_at)
    SELECT 
      floor(random() * 100000 + 1)::int,
      floor(random() * 50000 + 100)::int,
      CASE WHEN random() < 0.1 THEN 'pending' ELSE 'completed' END,
      NOW() - (random() * interval '365 days')
    FROM generate_series(1, 1000000);
  `;

	// 3. Copy exactly down byte-for-byte to the indexed table
	await client`
    INSERT INTO lab1_indexing.orders_indexed
    SELECT * FROM lab1_indexing.orders_unindexed;
  `;

	return c.json({
		message: "Seeded 1,000,000 rows successfully into both tables.",
	});
});

// The Naive query (Full Table Scan) — returns timing + rows
app.get("/naive", async (c) => {
	const start = performance.now();
	const result = await db
		.select()
		.from(ordersUnindexed)
		.where(eq(ordersUnindexed.status, "pending"))
		.orderBy(desc(ordersUnindexed.createdAt))
		.limit(50);
	const timeMs = Math.round(performance.now() - start);

	return c.json({ timeMs, rows: result });
});

// The Optimized query (B-Tree Index Scan) — returns timing + rows
app.get("/optimized", async (c) => {
	const start = performance.now();
	const result = await db
		.select()
		.from(ordersIndexed)
		.where(eq(ordersIndexed.status, "pending"))
		.orderBy(desc(ordersIndexed.createdAt))
		.limit(50);
	const timeMs = Math.round(performance.now() - start);

	return c.json({ timeMs, rows: result });
});

export default app;
