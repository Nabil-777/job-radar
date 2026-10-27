<script lang="ts">
	import type { Job } from '#lib/types.js';
	import { generatePitch } from '#lib/api.js';
	import { toast } from 'svelte-sonner';
	import {
		X,
		ExternalLink,
		Bookmark,
		Sparkles,
		Copy,
		Check,
		FileText,
		Building,
		MapPin,
		Calendar,
		Mail,
		MessageSquare,
		Send
	} from 'lucide-svelte';

	interface Props {
		job: Job | null;
		onClose: () => void;
		onSave: (job: Job) => void;
		onOpenCvStudio: (job: Job) => void;
		isSaved?: boolean;
	}

	let { job, onClose, onSave, onOpenCvStudio, isSaved = false }: Props = $props();

	type PitchTab = 'cover-letter-fr' | 'cover-letter-en' | 'linkedin' | 'email';
	let activePitchTab = $state<PitchTab>('cover-letter-fr');
	let pitchContent = $state<string>('');
	let isGeneratingPitch = $state<boolean>(false);
	let isCopied = $state<boolean>(false);

	async function loadPitch(tab: PitchTab) {
		if (!job) return;
		activePitchTab = tab;
		isGeneratingPitch = true;
		pitchContent = '';

		try {
			let format: 'cover-letter' | 'linkedin' | 'email' = 'cover-letter';
			let lang: 'fr' | 'en' = 'en';

			if (tab === 'cover-letter-fr') {
				format = 'cover-letter';
				lang = 'fr';
			} else if (tab === 'cover-letter-en') {
				format = 'cover-letter';
				lang = 'en';
			} else if (tab === 'linkedin') {
				format = 'linkedin';
				lang = 'fr';
			} else if (tab === 'email') {
				format = 'email';
				lang = 'fr';
			}

			const result = await generatePitch(job.id, format, lang);
			pitchContent = result;
		} catch (err) {
			console.error(err);
			toast.error('Failed to generate pitch. Using deterministic draft.');
		} finally {
			isGeneratingPitch = false;
		}
	}

	// Load default pitch when drawer opens
	$effect(() => {
		if (job) {
			loadPitch('cover-letter-fr');
		}
	});

	function copyPitch() {
		if (!pitchContent) return;
		navigator.clipboard.writeText(pitchContent);
		isCopied = true;
		toast.success('Copied to clipboard');
		setTimeout(() => (isCopied = false), 2000);
	}
</script>

{#if job}
	<!-- Backdrop -->
	<div
		role="button"
		tabindex="0"
		onclick={onClose}
		onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
		class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity"
	></div>

	<!-- Slide-Over Drawer -->
	<div class="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-surface-1 border-l border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
		<!-- Header -->
		<div class="p-5 border-b border-border flex items-start justify-between gap-4 bg-surface-1">
			<div class="flex-1 min-w-0">
				<div class="flex items-center gap-2 mb-1.5 flex-wrap">
					{#if job.matchScore !== undefined}
						<span class="rounded-[4px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-mono font-semibold text-emerald-400 num">
							{job.matchScore}% ATS Score
						</span>
					{/if}
					{#if job.isFresh}
						<span class="rounded-[4px] bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[11px] font-mono text-emerald-400">
							{job.postedAtLabel || 'Fresh'}
						</span>
					{/if}
					{#if job.contract}
						<span class="rounded-[4px] bg-surface-2 border border-border px-1.5 py-0.5 text-[11px] font-mono uppercase text-text-2">
							{job.contract}
						</span>
					{/if}
				</div>

				<h2 class="text-lg font-bold text-text-1 leading-snug">
					{job.title}
				</h2>

				<div class="flex items-center gap-3 text-xs text-text-2 mt-1">
					<span class="font-medium text-text-1 inline-flex items-center gap-1">
						<Building class="h-3.5 w-3.5 text-text-3" />
						{job.company}
					</span>
					<span>•</span>
					<span class="inline-flex items-center gap-1">
						<MapPin class="h-3.5 w-3.5 text-text-3" />
						{job.location}
					</span>
				</div>
			</div>

			<div class="flex items-center gap-1.5">
				<button
					type="button"
					onclick={onClose}
					class="h-8 w-8 rounded-[6px] border border-border bg-surface-2 hover:bg-surface-3 text-text-2 hover:text-text-1 inline-flex items-center justify-center transition-colors"
				>
					<X class="h-4 w-4" />
				</button>
			</div>
		</div>

		<!-- Action Strip -->
		<div class="px-5 py-3 border-b border-border bg-surface-2/50 flex items-center justify-between gap-3 flex-wrap">
			<div class="flex items-center gap-2">
				<button
					type="button"
					onclick={() => onSave(job)}
					class={`h-8 px-3 rounded-[6px] border text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
						isSaved
							? 'bg-brand-500/10 border-brand-500/30 text-brand-400'
							: 'bg-surface-1 border-border text-text-1 hover:bg-surface-2'
					}`}
				>
					<Bookmark class="h-3.5 w-3.5" />
					<span>{isSaved ? 'Saved to Tracker' : 'Save to Tracker'}</span>
				</button>

				<button
					type="button"
					onclick={() => onOpenCvStudio(job)}
					class="h-8 px-3 rounded-[6px] bg-brand-500 text-white hover:bg-brand-600 text-xs font-medium inline-flex items-center gap-1.5 transition-colors shadow-sm"
				>
					<FileText class="h-3.5 w-3.5" />
					<span>Tailored CV Studio & PDF</span>
				</button>
			</div>

			{#if job.url}
				<a
					href={job.url}
					target="_blank"
					rel="noreferrer"
					class="h-8 px-3 rounded-[6px] border border-border bg-surface-1 hover:bg-surface-2 text-text-1 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
				>
					<span>Apply on Portal</span>
					<ExternalLink class="h-3.5 w-3.5 text-text-3" />
				</a>
			{/if}
		</div>

		<!-- Body Content -->
		<div class="flex-1 overflow-y-auto p-5 space-y-6">
			<!-- Skills Match Breakdown -->
			<div class="rounded-[8px] border border-border bg-surface-2/30 p-4 space-y-3">
				<h4 class="text-xs font-semibold uppercase tracking-wider text-text-2">
					Stack & Match Breakdown
				</h4>
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
					<div>
						<span class="text-[11px] font-mono text-emerald-400 block mb-1.5">✓ Matched Stack</span>
						<div class="flex items-center gap-1.5 flex-wrap">
							{#each (job.matchedSkills || []) as skill}
								<span class="rounded-[4px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-mono text-emerald-300">
									{skill}
								</span>
							{:else}
								<span class="text-text-3 text-[11px]">Upload CV to score stack</span>
							{/each}
						</div>
					</div>

					<div>
						<span class="text-[11px] font-mono text-amber-400 block mb-1.5">⚠ Skills to Highlight</span>
						<div class="flex items-center gap-1.5 flex-wrap">
							{#each (job.missingSkills || []) as skill}
								<span class="rounded-[4px] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] font-mono text-amber-300">
									{skill}
								</span>
							{:else}
								<span class="text-text-3 text-[11px]">Full stack coverage</span>
							{/each}
						</div>
					</div>
				</div>
			</div>

			<!-- 4-in-1 AI Pitch Suite -->
			<div class="rounded-[8px] border border-border bg-surface-1 p-4 space-y-3">
				<div class="flex items-center justify-between gap-3">
					<div class="flex items-center gap-2">
						<Sparkles class="h-4 w-4 text-brand-400" />
						<h4 class="text-xs font-semibold text-text-1 uppercase tracking-wider">
							4-in-1 Pitch Suite
						</h4>
					</div>

					<button
						type="button"
						onclick={copyPitch}
						disabled={!pitchContent || isGeneratingPitch}
						class="h-7 px-2.5 rounded-[4px] border border-border bg-surface-2 hover:bg-surface-3 text-text-2 text-xs font-mono inline-flex items-center gap-1.5 disabled:opacity-50"
					>
						{#if isCopied}
							<Check class="h-3 w-3 text-emerald-400" />
							<span class="text-emerald-400">Copied</span>
						{:else}
							<Copy class="h-3 w-3" />
							<span>Copy</span>
						{/if}
					</button>
				</div>

				<!-- Pitch Tabs -->
				<div class="flex items-center gap-1 border-b border-border pb-2 flex-wrap">
					<button
						type="button"
						onclick={() => loadPitch('cover-letter-fr')}
						class={`h-7 px-2.5 rounded-[4px] text-xs transition-colors ${
							activePitchTab === 'cover-letter-fr'
								? 'bg-brand-500 text-white font-medium'
								: 'text-text-2 hover:bg-surface-2'
						}`}
					>
						🇫🇷 Lettre de Motivation
					</button>

					<button
						type="button"
						onclick={() => loadPitch('cover-letter-en')}
						class={`h-7 px-2.5 rounded-[4px] text-xs transition-colors ${
							activePitchTab === 'cover-letter-en'
								? 'bg-brand-500 text-white font-medium'
								: 'text-text-2 hover:bg-surface-2'
						}`}
					>
						🇬🇧 Cover Letter
					</button>

					<button
						type="button"
						onclick={() => loadPitch('linkedin')}
						class={`h-7 px-2.5 rounded-[4px] text-xs transition-colors ${
							activePitchTab === 'linkedin'
								? 'bg-brand-500 text-white font-medium'
								: 'text-text-2 hover:bg-surface-2'
						}`}
					>
						💼 LinkedIn DM
					</button>

					<button
						type="button"
						onclick={() => loadPitch('email')}
						class={`h-7 px-2.5 rounded-[4px] text-xs transition-colors ${
							activePitchTab === 'email'
								? 'bg-brand-500 text-white font-medium'
								: 'text-text-2 hover:bg-surface-2'
						}`}
					>
						✉️ Cold Email
					</button>
				</div>

				<!-- Pitch Content Box -->
				<div class="relative min-h-[160px] rounded-[6px] border border-border bg-surface-2/40 p-3.5 text-xs text-text-1 font-sans leading-relaxed whitespace-pre-wrap select-text">
					{#if isGeneratingPitch}
						<div class="flex items-center justify-center py-10 gap-2 text-text-3 font-mono text-xs">
							<Sparkles class="h-4 w-4 animate-spin text-brand-400" />
							<span>Tailoring application pitch to role...</span>
						</div>
					{:else if pitchContent}
						{pitchContent}
					{:else}
						<span class="text-text-3">No pitch generated.</span>
					{/if}
				</div>
			</div>

			<!-- Full Job Description -->
			<div class="space-y-2">
				<h4 class="text-xs font-semibold uppercase tracking-wider text-text-2">
					Job Description
				</h4>
				<div class="rounded-[8px] border border-border bg-surface-2/20 p-4 text-xs text-text-1 font-sans leading-relaxed whitespace-pre-wrap select-text">
					{job.description || 'No detailed description provided by provider.'}
				</div>
			</div>
		</div>
	</div>
{/if}
