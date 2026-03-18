import { defineConfig } from "drizzle-kit";
import "dotenv/config";

export default defineConfig({
	schema: "./src/labs/*/schema.ts",
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL!,
	},
	schemaFilter: [
		"lab1_indexing",
		"lab2_partitioning",
		"lab3_race_conditions",
		"lab4_websockets",
		"lab5_eventloop",
	],
	verbose: true,
	strict: true,
});
