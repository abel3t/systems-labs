import {
	AlertTriangle,
	CheckCircle2,
	Lock,
	ShoppingCart,
	TrendingDown,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Lab } from "../lab-primitives";

interface EngineResult {
	successfulRequests: number;
	failedRequests: number;
}

export default function Lab3() {
	const [stockNaive, setStockNaive] = useState<number | string>("—");
	const [stockOptimized, setStockOptimized] = useState<number | string>("—");
	const [naiveResult, setNaiveResult] = useState<EngineResult | null>(null);
	const [optimizedResult, setOptimizedResult] = useState<EngineResult | null>(
		null,
	);
	const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const pollStock = async () => {
		try {
			const res = await fetch(
				"http://localhost:4000/api/labs/3-race-conditions/stock",
			);
			const json = await res.json();
			setStockNaive(json.naive);
			setStockOptimized(json.optimized);
		} catch (_) {
			/* ignore */
		}
	};

	const startPolling = () => {
		if (pollingRef.current) return;
		pollingRef.current = setInterval(pollStock, 500);
	};

	useEffect(() => {
		return () => {
			if (pollingRef.current) clearInterval(pollingRef.current);
		};
	}, []);

	const handlePrepareData = async () => {
		setNaiveResult(null);
		setOptimizedResult(null);
		setStockNaive("—");
		setStockOptimized("—");
		await fetch("http://localhost:4000/api/labs/3-race-conditions/prepare", {
			method: "POST",
		});
		await pollStock();
		startPolling();
	};

	const handleRunNaive = async () => {
		const res = await fetch("http://localhost:4000/api/engine/run", {
			method: "POST",
			body: JSON.stringify({
				method: "POST",
				url: "http://localhost:4000/api/labs/3-race-conditions/naive",
				concurrency: 500,
				durationSeconds: 3,
			}),
			headers: { "Content-Type": "application/json" },
		});
		await pollStock();
		setNaiveResult(await res.json());
	};

	const handleRunOptimized = async () => {
		const res = await fetch("http://localhost:4000/api/engine/run", {
			method: "POST",
			body: JSON.stringify({
				method: "POST",
				url: "http://localhost:4000/api/labs/3-race-conditions/optimized",
				concurrency: 500,
				durationSeconds: 3,
			}),
			headers: { "Content-Type": "application/json" },
		});
		await pollStock();
		setOptimizedResult(await res.json());
	};

	const naiveIsNegative = typeof stockNaive === "number" && stockNaive < 0;
	const optimizedIsExact =
		typeof stockOptimized === "number" && stockOptimized === 0;

	return (
		<Lab.Root
			onPrepare={handlePrepareData}
			onRunNaive={handleRunNaive}
			onRunOptimized={handleRunOptimized}
		>
			<Lab.Header
				title="Race Conditions (Pessimistic Locking)"
				description="See what happens when hundreds of concurrent users bypass application logic."
				aside={
					<Lab.ScenarioCard context="500 bots are attempting to buy the last 100 Limited Edition sneakers at the exact same millisecond." />
				}
			/>
			<Lab.Prepare />
			<Lab.BenchmarkGrid>
				<Lab.ProblemCard text="The Naive code reads the stock (100) and checks if it is > 0. Because 500 requests all read '100' at the same time, they all pass the check and deduct 1. The inventory crashes into deep negative numbers." />
				<Lab.SolutionCard text="The Optimized code wraps the check in a Database Transaction with `SELECT ... FOR UPDATE`. This forces the database to lock the row. All 500 requests are forced into a single-file line. Exactly 100 succeed, and 400 are rejected." />
			</Lab.BenchmarkGrid>
			<Lab.Results>
				<div className="grid grid-cols-2 gap-4 mt-2">
					<Card className="border-border">
						<CardContent className="pt-6 pb-6 flex flex-col items-center text-center gap-4">
							<AlertTriangle
								className={`w-8 h-8 ${naiveIsNegative ? "text-destructive" : "text-muted-foreground"}`}
							/>
							<div>
								<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
									Naive Inventory
								</p>
								<div
									className={`text-6xl font-black font-mono ${naiveIsNegative ? "text-destructive" : stockNaive === "—" ? "text-muted-foreground" : "text-foreground"}`}
								>
									{stockNaive}
								</div>
								<div className="flex items-center justify-center gap-2 mt-2">
									<ShoppingCart className="w-4 h-4 text-muted-foreground" />
									<span className="text-xs text-muted-foreground">
										sneakers remaining
									</span>
								</div>
								{naiveIsNegative && (
									<div className="mt-3 inline-flex items-center gap-1.5 bg-destructive/10 rounded-full px-3 py-1">
										<TrendingDown className="w-3.5 h-3.5 text-destructive" />
										<span className="text-xs font-bold text-destructive">
											Oversold by {Math.abs(stockNaive as number)} units!
										</span>
									</div>
								)}
							</div>
							{naiveResult && (
								<div className="w-full bg-muted rounded-lg px-4 py-3 text-xs font-mono grid grid-cols-2 gap-2">
									<div>
										<div className="text-foreground font-bold">
											{naiveResult.successfulRequests.toLocaleString()}
										</div>
										<div className="text-muted-foreground">
											purchases passed
										</div>
									</div>
									<div>
										<div className="text-destructive font-bold">
											{naiveResult.failedRequests.toLocaleString()}
										</div>
										<div className="text-muted-foreground">rejected</div>
									</div>
								</div>
							)}
							{!naiveIsNegative && stockNaive !== "—" && (
								<p className="text-xs text-muted-foreground italic">
									Target: exactly 0 remaining
								</p>
							)}
						</CardContent>
					</Card>

					<Card className="border-border">
						<CardContent className="pt-6 pb-6 flex flex-col items-center text-center gap-4">
							<Lock
								className={`w-8 h-8 ${optimizedIsExact ? "text-foreground" : "text-muted-foreground"}`}
							/>
							<div>
								<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
									Locked Inventory
								</p>
								<div
									className={`text-6xl font-black font-mono ${stockOptimized === "—" ? "text-muted-foreground" : "text-foreground"}`}
								>
									{stockOptimized}
								</div>
								<div className="flex items-center justify-center gap-2 mt-2">
									<ShoppingCart className="w-4 h-4 text-muted-foreground" />
									<span className="text-xs text-muted-foreground">
										sneakers remaining
									</span>
								</div>
								{optimizedIsExact && (
									<div className="mt-3 inline-flex items-center gap-1.5 bg-muted rounded-full px-3 py-1">
										<CheckCircle2 className="w-3.5 h-3.5 text-foreground" />
										<span className="text-xs font-bold text-foreground">
											Exactly 0 — Perfect integrity ✓
										</span>
									</div>
								)}
							</div>
							{optimizedResult && (
								<div className="w-full bg-muted rounded-lg px-4 py-3 text-xs font-mono grid grid-cols-2 gap-2">
									<div>
										<div className="text-foreground font-bold">
											{optimizedResult.successfulRequests.toLocaleString()}
										</div>
										<div className="text-muted-foreground">
											purchases passed
										</div>
									</div>
									<div>
										<div className="text-muted-foreground font-bold">
											{optimizedResult.failedRequests.toLocaleString()}
										</div>
										<div className="text-muted-foreground">safely rejected</div>
									</div>
								</div>
							)}
							{!optimizedIsExact && stockOptimized !== "—" && (
								<p className="text-xs text-muted-foreground italic">
									Target: exactly 0 remaining
								</p>
							)}
						</CardContent>
					</Card>
				</div>
			</Lab.Results>
		</Lab.Root>
	);
}
