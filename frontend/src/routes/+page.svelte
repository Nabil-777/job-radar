<script lang="ts">
	import Button from '#lib/components/ui/button.svelte';
	import { toast } from 'svelte-sonner';
	import {
		Search,
		Briefcase,
		Terminal,
		Sparkles,
		ShieldCheck,
		ArrowRight,
		ExternalLink,
		Calendar
	} from 'lucide-svelte';

	// Svelte 5 Runes for state management
	let searchQuery = $state('');
	let selectedTab = $state<'fresh' | 'all'>('fresh');

	// Sample opportunities displaying real high-density tabular metadata
	const sampleJobs = [
		{
			id: 'job-1',
			title: 'Fullstack Software Engineer (Stage PFE / Pré-embauche)',
			company: 'Theodo Cloud Labs',
			location: 'Casablanca, Morocco',
			matchScore: 94,
			postedAtLabel: '2h ago',
			isFresh: true,
			dateStatus: 'parsed',
			tags: ['Svelte 5', 'TypeScript', 'Node.js', 'Tailwind']
		},
		{
			id: 'job-2',
			title: 'AI & Backend Systems Engineer',
			company: 'Mistral Partner Hub',
			location: 'Remote / Paris',
			matchScore: 88,
			postedAtLabel: '1 day ago',
			isFresh: true,
			dateStatus: 'parsed',
			tags: ['Python', 'PostgreSQL', 'Docker', 'FastAPI']
		},
		{
			id: 'job-3',
			title: 'DevOps & Cloud Security Analyst',
			company: 'Capgemini Engineering',
			location: 'Rabat, Morocco',
			matchScore: 78,
			postedAtLabel: '3 days ago',
			isFresh: true,
			dateStatus: 'parsed',
			tags: ['Kubernetes', 'Terraform', 'AWS', 'CI/CD']
		}
	];

	function notifyApplied(title: string) {
		toast.success('Application tracked in pipeline', {
			description: title
		});
	}
</script>

<div class="max-w-5xl mx-auto px-6 py-12 flex flex-col gap-10">
	<!-- Top Navigation / Header -->
	<header class="flex items-center justify-between border-b border-border pb-6">
		<div class="flex items-center gap-3">
			<div class="w-8 h-8 rounded-[6px] bg-brand-500 flex items-center justify-center text-white">
				<Terminal size={16} strokeWidth={2} />
			</div>
			<div class="flex items-baseline gap-2">
				<span class="font-sans font-semibold text-sm tracking-tight text-text-1">JobRadar</span>
				<span class="font-mono text-xs text-text-3 num">v2.1.0</span>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<Button variant="outline" size="sm" onclick={() => toast.info('Command Palette (⌘K) ready')}>
				<Search size={14} strokeWidth={1.5} />
				<span class="font-mono text-xs text-text-3">⌘K</span>
			</Button>
			<Button variant="default" size="sm" onclick={() => toast.success('Telemetry & radar sweeps active')}>
				<Sparkles size={14} strokeWidth={1.5} />
				<span>Run Radar Sweep</span>
			</Button>
		</div>
	</header>

	<!-- Editorial Hero (The Rayban Accent) -->
	<section class="flex flex-col gap-3 max-w-2xl">
		<div class="flex items-center gap-2">
			<span class="h-2 w-2 rounded-full bg-emerald-500"></span>
			<span class="font-mono text-xs text-text-3 uppercase tracking-wider">Live Aggregator Active</span>
		</div>
		<h1 class="font-serif italic text-4xl tracking-tight text-text-1 leading-tight">
			Fresh jobs, matched to your stack.
		</h1>
		<p class="font-sans text-sm text-text-2 leading-relaxed">
			Autonomous radar tracking Moroccan PFE internships, junior software roles, and global remote engineering positions. Zero hallucinations, coordinate-aware CV parsing.
		</p>
	</section>

	<!-- Live Metrics Row (High Density, Linear Style) -->
	<section class="grid grid-cols-1 sm:grid-cols-4 gap-3">
		<div class="p-4 rounded-[6px] border border-border bg-surface-1 flex flex-col gap-1">
			<span class="text-xs text-text-3 font-medium uppercase tracking-wider">Indexed Roles</span>
			<span class="font-mono text-2xl font-semibold text-text-1 num">1,482</span>
		</div>
		<div class="p-4 rounded-[6px] border border-border bg-surface-1 flex flex-col gap-1">
			<span class="text-xs text-text-3 font-medium uppercase tracking-wider">Average Match</span>
			<span class="font-mono text-2xl font-semibold text-brand-500 num">86.4%</span>
		</div>
		<div class="p-4 rounded-[6px] border border-border bg-surface-1 flex flex-col gap-1">
			<span class="text-xs text-text-3 font-medium uppercase tracking-wider">Active Boards</span>
			<span class="font-mono text-2xl font-semibold text-text-1 num">19</span>
		</div>
		<div class="p-4 rounded-[6px] border border-border bg-surface-1 flex flex-col gap-1">
			<span class="text-xs text-text-3 font-medium uppercase tracking-wider">Pipeline Tracked</span>
			<span class="font-mono text-2xl font-semibold text-text-1 num">14</span>
		</div>
	</section>

	<!-- Feed Controls & Filter Tabs -->
	<section class="flex flex-col gap-4">
		<div class="flex items-center justify-between border-b border-border pb-3">
			<div class="flex items-center gap-2">
				<button
					class="px-3 py-1.5 rounded-[4px] text-xs font-medium transition-all duration-150 {selectedTab === 'fresh' ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-1'}"
					onclick={() => (selectedTab = 'fresh')}
				>
					Fresh Opportunities (≤ 30d)
				</button>
				<button
					class="px-3 py-1.5 rounded-[4px] text-xs font-medium transition-all duration-150 {selectedTab === 'all' ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-1'}"
					onclick={() => (selectedTab = 'all')}
				>
					All Active Listings
				</button>
			</div>

			<div class="flex items-center gap-2 font-mono text-xs text-text-3">
				<Calendar size={13} strokeWidth={1.5} />
				<span>Strict staleness cutoff: 90d</span>
			</div>
		</div>

		<!-- Job Cards List -->
		<div class="flex flex-col gap-2">
			{#each sampleJobs as job}
				<div class="p-4 rounded-[6px] border border-border bg-surface-1 hover:border-brand-500/50 transition-all duration-150 flex items-center justify-between gap-4">
					<div class="flex flex-col gap-1.5 min-w-0">
						<div class="flex items-center gap-2 flex-wrap">
							<h3 class="font-sans font-medium text-sm text-text-1 truncate">{job.title}</h3>
							<span class="px-2 py-0.5 rounded-[4px] text-xs font-medium bg-emerald-500/10 text-emerald-400 font-mono">
								🟢 {job.postedAtLabel}
							</span>
						</div>

						<div class="flex items-center gap-2 text-xs text-text-2">
							<span class="font-medium text-text-1">{job.company}</span>
							<span>•</span>
							<span>{job.location}</span>
						</div>

						<div class="flex items-center gap-1.5 mt-1 flex-wrap">
							{#each job.tags as tag}
								<span class="px-2 py-0.5 rounded-[4px] text-[11px] font-mono bg-surface-2 text-text-2 border border-border">
									{tag}
								</span>
							{/each}
						</div>
					</div>

					<div class="flex items-center gap-4 shrink-0">
						<div class="flex flex-col items-end">
							<span class="font-mono text-sm font-semibold text-brand-500 num">{job.matchScore}%</span>
							<span class="text-[11px] text-text-3 uppercase tracking-wider font-mono">Score</span>
						</div>

						<div class="flex items-center gap-2">
							<Button variant="outline" size="sm" onclick={() => notifyApplied(job.title)}>
								<span>Save</span>
							</Button>
							<Button variant="default" size="sm" onclick={() => toast.info(`Opening original application for ${job.company}`)}>
								<span>Apply</span>
								<ExternalLink size={13} strokeWidth={1.5} />
							</Button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</section>
</div>
