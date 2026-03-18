import {
	index,
	integer,
	pgSchema,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

export const lab1Schema = pgSchema("lab1_indexing");

export const ordersUnindexed = lab1Schema.table("orders_unindexed", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").notNull(),
	amount: integer("amount").notNull(),
	status: text("status").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Identical table, but with a composite B-Tree index on (status, created_at)
export const ordersIndexed = lab1Schema.table(
	"orders_indexed",
	{
		id: serial("id").primaryKey(),
		userId: integer("user_id").notNull(),
		amount: integer("amount").notNull(),
		status: text("status").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		statusCreatedIdx: index("idx_lab1_status_created").on(
			table.status,
			table.createdAt,
		),
	}),
);
