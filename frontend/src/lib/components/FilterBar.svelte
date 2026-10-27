<script lang="ts">
	import { Search, RotateCw, Sparkles, Filter, Calendar, Briefcase, Layers } from 'lucide-svelte';

	interface Props {
		searchQuery: string;
		selectedDomain: string;
		selectedContract: string;
		selectedDate: string;
		isFreshOnly: boolean;
		totalCount: number;
		internCount: number;
		juniorCount: number;
		isSyncing: boolean;
		onSearchChange: (q: string) => void;
		onDomainChange: (d: string) => void;
		onContractChange: (c: string) => void;
		onDateChange: (date: string) => void;
		onFreshToggle: (fresh: boolean) => void;
		onSync: () => void;
	}

	let {
		searchQuery,
		selectedDomain,
		selectedContract,
		selectedDate,
		isFreshOnly,
		totalCount,
		internCount,
		juniorCount,
		isSyncing,
		onSearchChange,
		onDomainChange,
		onContractChange,
		onDateChange,
		onFreshToggle,
		onSync
	}: Props = $props();

	const DOMAINS = [
		{ id: 'all', label: 'All Domains' },
		{ id: 'fullstack', label: 'Fullstack' },
		{ id: 'frontend', label: 'Frontend' },
		{ id: 'backend', label: 'Backend' },
		{ id: 'ai', label: 'AI & Data' },
		{ id: 'cloud', label: 'DevOps & Cloud' },
		{ id: 'mobile', label: 'Mobile' },
		{ id: 'security', label: 'Security' }
	];

	const CONTRACTS = [
		{ id: 'all', label: 'All Contracts' },
		{ id: 'cdi', label: 'CDI' },
		{ id: 'stage', label: 'Stage / PFE' },
		{ id: 'freelance', label: 'Freelance / B2B' }
	];

	const DATES = [
		{ id: 'all', label: 'Any Date' },
		{ id: '1', label: 'Last 24 hours' },
		{ id: '3', label: 'Last 3 days' },
		{ id: '7', label: 'Last 7 days' },
		{ id: '14', label: 'Last 14 days' },
		{ id: '30', label: 'Last 30 days' }
	];
</script>

<div class="space-y-3">
	<!-- Top Bar: Search Input + Sweep Button -->
	<div class="flex items-center gap-3">
		<div class="relative flex-1">
			<Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-3" />
			<input
				type="text"
				value={searchQuery}
				oninput={(e) => onSearchChange((e.target as HTMLInputElement).value)}
				placeholder="Search titles, tech stack (e.g. Svelte 5, Python, Docker), company, or city..."
				class="w-full rounded-[6px] border border-border bg-surface-1 py-2 pl-10 pr-4 text-sm text-text-1 placeholder:text-text-3 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
			/>
		</div>

		<button
			type="button"
			onclick={onSync}
			disabled={isSyncing}
			class="h-9 px-3.5 rounded-[6px] border border-border bg-surface-1 hover:bg-surface-2 text-text-1 text-xs font-medium inline-flex items-center gap-2 shrink-0 transition-colors disabled:opacity-50"
			title="Autonomous radar scan across 19 providers"
		>
			<RotateCw class={`h-3.5 w-3.5 text-brand-400 ${isSyncing ? 'animate-spin' : ''}`} />
			<span class="hidden sm:inline">{isSyncing ? 'Scanning...' : 'Sync Radar'}</span>
		</button>
	</div>

	<!-- Bottom Bar: Filter Dropdowns + Freshness Pill + Stats -->
	<div class="flex items-center justify-between gap-3 flex-wrap text-xs">
		<div class="flex items-center gap-2 flex-wrap">
			<!-- Domain Dropdown -->
			<select
				value={selectedDomain}
				onchange={(e) => onDomainChange((e.target as HTMLSelectElement).value)}
				class="h-8 rounded-[6px] border border-border bg-surface-1 px-2.5 text-xs text-text-1 focus:border-brand-500 focus:outline-none cursor-pointer"
			>
				{#each DOMAINS as domain}
					<option value={domain.id}>{domain.label}</option>
				{/each}
			</select>

			<!-- Contract Dropdown -->
			<select
				value={selectedContract}
				onchange={(e) => onContractChange((e.target as HTMLSelectElement).value)}
				class="h-8 rounded-[6px] border border-border bg-surface-1 px-2.5 text-xs text-text-1 focus:border-brand-500 focus:outline-none cursor-pointer"
			>
				{#each CONTRACTS as contract}
					<option value={contract.id}>{contract.label}</option>
				{/each}
			</select>

			<!-- Date Posted Dropdown -->
			<select
				value={selectedDate}
				onchange={(e) => onDateChange((e.target as HTMLSelectElement).value)}
				class="h-8 rounded-[6px] border border-border bg-surface-1 px-2.5 text-xs text-text-1 focus:border-brand-500 focus:outline-none cursor-pointer"
			>
				{#each DATES as date}
					<option value={date.id}>{date.label}</option>
				{/each}
			</select>

			<!-- Freshness Only Pill -->
			<button
				type="button"
				onclick={() => onFreshToggle(!isFreshOnly)}
				class={`h-8 px-2.5 rounded-[6px] border inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
					isFreshOnly
						? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-medium'
						: 'bg-surface-1 border-border text-text-2 hover:bg-surface-2'
				}`}
			>
				<span class={`h-2 w-2 rounded-full ${isFreshOnly ? 'bg-emerald-400 animate-pulse' : 'bg-text-3'}`}></span>
				<span>Fresh Only (≤ 30d)</span>
			</button>
		</div>

		<!-- Feed Stats -->
		<div class="flex items-center gap-2 font-mono text-[11px] text-text-3 shrink-0">
			<span>Found <strong class="text-text-1 num">{totalCount}</strong> roles</span>
			<span>•</span>
			<span class="text-emerald-400"><strong class="num">{internCount}</strong> Stages/PFE</span>
			<span>•</span>
			<span class="text-brand-400"><strong class="num">{juniorCount}</strong> Junior</span>
		</div>
	</div>
</div>
