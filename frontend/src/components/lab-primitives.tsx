/**
 * lab-primitives.tsx
 *
 * Compound, Radix-style primitive components for the Systems Sandbox labs.
 * State is lifted into <Lab.Root> and shared via React context (useLabCtx).
 * Consumers compose only the parts they need — no monolithic props.
 *
 * Usage:
 *   <Lab.Root onPrepare={...} onRunNaive={...} onRunOptimized={...}>
 *     <Lab.Header title="..." description="..." />
 *     <Lab.ScenarioCard context="..." />
 *     <Lab.Prepare />
 *     <Lab.BenchmarkGrid>
 *       <Lab.ProblemCard text="..." />
 *       <Lab.SolutionCard text="..." />
 *     </Lab.BenchmarkGrid>
 *     <Lab.Results>
 *       -- lab-specific visualisation goes here --
 *     </Lab.Results>
 *   </Lab.Root>
 */

import {
	AlertTriangle,
	CheckCircle2,
	Database,
	Loader2,
	Lock,
	PlayCircle,
	RotateCcw,
} from "lucide-react";
import type React from "react";
import { createContext, useContext, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

// ─────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────

interface LabCtxValue {
	isRunning: boolean;
	loadingPrepare: boolean;
	isPrepared: boolean;
	activeTest: "naive" | "optimized" | null;
	seedProgress: number;
	benchmarksLocked: boolean;
	handlePrepare: () => Promise<void>;
	handleRun: (type: "naive" | "optimized") => Promise<void>;
}

const LabCtx = createContext<LabCtxValue | null>(null);

export function useLabCtx(): LabCtxValue {
	const ctx = useContext(LabCtx);
	if (!ctx) throw new Error("useLabCtx must be used inside <Lab.Root>");
	return ctx;
}

// ─────────────────────────────────────────────────────────────
// Root — provides context, owns all shared state
// ─────────────────────────────────────────────────────────────

interface RootProps {
	onPrepare: () => Promise<void>;
	onRunNaive: () => Promise<void>;
	onRunOptimized: () => Promise<void>;
	children: React.ReactNode;
}

function Root({ onPrepare, onRunNaive, onRunOptimized, children }: RootProps) {
	const [isRunning, setIsRunning] = useState(false);
	const [loadingPrepare, setLoadingPrepare] = useState(false);
	const [isPrepared, setIsPrepared] = useState(false);
	const [activeTest, setActiveTest] = useState<"naive" | "optimized" | null>(
		null,
	);
	const [seedProgress, setSeedProgress] = useState(0);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const startProgress = () => {
		setSeedProgress(0);
		let cur = 0;
		intervalRef.current = setInterval(() => {
			cur += (95 - cur) * 0.04;
			setSeedProgress(Math.min(cur, 95));
		}, 400);
	};

	const finishProgress = () => {
		if (intervalRef.current) clearInterval(intervalRef.current);
		setSeedProgress(100);
		setTimeout(() => setSeedProgress(0), 800);
	};

	const handlePrepare = async () => {
		setLoadingPrepare(true);
		setIsPrepared(false);
		startProgress();
		await onPrepare();
		finishProgress();
		setIsPrepared(true);
		setLoadingPrepare(false);
	};

	const handleRun = async (type: "naive" | "optimized") => {
		setIsRunning(true);
		setActiveTest(type);
		if (type === "naive") await onRunNaive();
		else await onRunOptimized();
		setIsRunning(false);
		setActiveTest(null);
	};

	return (
		<LabCtx.Provider
			value={{
				isRunning,
				loadingPrepare,
				isPrepared,
				activeTest,
				seedProgress,
				benchmarksLocked: loadingPrepare || !isPrepared,
				handlePrepare,
				handleRun,
			}}
		>
			<div className="w-full min-h-screen p-6 md:p-8 max-w-7xl mx-auto space-y-5 animate-in fade-in duration-500">
				{children}
			</div>
		</LabCtx.Provider>
	);
}

// ─────────────────────────────────────────────────────────────
// Header — title + description
// ─────────────────────────────────────────────────────────────

interface HeaderProps {
	title: string;
	description: string;
	aside?: React.ReactNode;
}

function Header({ title, description, aside }: HeaderProps) {
	return (
		<div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
			<div>
				<h1 className="text-3xl md:text-4xl font-bold text-foreground">
					{title}
				</h1>
				<p className="text-muted-foreground text-lg mt-1">{description}</p>
			</div>
			{aside}
		</div>
	);
}

// ─────────────────────────────────────────────────────────────
// ScenarioCard — the "Scenario: …" callout box
// ─────────────────────────────────────────────────────────────

function ScenarioCard({ context }: { context: string }) {
	return (
		<div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 md:max-w-sm shrink-0">
			<Database className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
			<p className="text-sm text-card-foreground leading-relaxed">
				<strong className="text-foreground">Scenario:</strong> {context}
			</p>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────
// Prepare — Step 1 seed banner (reads from context)
// ─────────────────────────────────────────────────────────────

function Prepare() {
	const { loadingPrepare, isPrepared, isRunning, seedProgress, handlePrepare } =
		useLabCtx();

	return (
		<div
			className={`rounded-xl border overflow-hidden transition-colors duration-300 ${
				isPrepared
					? "bg-card border-border"
					: loadingPrepare
						? "bg-card border-border"
						: "bg-card border-border"
			}`}
		>
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5">
				{/* Left: icon + text */}
				<div className="flex items-center gap-3">
					<div
						className={`rounded-full p-2 transition-colors ${
							isPrepared ? "bg-muted" : loadingPrepare ? "bg-muted" : "bg-muted"
						}`}
					>
						{isPrepared ? (
							<CheckCircle2 className="w-5 h-5 text-foreground" />
						) : loadingPrepare ? (
							<Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
						) : (
							<Database className="w-5 h-5 text-muted-foreground" />
						)}
					</div>
					<div>
						<p className="font-semibold text-foreground text-sm">
							Step 1 — Prepare Environment
						</p>
						<p className="text-xs text-muted-foreground mt-0.5">
							{loadingPrepare
								? "Seeding data… benchmarks will unlock when complete."
								: isPrepared
									? "Schema seeded and ready — run a benchmark below."
									: "Seed the isolated database schema before running any benchmarks."}
						</p>
					</div>
				</div>
				{/* Right: button */}
				<Button
					variant="outline"
					className="shrink-0 gap-2 min-w-[160px]"
					onClick={handlePrepare}
					disabled={loadingPrepare || isRunning}
				>
					{loadingPrepare ? (
						<Loader2 className="w-4 h-4 animate-spin" />
					) : (
						<RotateCcw className="w-4 h-4" />
					)}
					{loadingPrepare
						? "Seeding…"
						: isPrepared
							? "Reset & Re-seed"
							: "Reset & Seed Data"}
				</Button>
			</div>
			{/* Progress bar */}
			{loadingPrepare && (
				<div className="px-5 pb-4">
					<Progress value={seedProgress} className="h-1.5" />
					<p className="text-[11px] text-muted-foreground mt-1">
						{seedProgress < 30
							? "Dropping old data…"
							: seedProgress < 65
								? "Inserting rows…"
								: "Almost done…"}
					</p>
				</div>
			)}
		</div>
	);
}

// ─────────────────────────────────────────────────────────────
// BenchmarkGrid — 2-col wrapper for ProblemCard + SolutionCard
// ─────────────────────────────────────────────────────────────

function BenchmarkGrid({ children }: { children: React.ReactNode }) {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{children}</div>
	);
}

// ─────────────────────────────────────────────────────────────
// Shared internals for benchmark cards
// ─────────────────────────────────────────────────────────────

interface BenchCardProps {
	variant: "problem" | "solution";
	text: string;
	label?: string;
	runLabel?: string;
}

function BenchCard({ variant, text, label, runLabel }: BenchCardProps) {
	const { isRunning, benchmarksLocked, loadingPrepare, activeTest, handleRun } =
		useLabCtx();
	const isProblem = variant === "problem";
	const type = isProblem ? "naive" : "optimized";

	const defaultLabel = isProblem ? "The Problem" : "The Fix";
	const defaultRunLabel = isProblem ? "Run Naive" : "Run Optimized";

	return (
		<div className="relative">
			{/* Lock overlay */}
			{benchmarksLocked && (
				<div className="absolute inset-0 z-10 rounded-xl bg-background/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 border border-border">
					{loadingPrepare ? (
						<Skeleton className="h-4 w-48" />
					) : (
						<Lock className="w-5 h-5 text-muted-foreground" />
					)}
					<p className="text-xs text-muted-foreground">
						{loadingPrepare ? "" : "Run Step 1 to unlock"}
					</p>
				</div>
			)}
			{/* Card */}
			<div
				className={`rounded-xl border bg-card flex flex-col h-full transition-opacity duration-300 border-border ${benchmarksLocked ? "opacity-30" : "opacity-100"}`}
			>
				{/* Header */}
				<div className="px-6 pt-5 pb-3">
					<div
						className={`flex items-center gap-2 text-sm font-semibold ${isProblem ? "text-destructive" : "text-foreground"}`}
					>
						{isProblem ? (
							<AlertTriangle className="w-4 h-4" />
						) : (
							<CheckCircle2 className="w-4 h-4" />
						)}
						{label ?? defaultLabel}
					</div>
				</div>
				{/* Body */}
				<div className="px-6 pb-5 flex flex-col flex-1 gap-4 min-h-[220px]">
					<p className="text-sm text-muted-foreground leading-relaxed flex-1">
						{text}
					</p>
					<Button
						variant={isProblem ? "destructive" : "default"}
						className="w-full h-10"
						disabled={isRunning || benchmarksLocked}
						onClick={() => handleRun(type)}
					>
						<PlayCircle className="w-4 h-4 mr-2" />
						{isRunning && activeTest === type
							? "Running…"
							: (runLabel ?? defaultRunLabel)}
					</Button>
				</div>
			</div>
		</div>
	);
}

/** The destructive "naive" benchmark card */
function ProblemCard(props: Omit<BenchCardProps, "variant">) {
	return <BenchCard variant="problem" {...props} />;
}

/** The default "optimized" benchmark card */
function SolutionCard(props: Omit<BenchCardProps, "variant">) {
	return <BenchCard variant="solution" {...props} />;
}

// ─────────────────────────────────────────────────────────────
// Results — wrapper for lab-specific visualisations
// ─────────────────────────────────────────────────────────────

function Results({ children }: { children: React.ReactNode }) {
	return <div className="mt-1">{children}</div>;
}

// ─────────────────────────────────────────────────────────────
// Public namespace export
// ─────────────────────────────────────────────────────────────

export const Lab = {
	Root,
	Header,
	ScenarioCard,
	Prepare,
	BenchmarkGrid,
	ProblemCard,
	SolutionCard,
	Results,
} as const;
