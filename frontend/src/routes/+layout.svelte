<script lang="ts">
	import '../app.css';
	import { Toaster } from 'svelte-sonner';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';

	let { children } = $props();

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 60 * 1000,
				refetchOnWindowFocus: false
			}
		}
	});
</script>

<QueryClientProvider client={queryClient}>
	<div class="min-h-screen bg-surface-1 text-text-1 font-sans selection:bg-brand-500/20 selection:text-brand-500">
		{@render children()}
	</div>
	<Toaster position="bottom-right" theme="dark" richColors />
</QueryClientProvider>
