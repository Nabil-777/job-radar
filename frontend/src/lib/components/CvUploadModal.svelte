<script lang="ts">
	import type { UserProfile, StructuredCv } from '#lib/types.js';
	import { uploadCvFile, saveStructuredCv } from '#lib/api.js';
	import { toast } from 'svelte-sonner';
	import { UploadCloud, FileText, CheckCircle, Sparkles, X, AlertCircle } from 'lucide-svelte';

	interface Props {
		isOpen: boolean;
		profile: UserProfile | null;
		onClose: () => void;
		onProfileUpdated: (profile: UserProfile) => void;
	}

	let { isOpen, profile, onClose, onProfileUpdated }: Props = $props();

	let isDragging = $state<boolean>(false);
	let isUploading = $state<boolean>(false);
	let uploadError = $state<string | null>(null);

	async function handleFile(file: File) {
		if (!file.name.toLowerCase().endsWith('.pdf')) {
			uploadError = 'Only PDF resume files are supported';
			toast.error(uploadError);
			return;
		}

		isUploading = true;
		uploadError = null;

		try {
			const res = await uploadCvFile(file);
			if (res.success) {
				toast.success('CV parsed & skills extracted successfully!');
				if (res.structuredCv) {
					onProfileUpdated({
						...profile,
						skills: res.skills || profile?.skills,
						structuredCv: res.structuredCv
					});
				}
				onClose();
			}
		} catch (err: any) {
			console.error(err);
			const msg = err.message || 'Failed to parse CV';
			uploadError = msg;
			toast.error(msg);
		} finally {
			isUploading = false;
		}
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
			handleFile(e.dataTransfer.files[0]);
		}
	}

	function onFileSelected(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			handleFile(target.files[0]);
		}
	}
	const activeSkills = $derived<string[]>(
		Array.isArray(profile?.skills)
			? profile.skills
			: typeof profile?.skills === 'string'
			? (profile.skills as string).split(',').map((s) => s.trim()).filter(Boolean)
			: (profile as any)?.skillsArray || []
	);
</script>

{#if isOpen}
	<div
		role="button"
		tabindex="0"
		onclick={onClose}
		onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
		class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
	></div>

	<div class="fixed inset-x-4 top-20 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[500px] z-50 rounded-[10px] border border-border bg-surface-1 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2.5">
				<div class="h-8 w-8 rounded-[6px] bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
					<UploadCloud class="h-4 w-4" />
				</div>
				<div>
					<h3 class="text-sm font-semibold text-text-1">Upload & Parse CV (PDF)</h3>
					<p class="text-[11px] font-mono text-text-3">Extract real tech skills & score 0-100% matches</p>
				</div>
			</div>
			<button
				type="button"
				onclick={onClose}
				class="h-8 w-8 rounded-[6px] border border-border bg-surface-2 hover:bg-surface-3 text-text-2 hover:text-text-1 inline-flex items-center justify-center transition-colors"
			>
				<X class="h-4 w-4" />
			</button>
		</div>

		<!-- Drop Zone -->
		<label
			ondragover={(e) => { e.preventDefault(); isDragging = true; }}
			ondragleave={() => (isDragging = false)}
			ondrop={onDrop}
			class={`relative flex flex-col items-center justify-center rounded-[8px] border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
				isDragging
					? 'border-brand-500 bg-brand-500/5'
					: 'border-border-strong hover:border-text-3 bg-surface-2/40'
			}`}
		>
			<input type="file" accept=".pdf" onchange={onFileSelected} class="hidden" />

			{#if isUploading}
				<Sparkles class="h-8 w-8 text-brand-400 animate-spin mb-2" />
				<span class="text-xs font-semibold text-text-1">Analyzing Coordinate Layout & Parsing Skills...</span>
				<span class="text-[11px] font-mono text-text-3 mt-1">Extracting contact, companies, PFE projects, and stack</span>
			{:else}
				<FileText class="h-8 w-8 text-text-3 mb-2" />
				<span class="text-xs font-semibold text-text-1">Drag and drop your PDF resume here</span>
				<span class="text-[11px] text-text-3 mt-1">or click to browse local files</span>
				<span class="rounded-[4px] bg-surface-3 border border-border px-2 py-0.5 text-[10px] font-mono text-text-2 mt-3">
					100% Offline Coordinate Parser • No Cloud Data Leaks
				</span>
			{/if}
		</label>

		{#if uploadError}
			<div class="rounded-[6px] border border-red-500/20 bg-red-500/10 p-3 flex items-center gap-2 text-xs text-red-400">
				<AlertCircle class="h-4 w-4 shrink-0" />
				<span>{uploadError}</span>
			</div>
		{/if}

		{#if activeSkills.length > 0}
			<div class="space-y-2 pt-2 border-t border-border">
				<span class="text-[11px] font-mono text-text-3 block uppercase tracking-wider">
					Currently Active Stack ({activeSkills.length})
				</span>
				<div class="flex items-center gap-1.5 flex-wrap max-h-24 overflow-y-auto">
					{#each activeSkills as s}
						<span class="rounded-[4px] bg-surface-2 border border-border px-2 py-0.5 text-[11px] font-mono text-text-2">
							{s}
						</span>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}
