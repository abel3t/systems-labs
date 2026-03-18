import { Database, Layers, Timer, Zap } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Lab } from "../lab-primitives";

interface OpResult {
	timeMs: number;
	rowsAffected?: number;
}

function formatDuration(ms: number) {
	if (ms >= 60000) return `${(ms / 60000).toFixed(1)}m`;
	if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
	return `${ms}ms`;
}

export default function Lab2() {
	const [naive, setNaive] = useState<OpResult | null>(null);
	const [optimized, setOptimized] = useState<OpResult | null>(null);
	const [lastRun, setLastRun] = useState<"naive" | "optimized" | null>(null);

	const handlePrepareData = async () => {
		setNaive(null);
		setOptimized(null);
		await fetch("http://localhost:4000/api/labs/2-partitioning/prepare", {
			method: "POST",
		});
	};

	const handleRunNaive = async () => {
		const res = await fetch(
			"http://localhost:4000/api/labs/2-partitioning/naive",
			{ method: "POST" },
		);
		setNaive(await res.json());
		setLastRun("naive");
	};

	const handleRunOptimized = async () => {
		const res = await fetch(
			"http://localhost:4000/api/labs/2-partitioning/optimized",
			{ method: "POST" },
		);
		setOptimized(await res.json());
		setLastRun("optimized");
	};

	const hasAny = naive || optimized;

	return (
		<Lab.Root
			onPrepare={handlePrepareData}
			onRunNaive={handleRunNaive}
			onRunOptimized={handleRunOptimized}
		>
			<Lab.Header
				title="Table Partitioning (50M+ Rows)"
				description="Compare how to delete historical data at scale: the dreaded DELETE scan vs the DROP PARTITION trick."
				aside={
					<Lab.ScenarioCard context="Your company log table has reached 5 Million rows. You are legally required to delete all data from 2024 to save space. We must prune exactly 2.5 million rows." />
				}
			/>
			<Lab.Prepare />
			<Lab.BenchmarkGrid>
				<Lab.ProblemCard text="A naive `DELETE FROM logs WHERE created_at < '2025-01-01'` forces the DB to find, lock, and mark 2,500,000 individual records as 'dead tuples' one by one. This causes massive IO spikes, locks the table, and requires a slow autovacuum later." />
				<Lab.SolutionCard text="If the table was explicitly partitioned by year (`PARTITION BY RANGE`), you simply execute `DROP TABLE logs_p2024;`. This avoids row-locking and instantly deletes the underlying file on disk in 1 millisecond." />
			</Lab.BenchmarkGrid>
			<Lab.Results>
				{hasAny && (
					<div className="space-y-4 mt-2">
						<div className="grid grid-cols-2 gap-4">
							{/* Naive */}
							<Card className="border-border">
								<CardContent className="pt-6 pb-6 flex flex-col items-center text-center gap-3">
									<Timer className="w-8 h-8 text-muted-foreground" />
									<div>
										<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
											DELETE FROM … WHERE
										</p>
										{naive ? (
											<>
												<div className="text-5xl font-black font-mono text-destructive">
													{formatDuration(naive.timeMs)}
												</div>
												<p className="text-xs text-muted-foreground mt-2">
													Marked ~2.5M rows as dead tuples, one at a time
												</p>
											</>
										) : (
											<p className="text-muted-foreground text-sm italic">
												Not yet run
											</p>
										)}
									</div>
								</CardContent>
							</Card>

							{/* Optimized */}
							<Card className="border-border">
								<CardContent className="pt-6 pb-6 flex flex-col items-center text-center gap-3">
									<Zap className="w-8 h-8 text-muted-foreground" />
									<div>
										<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
											DROP TABLE logs_p2024
										</p>
										{optimized ? (
											<>
												<div className="text-5xl font-black font-mono text-foreground">
													{formatDuration(optimized.timeMs)}
												</div>
												<p className="text-xs text-muted-foreground mt-2">
													Deleted the underlying partition file instantly
												</p>
											</>
										) : (
											<p className="text-muted-foreground text-sm italic">
												Not yet run
											</p>
										)}
									</div>
								</CardContent>
							</Card>
						</div>

						{/* Speedup callout */}
						{naive && optimized && (
							<div className="rounded-lg bg-card border border-border px-5 py-3 flex items-center gap-3">
								<Zap className="w-4 h-4 text-muted-foreground shrink-0" />
								<p className="text-sm text-foreground">
									DROP PARTITION is{" "}
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
										{formatDuration(naive.timeMs)}
									</span>{" "}
									vs{" "}
									<span className="font-mono">
										{formatDuration(optimized.timeMs)}
									</span>
								</p>
							</div>
						)}

						{/* Schema diagram */}
						<div className="grid grid-cols-2 gap-4">
							<div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2">
								<div className="flex items-center gap-2 text-muted-foreground text-xs font-mono mb-1">
									<Database className="w-4 h-4" />
									<span>1 UNPARTITIONED TABLE</span>
								</div>
								<div className="rounded-md bg-muted border border-border px-3 py-2 text-xs font-mono text-muted-foreground">
									logs_unpartitioned
									<br />
									<span className="opacity-60">
										5,000,000 rows (2024 + 2025)
									</span>
								</div>
							</div>
							<div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2">
								<div className="flex items-center gap-2 text-muted-foreground text-xs font-mono mb-1">
									<Layers className="w-4 h-4" />
									<span>2 PARTITIONS (_P24, _P25)</span>
								</div>
								<div className="rounded-md bg-muted border border-border px-3 py-2 text-xs font-mono text-foreground">
									logs_p2024 → DROP ⚡<br />
									<span className="text-muted-foreground">
										logs_p2025 remains intact
									</span>
								</div>
							</div>
						</div>
					</div>
				)}
			</Lab.Results>
		</Lab.Root>
	);
}
