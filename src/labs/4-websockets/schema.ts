import {
	doublePrecision,
	pgSchema,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";

export const lab4Schema = pgSchema("lab4_websockets");

export const bikes = lab4Schema.table("bikes", {
	id: varchar("id").primaryKey(), // e.g. 'bike-1'
	lat: doublePrecision("lat").notNull(),
	lng: doublePrecision("lng").notNull(),
	lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});
