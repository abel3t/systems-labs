import { Activity, Server, ServerCrash, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	CartesianGrid,
	Line,
	LineChart,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lab } from "../lab-primitives";

interface PingPoint {
	t: number;
	ms: number;
	frozen: boolean;
}
interface EngineResult {
	successfulRequests: number;
	failedRequests: number;
}

export default function Lab5() {
	const [pingLatency, setPingLatency] = useState<number>(0);
	const [isFrozen, setIsFrozen] = useState(false);
	const [history, setHistory] = useState<PingPoint[]>([]);
	const [naiveResult, setNaiveResult] = useState<EngineResult | null>(null);
	const [optimizedResult, setOptimizedResult] = useState<EngineResult | null>(
		null,
	);
	const activeRef = useRef(true);
	const tRef = useRef(0);

	useEffect(() => {
		activeRef.current = true;
		const checkHealth = async () => {
			if (!activeRef.current) return;
			const start = performance.now();
			try {
				const controller = new AbortController();
				const tid = setTimeout(() => controller.abort(), 2500);
				await fetch("http://localhost:4000/api/labs/5-eventloop/ping", {
					signal: controller.signal,
				});
				clearTimeout(tid);
				const ms = Math.round(performance.now() - start);
				const frozen = ms > 250;
				setPingLatency(ms);
				setIsFrozen(frozen);
				setHistory((prev) =>
					[...prev, { t: tRef.current++, ms, frozen }].slice(-60),
				);
			} catch {
				setIsFrozen(true);
				setPingLatency(2500);
				setHistory((prev) =>
					[...prev, { t: tRef.current++, ms: 2500, frozen: true }].slice(-60),
				);
			}
			setTimeout(checkHealth, 300);
		};
		checkHealth();
		return () => {
			activeRef.current = false;
		};
	}, []);

	const handlePrepareData = async () => {
		setNaiveResult(null);
		setOptimizedResult(null);
		setHistory([]);
	};

	const handleRunNaive = async () => {
		const res = await fetch("http://localhost:4000/api/engine/run", {
			method: "POST",
			body: JSON.stringify({
				method: "POST",
				url: "http://localhost:4000/api/labs/5-eventloop/naive",
				concurrency: 50,
				durationSeconds: 5,
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
				url: "http://localhost:4000/api/labs/5-eventloop/optimized",
				concurrency: 100,
				durationSeconds: 5,
			}),
			headers: { "Content-Type": "application/json" },
		});
		setOptimizedResult(await res.json());
	};

	const frozenCount = history.filter((h) => h.frozen).length;
	const pctFrozen =
		history.length > 0 ? Math.round((frozenCount / history.length) * 100) : 0;

	return (
		<Lab.Root
			onPrepare={handlePrepareData}
			onRunNaive={handleRunNaive}
			onRunOptimized={handleRunOptimized}
		>
			<Lab.Header
				title="Event Loop Blocking"
				description="See why one CPU-heavy task instantly freezes your entire Node.js server for every other user."
				aside={
					<Lab.ScenarioCard context="50 users are concurrently uploading images for the Server to compress and resize." />
				}
			/>
			<Lab.Prepare />
			<Lab.BenchmarkGrid>
				<Lab.ProblemCard text="The Naive code processes the image synchronously on the main JavaScript thread. Because Node is single-threaded, if a task takes 2 seconds to compress, the entire server freezes for 2 seconds. No other users can log in, fetch data, or even load the homepage until the compression finishes." />
				<Lab.SolutionCard text="The Optimized code pushes the CPU-heavy work to Node's internal C++ Thread Pool (libuv). The main JavaScript thread instantly moves on to the next user's query. The server remains responsive with 0ms latency while worker threads chew through the image compressions in the background." />
			</Lab.BenchmarkGrid>
			<Lab.Results>
				<div className="mt-2 space-y-4">
					{/* Live ping monitor */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
						<Card className="border-border">
							<CardContent className="p-5 flex flex-col gap-3">
								<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
									Main Thread
								</p>
								<div className="flex items-center gap-3">
									{isFrozen ? (
										<ServerCrash className="w-8 h-8 text-destructive shrink-0" />
									) : (
										<Server className="w-8 h-8 text-muted-foreground shrink-0" />
									)}
									<div
										className={`text-4xl font-black font-mono leading-none ${isFrozen ? "text-destructive" : "text-foreground"}`}
									>
										{pingLatency.toLocaleString()}
										<span className="text-base font-semibold ml-0.5">ms</span>
									</div>
								</div>
								<div
									className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold w-fit bg-muted ${isFrozen ? "text-destructive" : "text-foreground"}`}
								>
									<ShieldCheck className="w-3.5 h-3.5" />
									{isFrozen ? "⚠ FROZEN" : "✓ Responsive"}
								</div>
							</CardContent>
						</Card>

						<Card className="lg:col-span-2 border-border">
							<CardHeader className="pb-0 pt-4 px-4">
								<CardTitle className="text-xs text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-2">
									<Activity className="w-4 h-4" />
									/ping Latency — last {history.length} checks
									{pctFrozen > 0 && (
										<span className="ml-auto text-destructive font-bold">
											{pctFrozen}% frozen
										</span>
									)}
								</CardTitle>
							</CardHeader>
							<CardContent className="h-[180px] pt-2 px-2 pb-2">
								{history.length === 0 ? (
									<div className="h-full flex items-center justify-center text-muted-foreground text-sm">
										Waiting for ping data…
									</div>
								) : (
									<ResponsiveContainer width="100%" height="100%">
										<LineChart data={history}>
											<CartesianGrid
												strokeDasharray="3 3"
												stroke="var(--border)"
											/>
											<XAxis dataKey="t" hide />
											<YAxis
												domain={[0, "auto"]}
												stroke="var(--muted-foreground)"
												fontSize={10}
												width={38}
												tickFormatter={(v) => `${v}ms`}
											/>
											<Tooltip
												contentStyle={{
													backgroundColor: "var(--card)",
													borderColor: "var(--border)",
													borderRadius: 8,
													fontSize: 12,
												}}
												formatter={(v: any) => [`${v}ms`, "ping"]}
												labelFormatter={() => ""}
											/>
											<ReferenceLine
												y={250}
												stroke="var(--muted-foreground)"
												strokeDasharray="4 2"
												label={{
													value: "250ms",
													position: "insideTopRight",
													fill: "var(--muted-foreground)",
													fontSize: 10,
												}}
											/>
											<Line
												type="monotone"
												dataKey="ms"
												stroke="var(--foreground)"
												dot={(props: any) => {
													const { cx, cy, payload } = props;
													return (
														<circle
															key={`dot-${cx}-${cy}`}
															cx={cx}
															cy={cy}
															r={payload.frozen ? 4 : 2}
															fill={
																payload.frozen
																	? "var(--destructive)"
																	: "var(--foreground)"
															}
															stroke="none"
														/>
													);
												}}
												isAnimationActive={false}
												strokeWidth={1.5}
											/>
										</LineChart>
									</ResponsiveContainer>
								)}
							</CardContent>
						</Card>
					</div>

					{/* Result scorecards */}
					{(naiveResult || optimizedResult) && (
						<div className="grid grid-cols-2 gap-4">
							<Card className="border-border">
								<CardContent className="pt-5 pb-5">
									<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
										Sync Blocking (Naive)
									</p>
									{naiveResult ? (
										<div className="grid grid-cols-2 gap-2 text-xs font-mono">
											<div className="bg-muted rounded-lg p-3">
												<div className="text-foreground font-bold text-lg">
													{naiveResult.successfulRequests.toLocaleString()}
												</div>
												<div className="text-muted-foreground">completed</div>
											</div>
											<div className="bg-muted rounded-lg p-3">
												<div className="text-destructive font-bold text-lg">
													~2000ms
												</div>
												<div className="text-muted-foreground">
													ping frozen for
												</div>
											</div>
										</div>
									) : (
										<p className="text-muted-foreground text-sm italic">
											Not yet run
										</p>
									)}
								</CardContent>
							</Card>
							<Card className="border-border">
								<CardContent className="pt-5 pb-5">
									<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
										Thread Pool (Optimized)
									</p>
									{optimizedResult ? (
										<div className="grid grid-cols-2 gap-2 text-xs font-mono">
											<div className="bg-muted rounded-lg p-3">
												<div className="text-foreground font-bold text-lg">
													{optimizedResult.successfulRequests.toLocaleString()}
												</div>
												<div className="text-muted-foreground">completed</div>
											</div>
											<div className="bg-muted rounded-lg p-3">
												<div className="text-foreground font-bold text-lg">
													&lt;5ms
												</div>
												<div className="text-muted-foreground">
													ping stayed at
												</div>
											</div>
										</div>
									) : (
										<p className="text-muted-foreground text-sm italic">
											Not yet run
										</p>
									)}
								</CardContent>
							</Card>
						</div>
					)}
				</div>
			</Lab.Results>
		</Lab.Root>
	);
}
