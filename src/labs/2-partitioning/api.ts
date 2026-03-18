import { Hono } from "hono";
import { client } from "../../db";

const app = new Hono();

app.post("/prepare", async (c) => {
	console.log("[Lab 2] Preparing 5,000,000 rows for Partitioning Lab...");

	// 1. Truncate unpartitioned table
	await client`TRUNCATE TABLE lab2_partitioning.logs_unpartitioned RESTART IDENTITY CASCADE;`;

	// 2. We use raw SQL for the entirely partitioned table since Drizzle's DSL doesn't fully support PG14 partitions yet.
	await client`DROP TABLE IF EXISTS lab2_partitioning.logs_partitioned CASCADE;`;
	await client`
    CREATE TABLE lab2_partitioning.logs_partitioned (
      id serial,
      level text NOT NULL,
      message text NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL
    ) PARTITION BY RANGE (created_at);
  `;

	// Create two partitions: 2024 data and 2025 data
	await client`
    CREATE TABLE lab2_partitioning.logs_p2024 
    PARTITION OF lab2_partitioning.logs_partitioned 
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
  `;
	await client`
    CREATE TABLE lab2_partitioning.logs_p2025 
    PARTITION OF lab2_partitioning.logs_partitioned 
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
  `;

	// 3. Insert 5,000,000 random log rows across exactly 2024 and 2025 into the unpartitioned table
	await client`
    INSERT INTO lab2_partitioning.logs_unpartitioned (level, message, created_at)
    SELECT 
      CASE floor(random() * 3) WHEN 0 THEN 'INFO' WHEN 1 THEN 'WARN' ELSE 'ERROR' END,
      'Log entry ' || i,
      timestamp '2024-01-01 00:00:00' + random() * (timestamp '2025-12-31 23:59:59' - timestamp '2024-01-01 00:00:00')
    FROM generate_series(1, 5000000) AS i;
  `;

	// 4. Copy perfectly into the partitioned table
	// PostgreSQL will automatically route the inserts into _p2024 or _p2025 based on the dates!
	await client`
    INSERT INTO lab2_partitioning.logs_partitioned (level, message, created_at)
    SELECT level, message, created_at FROM lab2_partitioning.logs_unpartitioned;
  `;

	return c.json({ message: "Seeded 5,000,000 rows across 2024 and 2025." });
});

// The Naive operation: DELETE 2.5 million rows from monolithic table manually
app.post("/naive", async (c) => {
	const start = performance.now();
	await client`DELETE FROM lab2_partitioning.logs_unpartitioned WHERE created_at < '2025-01-01';`;
	const timeMs = Math.round(performance.now() - start);

	return c.json({ status: "success", timeMs });
});

// The Optimized operation: DROP the 2024 partition instantly
app.post("/optimized", async (c) => {
	const start = performance.now();
	await client`DROP TABLE lab2_partitioning.logs_p2024;`;
	const timeMs = Math.round(performance.now() - start);

	return c.json({ status: "success", timeMs });
});

export default app;
