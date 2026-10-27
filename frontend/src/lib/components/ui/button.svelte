<script lang="ts">
	import { cn } from '#lib/utils.js';
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	export type ButtonVariant = 'default' | 'outline' | 'ghost';
	export type ButtonSize = 'sm' | 'default' | 'lg';

	interface Props extends HTMLButtonAttributes {
		variant?: ButtonVariant;
		size?: ButtonSize;
		class?: string;
		children?: Snippet;
	}

	let {
		variant = 'default',
		size = 'default',
		class: className = '',
		children,
		type = 'button',
		disabled = false,
		...restProps
	}: Props = $props();

	// Variants strictly following the design system tokens
	const variantStyles: Record<ButtonVariant, string> = {
		default:
			'bg-brand-500 text-white font-medium hover:bg-brand-600 active:bg-brand-700 border border-transparent shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
		outline:
			'bg-surface-1 text-text-1 border border-border hover:bg-surface-2 active:bg-surface-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]',
		ghost:
			'bg-transparent text-text-2 hover:text-text-1 hover:bg-surface-2 active:bg-surface-3 border border-transparent'
	};

	// Sizes strictly following the imposed spacing scale (4, 8, 12, 16, 20...)
	const sizeStyles: Record<ButtonSize, string> = {
		sm: 'h-7 px-3 text-xs gap-1.5',
		default: 'h-8 px-4 text-sm gap-2',
		lg: 'h-10 px-5 text-sm font-medium gap-2.5'
	};
</script>

<button
	{type}
	{disabled}
	class={cn(
		'inline-flex items-center justify-center whitespace-nowrap rounded-[6px] font-sans transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
		variantStyles[variant],
		sizeStyles[size],
		className
	)}
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</button>
