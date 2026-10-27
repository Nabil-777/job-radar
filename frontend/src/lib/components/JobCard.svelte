<script lang="ts">
	import type { Job } from '#lib/types.js';
	import Button from '#lib/components/ui/button.svelte';
	import { ExternalLink, Bookmark, Sparkles, MapPin, Building, Calendar, CheckCircle } from 'lucide-svelte';

	interface Props {
		job: Job;
		onSelect: (job: Job) => void;
		onSave: (job: Job) => void;
		isSaved?: boolean;
	}

	let { job, onSelect, onSave, isSaved = false }: Props = $props();

	const isMorocco = $derived(
		job.location &&
		(job.location.toLowerCase().includes('morocco') ||
		 job.location.toLowerCase().includes('maroc') ||
		 job.location.toLowerCase().includes('casablanca') ||
		 job.location.toLowerCase().includes('rabat') ||
		 job.location.toLowerCase().includes('tanger'))
	);

	const scoreColor = $derived(
		(job.matchScore ?? 0) >= 80
			? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
			: (job.matchScore ?? 0) >= 60
			? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
			: 'text-text-2 bg-surface-2 border-border'
	);
</script>

<div
	role="button"
	tabindex="0"
	onclick={() => onSelect(job)}
	onkeydown={(e) => { if (e.key === 'Enter') onSelect(job); }}
	class="group relative rounded-[8px] border border-border bg-surface-1 p-4.5 transition-all duration-150 ease-out hover:border-border-strong hover:bg-surface-2 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
>
	<div class="flex items-start justify-between gap-4">
		<div class="flex-1 min-w-0">
			<!-- Header Line: Badges -->
			<div class="flex items-center gap-2 flex-wrap mb-1.5">
				{#if job.isFresh}
					<span class="inline-flex items-center gap-1 rounded-[4px] bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[11px] font-mono font-medium text-emerald-400">
						<span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
						{job.postedAtLabel || 'Fresh'}
					</span>
				{:else if job.postedAtLabel}
					<span class="inline-flex items-center gap-1 rounded-[4px] bg-surface-2 border border-border px-1.5 py-0.5 text-[11px] font-mono text-text-2">
						<Calendar class="h-3 w-3" />
						{job.postedAtLabel}
					</span>
				{/if}

				{#if isMorocco}
					<span class="inline-flex items-center gap-1 rounded-[4px] bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 text-[11px] font-medium text-red-400">
						🇲🇦 Morocco Hub
					</span>
				{/if}

				{#if job.contract}
					<span class="rounded-[4px] bg-surface-2 border border-border px-1.5 py-0.5 text-[11px] font-mono uppercase text-text-2">
						{job.contract}
					</span>
				{/if}

				{#if job.source}
					<span class="text-[11px] font-mono text-text-3">
						via {job.source}
					</span>
				{/if}
			</div>

			<!-- Job Title -->
			<h3 class="text-[15px] font-semibold text-text-1 group-hover:text-brand-500 transition-colors leading-snug truncate">
				{job.title}
			</h3>

			<!-- Company & Location -->
			<div class="flex items-center gap-3 text-xs text-text-2 mt-1">
				<span class="inline-flex items-center gap-1 font-medium text-text-1">
					<Building class="h-3.5 w-3.5 text-text-3" />
					{job.company}
				</span>
				<span>•</span>
				<span class="inline-flex items-center gap-1">
					<MapPin class="h-3.5 w-3.5 text-text-3" />
					{job.location}
				</span>
			</div>

			<!-- Tech Stack Tags -->
			{#if job.matchedSkills && job.matchedSkills.length > 0}
				<div class="flex items-center gap-1.5 flex-wrap mt-3">
					{#each job.matchedSkills.slice(0, 6) as skill}
						<span class="rounded-[4px] bg-surface-3/80 border border-border px-2 py-0.5 text-[11.5px] font-mono text-text-2">
							{skill}
						</span>
					{/each}
					{#if job.matchedSkills.length > 6}
						<span class="text-[11px] font-mono text-text-3">
							+{job.matchedSkills.length - 6} more
						</span>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Match Score & Actions -->
		<div class="flex flex-col items-end gap-2 shrink-0">
			{#if job.matchScore !== undefined}
				<div class="flex flex-col items-end">
					<div class={`rounded-[6px] border px-2 py-0.5 text-xs font-mono font-semibold num ${scoreColor}`}>
						{job.matchScore}%
					</div>
					<span class="text-[10px] uppercase font-mono tracking-wider text-text-3 mt-0.5">Match</span>
				</div>
			{/if}

			<div class="flex items-center gap-1.5 mt-2">
				<button
					type="button"
					onclick={(e) => { e.stopPropagation(); onSave(job); }}
					class={`h-7 px-2 text-xs rounded-[4px] border inline-flex items-center gap-1 transition-colors ${
						isSaved
							? 'bg-brand-500/10 border-brand-500/30 text-brand-400'
							: 'bg-surface-2 border-border text-text-2 hover:bg-surface-3 hover:text-text-1'
					}`}
					title={isSaved ? 'Saved to Tracker' : 'Save to Tracker'}
				>
					<Bookmark class="h-3 w-3" />
					<span class="hidden sm:inline">{isSaved ? 'Saved' : 'Track'}</span>
				</button>

				{#if job.url}
					<a
						href={job.url}
						target="_blank"
						rel="noreferrer"
						onclick={(e) => e.stopPropagation()}
						class="h-7 px-2.5 text-xs rounded-[4px] bg-brand-500 text-white font-medium hover:bg-brand-600 inline-flex items-center gap-1 transition-colors"
						title="Apply Directly"
					>
						<span>Apply</span>
						<ExternalLink class="h-3 w-3" />
					</a>
				{/if}
			</div>
		</div>
	</div>
</div>
