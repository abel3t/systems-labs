import { pgSchema, serial, text, timestamp } from "drizzle-orm/pg-core";

export const lab2Schema = pgSchema("lab2_partitioning");

export const logsUnpartitioned = lab2Schema.table("logs_unpartitioned", {
	id: serial("id").primaryKey(),
	level: text("level").notNull(),
	message: text("message").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Note: Drizzle currently has limited native support for PARTITION BY in its
// typescript schema definitions at the moment.
// To perfectly model an enterprise Partitioned table, we define the base table here
// so Drizzle knows about the types, but we will use raw SQL in our initialization
// script to create the partitions (`_p1`, `_p2`) physically in Postgres!

export const logsPartitioned = lab2Schema.table("logs_partitioned", {
	// partitioned tables don't support primary keys that don't include the partition key in PG 14+
	// so we omit primaryKey() here and handle it raw
	id: serial("id"),
	level: text("level").notNull(),
	message: text("message").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});
