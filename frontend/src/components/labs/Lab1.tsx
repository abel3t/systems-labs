import { Turtle, Zap } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Lab } from "../lab-primitives";

interface BenchResult {
	timeMs: number;
	rows: any[];
}

export default function Lab1() {
	const [naive, setNaive] = useState<BenchResult | null>(null);
	const [optimized, setOptimized] = useState<BenchResult | null>(null);
	const [lastRun, setLastRun] = useState<"naive" | "optimized" | null>(null);

	const handlePrepareData = async () => {
		setNaive(null);
		setOptimized(null);
		await fetch("http://localhost:4000/api/labs/1-indexing/prepare", {
			method: "POST",
		});
	};

	const runBench = async (endpoint: string): Promise<BenchResult> => {
		const t0 = performance.now();
		const res = await fetch(
			`http://localhost:4000/api/labs/1-indexing/${endpoint}`,
		);
		const json = await res.json();
		const clientMs = Math.round(performance.now() - t0);
		if (Array.isArray(json)) return { timeMs: clientMs, rows: json };
		return { timeMs: json.timeMs ?? clientMs, rows: json.rows ?? [] };
	};

	const handleRunNaive = async () => {
		const result = await runBench("naive");
		setNaive(result);
		setLastRun("naive");
	};

	const handleRunOptimized = async () => {
		const result = await runBench("optimized");
		setOptimized(result);
		setLastRun("optimized");
	};

	const maxMs = Math.max(naive?.timeMs ?? 0, optimized?.timeMs ?? 1);
	const hasAny = naive || optimized;

	return (
		<Lab.Root
			onPrepare={handlePrepareData}
			onRunNaive={handleRunNaive}
			onRunOptimized={handleRunOptimized}
		>
			<Lab.Header
				title="Missing Indexes (The Table Scan)"
				description="Compare database performance on a 1 Million row table with and without a B-Tree index."
				aside={
					<Lab.ScenarioCard context="Fetching the 50 newest 'pending' orders from 1M total sales." />
				}
			/>
			<Lab.Prepare />
			<Lab.BenchmarkGrid>
				<Lab.ProblemCard text="Without an index on (status, created_at), PostgreSQL is forced to perform a Sequential Scan, reading every single one of the 1,000,000 rows off disk one by one, sorting them, and keeping 50. This burns massive CPU and ruins P99 latency." />
				<Lab.SolutionCard text="By adding a B-Tree Index on (status, created_at), the database engine jumps instantly to the exact records, bypassing 99.9% of the table. The query returns in 0ms." />
			</Lab.BenchmarkGrid>
			<Lab.Results>
				{hasAny && (
					<div className="space-y-4 mt-2">
						{/* Speed comparison */}
						<div className="grid grid-cols-2 gap-4">
							<Card className="border-border">
								<CardContent className="pt-5 pb-5">
									<div className="flex items-center gap-2 mb-3">
										<Turtle className="w-4 h-4 text-muted-foreground" />
										<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
											Full Table Scan
										</span>
									</div>
									{naive ? (
										<>
											<div className="text-5xl font-black font-mono text-destructive mb-2">
												{naive.timeMs.toLocaleString()}
												<span className="text-xl font-semibold ml-1">ms</span>
											</div>
											<div className="w-full bg-muted rounded-full h-2 mt-3">
												<div
													className="bg-destructive h-2 rounded-full transition-all duration-700"
													style={{
														width: `${maxMs > 0 ? (naive.timeMs / maxMs) * 100 : 0}%`,
													}}
												/>
											</div>
											<p className="text-xs text-muted-foreground mt-2">
												Reads all 1,000,000 rows
											</p>
										</>
									) : (
										<p className="text-muted-foreground text-sm italic">
											Not yet run
										</p>
									)}
								</CardContent>
							</Card>

							<Card className="border-border">
								<CardContent className="pt-5 pb-5">
									<div className="flex items-center gap-2 mb-3">
										<Zap className="w-4 h-4 text-muted-foreground" />
										<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
											B-Tree Index Scan
										</span>
									</div>
									{optimized ? (
										<>
											<div className="text-5xl font-black font-mono text-foreground mb-2">
												{optimized.timeMs.toLocaleString()}
												<span className="text-xl font-semibold ml-1">ms</span>
											</div>
											<div className="w-full bg-muted rounded-full h-2 mt-3">
												<div
													className="bg-foreground h-2 rounded-full transition-all duration-700"
													style={{
														width: `${maxMs > 0 ? (optimized.timeMs / maxMs) * 100 : 0}%`,
													}}
												/>
											</div>
											<p className="text-xs text-muted-foreground mt-2">
												Reads only the index nodes needed
											</p>
										</>
									) : (
										<p className="text-muted-foreground text-sm italic">
											Not yet run
										</p>
									)}
								</CardContent>
							</Card>
						</div>

						{/* Speedup callout */}
						{naive && optimized && (
							<div className="rounded-lg bg-card border border-border px-5 py-3 flex items-center gap-3">
								<Zap className="w-4 h-4 text-muted-foreground shrink-0" />
								<p className="text-sm text-foreground">
									B-Tree index is{" "}
									<span className="font-black">
										{naive.timeMs > 0
											? Math.round(
													naive.timeMs / Math.max(optimized.timeMs, 1),
												).toLocaleString()
											: "∞"}
										×
									</span>{" "}
									faster —{" "}
									<span className="text-destructive font-mono">
										{naive.timeMs.toLocaleString()}ms
									</span>{" "}
									vs{" "}
									<span className="font-mono">
										{optimized.timeMs.toLocaleString()}ms
									</span>
								</p>
							</div>
						)}

						{/* Sample rows */}
						{(() => {
							const cur = lastRun === "naive" ? naive : optimized;
							if (!cur?.rows?.length) return null;
							return (
								<div className="rounded-md border border-border bg-card max-h-72 overflow-y-auto">
									<Table>
										<TableHeader className="bg-muted/50 sticky top-0">
											<TableRow>
												<TableHead className="w-24">Order ID</TableHead>
												<TableHead>User ID</TableHead>
												<TableHead>Status</TableHead>
												<TableHead className="text-right">Amount</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{cur.rows.slice(0, 20).map((order: any) => (
												<TableRow key={`order-${order.id}`}>
													<TableCell className="font-mono">
														#{order.id}
													</TableCell>
													<TableCell className="font-mono text-muted-foreground">
														{order.userId}
													</TableCell>
													<TableCell>
														<Badge variant="outline">{order.status}</Badge>
													</TableCell>
													<TableCell className="text-right">
														${(order.amount / 100).toFixed(2)}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							);
						})()}
					</div>
				)}
			</Lab.Results>
		</Lab.Root>
	);
}
