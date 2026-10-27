<script lang="ts">
	import type { Application, ApplicationStage } from '#lib/types.js';
	import { updateApplicationStage, deleteApplication } from '#lib/api.js';
	import { toast } from 'svelte-sonner';
	import { Building, MapPin, ExternalLink, Trash2, ArrowRight, Layers } from 'lucide-svelte';

	interface Props {
		applications: Application[];
		onRefresh: () => void;
	}

	let { applications, onRefresh }: Props = $props();

	const STAGES: { id: ApplicationStage; label: string; color: string }[] = [
		{ id: 'saved', label: 'Saved', color: 'border-zinc-500/30 text-zinc-400 bg-zinc-500/10' },
		{ id: 'applied', label: 'Applied', color: 'border-blue-500/30 text-blue-400 bg-blue-500/10' },
		{ id: 'screening', label: 'Screening', color: 'border-purple-500/30 text-purple-400 bg-purple-500/10' },
		{ id: 'interview', label: 'Interview', color: 'border-amber-500/30 text-amber-400 bg-amber-500/10' },
		{ id: 'offer', label: 'Offer', color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' },
		{ id: 'rejected', label: 'Rejected', color: 'border-red-500/30 text-red-400 bg-red-500/10' }
	];

	async function moveStage(id: string, stage: ApplicationStage) {
		try {
			await updateApplicationStage(id, stage);
			toast.success(`Moved to ${stage}`);
			onRefresh();
		} catch (err) {
			toast.error('Failed to move stage');
		}
	}

	async function removeApp(id: string) {
		try {
			await deleteApplication(id);
			toast.success('Application removed');
			onRefresh();
		} catch (err) {
			toast.error('Failed to delete application');
		}
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-base font-semibold text-text-1">Application Pipeline</h2>
			<p class="text-xs text-text-3 font-mono">Track and manage every stage of your job hunt</p>
		</div>
		<span class="rounded-[4px] border border-border bg-surface-2 px-2.5 py-1 text-xs font-mono text-text-2 num">
			{applications.length} Total Applications
		</span>
	</div>

	<!-- Kanban Columns Grid -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
		{#each STAGES as col}
			{@const colApps = applications.filter((a) => a.stage === col.id)}
			<div class="rounded-[8px] border border-border bg-surface-1/50 flex flex-col min-h-[380px]">
				<!-- Column Header -->
				<div class="p-3 border-b border-border flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class={`rounded-[4px] border px-2 py-0.5 text-[11px] font-mono font-medium ${col.color}`}>
							{col.label}
						</span>
					</div>
					<span class="text-xs font-mono text-text-3 num">{colApps.length}</span>
				</div>

				<!-- Cards Container -->
				<div class="p-2 space-y-2 flex-1 overflow-y-auto">
					{#each colApps as app}
						<div class="rounded-[6px] border border-border bg-surface-1 p-3 text-xs space-y-2 hover:border-border-strong transition-colors">
							<div>
								<h4 class="font-semibold text-text-1 truncate leading-tight">{app.role}</h4>
								<span class="text-[11px] font-medium text-text-2 truncate block mt-0.5">{app.company}</span>
								{#if app.location}
									<span class="text-[10px] text-text-3 truncate block">{app.location}</span>
								{/if}
							</div>

							<!-- Actions -->
							<div class="flex items-center justify-between pt-1 border-t border-border/50 text-[11px]">
								<select
									value={app.stage}
									onchange={(e) => moveStage(app.id, (e.target as HTMLSelectElement).value as ApplicationStage)}
									class="h-6 rounded-[4px] border border-border bg-surface-2 px-1 text-[10px] text-text-2 focus:outline-none cursor-pointer"
								>
									{#each STAGES as s}
										<option value={s.id}>{s.label}</option>
									{/each}
								</select>

								<div class="flex items-center gap-1">
									{#if app.url}
										<a
											href={app.url}
											target="_blank"
											rel="noreferrer"
											class="h-6 w-6 rounded hover:bg-surface-2 text-text-3 hover:text-text-1 inline-flex items-center justify-center"
											title="Open Job Link"
										>
											<ExternalLink class="h-3 w-3" />
										</a>
									{/if}
									<button
										type="button"
										onclick={() => removeApp(app.id)}
										class="h-6 w-6 rounded hover:bg-red-500/10 text-text-3 hover:text-red-400 inline-flex items-center justify-center transition-colors"
										title="Delete"
									>
										<Trash2 class="h-3 w-3" />
									</button>
								</div>
							</div>
						</div>
					{:else}
						<div class="h-32 flex items-center justify-center text-text-3 text-[11px] font-mono">
							Empty
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>
