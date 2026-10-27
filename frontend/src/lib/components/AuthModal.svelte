<script lang="ts">
	import { loginUser, registerUser, demoLogin } from '#lib/api.js';
	import { toast } from 'svelte-sonner';
	import { X, Lock, Mail, User, Zap, Sparkles } from 'lucide-svelte';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		onAuthSuccess: (user: any) => void;
	}

	let { isOpen, onClose, onAuthSuccess }: Props = $props();

	let mode = $state<'login' | 'register'>('login');
	let email = $state<string>('');
	let password = $state<string>('');
	let fullName = $state<string>('');
	let isLoading = $state<boolean>(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		isLoading = true;

		try {
			let result;
			if (mode === 'login') {
				result = await loginUser(email, password);
				toast.success('Welcome back!');
			} else {
				result = await registerUser(email, password, fullName);
				toast.success('Account created successfully!');
			}
			onAuthSuccess(result.user);
			onClose();
		} catch (err: any) {
			toast.error(err.message || 'Authentication failed');
		} finally {
			isLoading = false;
		}
	}

	async function handleDemo() {
		isLoading = true;
		try {
			const result = await demoLogin();
			toast.success('Signed in as Demo Engineer!');
			onAuthSuccess(result.user);
			onClose();
		} catch (err: any) {
			toast.error(err.message || 'Failed to sign in demo account');
		} finally {
			isLoading = false;
		}
	}
</script>

{#if isOpen}
	<div
		role="button"
		tabindex="0"
		onclick={onClose}
		onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
		class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
	></div>

	<div class="fixed inset-x-4 top-24 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[420px] z-50 rounded-[10px] border border-border bg-surface-1 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Lock class="h-4 w-4 text-brand-400" />
				<h3 class="text-sm font-semibold text-text-1">
					{mode === 'login' ? 'Sign In to JobRadar' : 'Create Free Account'}
				</h3>
			</div>
			<button
				type="button"
				onclick={onClose}
				class="h-8 w-8 rounded-[6px] border border-border bg-surface-2 hover:bg-surface-3 text-text-2 hover:text-text-1 inline-flex items-center justify-center transition-colors"
			>
				<X class="h-4 w-4" />
			</button>
		</div>

		<!-- 1-Click Instant Demo Button -->
		<button
			type="button"
			onclick={handleDemo}
			disabled={isLoading}
			class="w-full h-9 rounded-[6px] border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
		>
			<Zap class="h-3.5 w-3.5 fill-current" />
			<span>1-Click Instant Demo Engineer</span>
		</button>

		<div class="relative flex items-center justify-center">
			<div class="border-t border-border w-full"></div>
			<span class="bg-surface-1 px-3 text-[11px] font-mono text-text-3 absolute">or continue with email</span>
		</div>

		<!-- Auth Form -->
		<form onsubmit={handleSubmit} class="space-y-3.5 text-xs">
			{#if mode === 'register'}
				<div class="space-y-1">
					<label class="font-mono text-[11px] text-text-3">Full Name</label>
					<div class="relative">
						<User class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-3" />
						<input
							type="text"
							bind:value={fullName}
							placeholder="Nabil Baghoughi"
							required
							class="w-full h-8 rounded-[6px] border border-border bg-surface-2 pl-9 pr-3 text-xs text-text-1 focus:border-brand-500 focus:outline-none"
						/>
					</div>
				</div>
			{/if}

			<div class="space-y-1">
				<label class="font-mono text-[11px] text-text-3">Email Address</label>
				<div class="relative">
					<Mail class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-3" />
					<input
						type="email"
						bind:value={email}
						placeholder="engineer@jobradar.ma"
						required
						class="w-full h-8 rounded-[6px] border border-border bg-surface-2 pl-9 pr-3 text-xs text-text-1 focus:border-brand-500 focus:outline-none"
					/>
				</div>
			</div>

			<div class="space-y-1">
				<label class="font-mono text-[11px] text-text-3">Password</label>
				<div class="relative">
					<Lock class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-3" />
					<input
						type="password"
						bind:value={password}
						placeholder="••••••••••••"
						required
						minlength="6"
						class="w-full h-8 rounded-[6px] border border-border bg-surface-2 pl-9 pr-3 text-xs text-text-1 focus:border-brand-500 focus:outline-none"
					/>
				</div>
			</div>

			<button
				type="submit"
				disabled={isLoading}
				class="w-full h-8 rounded-[6px] bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-50 mt-2"
			>
				{isLoading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
			</button>
		</form>

		<div class="text-center pt-2 border-t border-border text-[11px] text-text-3">
			{#if mode === 'login'}
				<span>Don't have an account? </span>
				<button type="button" onclick={() => (mode = 'register')} class="text-brand-400 hover:underline font-medium">
					Register free
				</button>
			{:else}
				<span>Already have an account? </span>
				<button type="button" onclick={() => (mode = 'login')} class="text-brand-400 hover:underline font-medium">
					Sign in
				</button>
			{/if}
		</div>
	</div>
{/if}
