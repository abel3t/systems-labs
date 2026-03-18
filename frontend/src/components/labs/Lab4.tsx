import {
	CheckCircle2,
	Clock,
	Database,
	Network,
	Wifi,
	XCircle,
	Zap,
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Lab } from "../lab-primitives";

interface EngineResult {
	successfulRequests: number;
	failedRequests: number;
	averageLatencyMs?: number;
	p99LatencyMs?: number;
}

function MetricCell({
	icon,
	value,
	label,
}: {
	icon: React.ReactNode;
	value: string;
	label: string;
}) {
	return (
		<div className="bg-muted rounded-lg p-3 flex flex-col gap-1">
			<div className="text-muted-foreground">{icon}</div>
			<div className="text-foreground font-bold text-base font-mono">
				{value}
			</div>
			<div className="text-muted-foreground text-xs">{label}</div>
		</div>
	);
}

function GhostCard({ label }: { label: string }) {
	return (
		<Card className="border-border">
			<CardContent className="pt-5 pb-5 space-y-4">
				<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
					{label}
				</p>
				<div className="space-y-3 opacity-40">
					<div>
						<div className="flex justify-between items-baseline mb-1.5">
							<span className="text-xs text-muted-foreground">
								Success Rate
							</span>
							<span className="text-xl font-black font-mono text-muted-foreground">
								—%
							</span>
						</div>
						<div className="w-full bg-muted rounded-full h-2" />
					</div>
					<div className="grid grid-cols-2 gap-2 text-xs font-mono">
						<MetricCell
							icon={<CheckCircle2 className="w-4 h-4" />}
							value="—"
							label="succeeded"
						/>
						<MetricCell
							icon={<XCircle className="w-4 h-4" />}
							value="—"
							label="failed (503)"
						/>
					</div>
					<div className="grid grid-cols-2 gap-2 text-xs font-mono">
						<MetricCell
							icon={<Clock className="w-4 h-4" />}
							value="—ms"
							label="avg latency"
						/>
						<MetricCell
							icon={<Zap className="w-4 h-4" />}
							value="—ms"
							label="p99 latency"
						/>
					</div>
				</div>
				<p className="text-[11px] text-muted-foreground italic text-center">
					Run benchmark to see results
				</p>
			</CardContent>
		</Card>
	);
}

function ScoreCard({ label, result }: { label: string; result: EngineResult }) {
	const total = result.successfulRequests + result.failedRequests;
	const successRate =
		total > 0 ? Math.round((result.successfulRequests / total) * 100) : 0;

	return (
		<Card className="border-border">
			<CardContent className="pt-5 pb-5 space-y-4">
				<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
					{label}
				</p>
				<div>
					<div className="flex justify-between items-baseline mb-1.5">
						<span className="text-xs text-muted-foreground">Success Rate</span>
						<span className="text-2xl font-black font-mono text-foreground">
							{successRate}%
						</span>
					</div>
					<div className="w-full bg-muted rounded-full h-2">
						<div
							className="bg-foreground h-2 rounded-full transition-all duration-700"
							style={{ width: `${successRate}%` }}
						/>
					</div>
				</div>
				<div className="grid grid-cols-2 gap-2 text-xs font-mono">
					<MetricCell
						icon={<CheckCircle2 className="w-4 h-4" />}
						value={result.successfulRequests.toLocaleString()}
						label="succeeded"
					/>
					<MetricCell
						icon={<XCircle className="w-4 h-4" />}
						value={result.failedRequests.toLocaleString()}
						label="failed (503)"
					/>
				</div>
				{result.averageLatencyMs !== undefined && (
					<div className="grid grid-cols-2 gap-2 text-xs font-mono">
						<MetricCell
							icon={<Clock className="w-4 h-4" />}
							value={`${result.averageLatencyMs}ms`}
							label="avg latency"
						/>
						{result.p99LatencyMs !== undefined && (
							<MetricCell
								icon={<Zap className="w-4 h-4" />}
								value={`${result.p99LatencyMs}ms`}
								label="p99 latency"
							/>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export default function Lab4() {
	const [naiveResult, setNaiveResult] = useState<EngineResult | null>(null);
	const [optimizedResult, setOptimizedResult] = useState<EngineResult | null>(
		null,
	);

	const handlePrepareData = async () => {
		setNaiveResult(null);
		setOptimizedResult(null);
		await fetch("http://localhost:4000/api/labs/4-websockets/prepare", {
			method: "POST",
		});
	};

	const handleRunNaive = async () => {
		const res = await fetch("http://localhost:4000/api/engine/run", {
			method: "POST",
			body: JSON.stringify({
				method: "POST",
				url: "http://localhost:4000/api/labs/4-websockets/naive",
				concurrency: 500,
				durationSeconds: 15,
			}),
			headers: { "Content-Type": "application/json" },
		});
		setNaiveResult(await res.json());
	};

	const handleRunOptimized = async () => {
		const res = await fetch("http://localhost:4000/api/engine/run", {
			method: "POST",
			body: JSON.stringify({
				method: "POST",
				url: "http://localhost:4000/api/labs/4-websockets/optimized",
				concurrency: 500,
				durationSeconds: 15,
			}),
			headers: { "Content-Type": "application/json" },
		});
		setOptimizedResult(await res.json());
	};

	return (
		<Lab.Root
			onPrepare={handlePrepareData}
			onRunNaive={handleRunNaive}
			onRunOptimized={handleRunOptimized}
		>
			<Lab.Header
				title="Connection Exhaustion (50k WebSockets)"
				description="Learn why thousands of fast IoT updates destroy PostgreSQL connection pools."
				aside={
					<Lab.ScenarioCard context="50,000 delivery bikes in San Francisco are emitting GPS coordinates every 3 seconds." />
				}
			/>
			<Lab.Prepare />
			<Lab.BenchmarkGrid>
				<Lab.ProblemCard text="The Naive code processes every GPS update with `await db.update(bikes).set(coord)`. Since Node parses HTTP faster than disk writes, the Postgres connection pool rapidly exhausts. Requests queue up, memory spikes, and the API throws 503 Pool Exhausted errors." />
				<Lab.SolutionCard text="The Optimized code maps updates directly into memory: `cache.set(bikeId, coord)`. A background `setInterval` bulk-upserts to the database every 5 seconds. Latency drops to ~0ms and exactly 1 DB connection is used regardless of scale." />
			</Lab.BenchmarkGrid>
			<Lab.Results>
				<div className="mt-2 space-y-4">
					<div className="grid grid-cols-2 gap-4">
						{naiveResult ? (
							<ScoreCard label="Direct DB Write (Naive)" result={naiveResult} />
						) : (
							<GhostCard label="Direct DB Write (Naive)" />
						)}
						{optimizedResult ? (
							<ScoreCard
								label="In-Memory Cache (Optimized)"
								result={optimizedResult}
							/>
						) : (
							<GhostCard label="In-Memory Cache (Optimized)" />
						)}
					</div>
					{/* Architecture diagram */}
					<div className="rounded-lg border border-border bg-card p-4">
						<div className="flex items-center gap-2 text-muted-foreground text-xs font-mono mb-3">
							<Network className="w-4 h-4" />
							<span>ARCHITECTURE — 50,000 BIKES → SERVER → POSTGRES</span>
						</div>
						<div className="grid grid-cols-3 gap-2 text-xs font-mono">
							<div className="bg-muted rounded-lg p-3 flex flex-col items-center gap-1.5">
								<Wifi className="w-4 h-4 text-muted-foreground" />
								<div className="text-foreground font-bold">50,000</div>
								<div className="text-muted-foreground">bike connections</div>
							</div>
							<div className="bg-muted rounded-lg p-3 flex flex-col items-center gap-1.5">
								<Database className="w-4 h-4 text-muted-foreground" />
								<div
									className={`font-bold ${naiveResult ? "text-destructive" : "text-foreground"}`}
								>
									{naiveResult
										? "EXHAUSTED"
										: optimizedResult
											? "1 conn used"
											: "?? / 10 max"}
								</div>
								<div className="text-muted-foreground">DB connections</div>
							</div>
							<div className="bg-muted rounded-lg p-3 flex flex-col items-center gap-1.5">
								<Clock className="w-4 h-4 text-muted-foreground" />
								<div
									className={`font-bold ${naiveResult ? "text-destructive" : "text-foreground"}`}
								>
									{optimizedResult
										? "~0ms write"
										: naiveResult
											? "timeout"
											: "—"}
								</div>
								<div className="text-muted-foreground">write latency</div>
							</div>
						</div>
					</div>
				</div>
			</Lab.Results>
		</Lab.Root>
	);
}
