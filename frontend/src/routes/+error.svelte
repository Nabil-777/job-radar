<script lang="ts">
	import { page } from '$app/state';
	import { RotateCw, AlertTriangle } from 'lucide-svelte';
</script>

<div class="min-h-screen bg-surface-0 flex flex-col items-center justify-center p-6 text-center space-y-4 font-sans text-text-1">
	<div class="h-12 w-12 rounded-[8px] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-mono font-bold text-lg">
		<AlertTriangle class="h-6 w-6" />
	</div>

	<h1 class="text-xl font-bold tracking-tight">
		{page.status || 500} — {page.error?.message || 'Interface Render Error'}
	</h1>

	<p class="max-w-md text-xs text-text-3 font-mono">
		The interface encountered a recoverable component exception. Click below to reload the Radar feed.
	</p>

	<div class="flex items-center gap-3 pt-2">
		<button
			type="button"
			onclick={() => window.location.href = '/'}
			class="h-8 px-4 rounded-[6px] bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium inline-flex items-center gap-2 transition-colors cursor-pointer"
		>
			<RotateCw class="h-3.5 w-3.5" />
			<span>Reload JobRadar</span>
		</button>
	</div>
</div>
