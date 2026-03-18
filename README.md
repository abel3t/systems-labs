# Systems Scaling Labs

A sandbox for experimenting with real-world, high-concurrency systems problems and proving their solutions. Built with **Bun, Hono, Drizzle ORM, PostgreSQL, and Grafana k6**.

## Lab 1: 10 Million Row Database Optimization
Demonstrates how destructive slow queries are under load, and how to fix them with B-Tree Indexes.

### How to reproduce
1. Start DB: `docker-compose up -d`
2. Run migrations: `bunx drizzle-kit push`
3. Seed data (might take a minute): `bun run src/labs/10m-rows/seed.ts`
4. Start API server on a separate terminal: `bun run --hot src/index.ts`
5. Run load test against the naive endpoint: 
   ```bash
   docker run --rm -i grafana/k6 run - < src/labs/10m-rows/load-test.js
   ```

### How to fix it (Homework)
1. Open `src/labs/10m-rows/schema.ts` inside the `orders` table.
2. Uncomment the index block: `statusIdx: index('status_idx').on(table.status)`
3. Re-run `bunx drizzle-kit push` to apply the index.
4. Run the k6 load test again and watch the response time drop from seconds to milliseconds!

---

## Lab 2: Race Conditions & Overbooking
Demonstrates how standard DB updates fail under extreme concurrency, resulting in negative stock, and how to fix it with Pessimistic Locking.

### How to reproduce
1. Seed the limited edition item (Stock = 100): `bun run src/labs/race-conditions/seed.ts`
2. Ensure the API server is running: `bun run --hot src/index.ts`
3. Hit the naive endpoint with 500 concurrent buyers using k6:
   ```bash
   docker run --rm -i grafana/k6 run - < src/labs/race-conditions/load-test.js
   ```
4. Check the stock: `curl http://localhost:3000/api/race-conditions/stock` 
   **(It will likely be in the negatives! The race condition occurred!)**

### How to fix it
1. Stop the server, and reset the stock back to 100: `bun run src/labs/race-conditions/seed.ts`
2. Open `src/labs/race-conditions/load-test.js` and change the URL from `/naive` to `/safe`.
3. Re-run the load test. Look at the server logs to see errors being returned for 400 buyers.
4. Check the stock: `curl http://localhost:3000/api/race-conditions/stock`
   **(It should be exactly 0. The row-level lock prevented the race condition!)**
