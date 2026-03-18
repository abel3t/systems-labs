import { integer, pgSchema, serial, text } from "drizzle-orm/pg-core";

export const lab3Schema = pgSchema("lab3_race_conditions");

export const inventoryNaive = lab3Schema.table("inventory_naive", {
	id: serial("id").primaryKey(),
	name: text("name").notNull(),
	stock: integer("stock").notNull(),
});

export const inventoryOptimized = lab3Schema.table("inventory_optimized", {
	id: serial("id").primaryKey(),
	name: text("name").notNull(),
	stock: integer("stock").notNull(),
});
