import {
	Activity,
	BookOpen,
	Database,
	GitCommit,
	Layers,
	RefreshCw,
	Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import Lab1 from "./components/labs/Lab1";
import Lab2 from "./components/labs/Lab2";
import Lab3 from "./components/labs/Lab3";
import Lab4 from "./components/labs/Lab4";
import Lab5 from "./components/labs/Lab5";

const LABS = [
	{
		id: "1",
		num: "01",
		name: "Missing Indexes",
		tag: "B-Tree Index Scan",
		icon: Database,
	},
	{
		id: "2",
		num: "02",
		name: "Table Partitioning",
		tag: "DROP vs DELETE",
		icon: Layers,
	},
	{
		id: "3",
		num: "03",
		name: "Race Conditions",
		tag: "Pessimistic Locking",
		icon: GitCommit,
	},
	{
		id: "4",
		num: "04",
		name: "Connection Exhaustion",
		tag: "50k WebSockets",
		icon: Activity,
	},
	{
		id: "5",
		num: "05",
		name: "Event Loop Blocking",
		tag: "libuv Thread Pool",
		icon: RefreshCw,
	},
];

const LAB_COMPONENTS: Record<string, React.FC> = {
	"1": Lab1,
	"2": Lab2,
	"3": Lab3,
	"4": Lab4,
	"5": Lab5,
};

export default function App() {
	const [activeLab, setActiveLab] = useState("1");
	const [query, setQuery] = useState("");

	useEffect(() => {
		const hash = window.location.hash.replace("#lab", "");
		if (LABS.find((l) => l.id === hash)) setActiveLab(hash);
	}, []);

	const navigate = (id: string) => {
		window.location.hash = `lab${id}`;
		setActiveLab(id);
	};

	const filtered = useMemo(() => {
		const q = query.toLowerCase().trim();
		if (!q) return LABS;
		return LABS.filter(
			(l) =>
				l.name.toLowerCase().includes(q) || l.tag.toLowerCase().includes(q),
		);
	}, [query]);

	const ActiveLab = LAB_COMPONENTS[activeLab];

	return (
		<div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
			{/* ── Sidebar ── */}
			<aside className="w-60 border-r border-border flex flex-col shrink-0 bg-card">
				{/* Logo */}
				<div className="px-4 py-4 border-b border-border">
					<div className="flex items-center gap-2.5">
						<div className="w-6 h-6 rounded bg-foreground flex items-center justify-center shrink-0">
							<BookOpen className="w-3.5 h-3.5 text-background" />
						</div>
						<span className="text-sm font-semibold tracking-tight">
							Systems Sandbox
						</span>
					</div>
				</div>

				{/* Search */}
				<div className="px-3 py-3 border-b border-border">
					<div className="relative">
						<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
						<Input
							placeholder="Search labs…"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							className="pl-8 h-8 text-xs bg-muted/40 border-transparent focus-visible:border-border focus-visible:ring-0"
						/>
					</div>
				</div>

				{/* Nav */}
				<nav className="flex-1 overflow-y-auto py-2">
					{filtered.length === 0 ? (
						<p className="px-4 py-6 text-xs text-muted-foreground text-center">
							No labs found
						</p>
					) : (
						filtered.map((lab) => {
							const isActive = activeLab === lab.id;
							const Icon = lab.icon;
							return (
								<button
									key={lab.id}
									onClick={() => navigate(lab.id)}
									className={`w-full flex items-center gap-3 px-3 py-2 mx-1 text-left rounded-md transition-colors text-sm ${
										isActive
											? "bg-accent text-accent-foreground font-medium"
											: "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
									}`}
									style={{ width: "calc(100% - 8px)" }}
								>
									<Icon className="w-4 h-4 shrink-0" />
									<span className="flex flex-col min-w-0">
										<span className="truncate leading-snug">{lab.name}</span>
										<span className="text-[10px] text-muted-foreground/70 truncate leading-snug mt-0.5">
											{lab.tag}
										</span>
									</span>
									<span className="ml-auto font-mono text-[10px] text-muted-foreground/50 shrink-0">
										{lab.num}
									</span>
								</button>
							);
						})
					)}
				</nav>

				{/* Footer */}
				<div className="px-4 py-3 border-t border-border">
					<p className="text-[10px] text-muted-foreground/50">
						{LABS.length} labs · Bun + PostgreSQL
					</p>
				</div>
			</aside>

			{/* ── Main Content ── */}
			<main className="flex-1 overflow-y-auto">
				{ActiveLab && <ActiveLab />}
			</main>
		</div>
	);
}
