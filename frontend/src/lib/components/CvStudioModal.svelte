<script lang="ts">
	import type { Job, UserProfile } from '#lib/types.js';
	import { generateTailoredCv } from '#lib/api.js';
	import { toast } from 'svelte-sonner';
	import { X, Printer, Copy, FileText, Check, Sparkles, Download, Layers } from 'lucide-svelte';

	interface Props {
		job: Job | null;
		profile: UserProfile | null;
		onClose: () => void;
	}

	let { job, profile, onClose }: Props = $props();

	let selectedTemplate = $state<'jake' | 'morocco' | 'modern'>('jake');
	let selectedLang = $state<'en' | 'fr'>('fr');
	let isGenerating = $state<boolean>(false);
	let generatedCvData = $state<any>(null);

	let toggles = $state<Record<string, boolean>>({
		summary: true,
		skills: true,
		experience: true,
		projects: true,
		education: true,
		languages: true
	});

	async function loadTailoredResume() {
		if (!job) return;
		isGenerating = true;

		try {
			const res = await generateTailoredCv({
				jobId: job.id,
				templateId: selectedTemplate,
				language: selectedLang,
				sectionToggles: toggles
			});
			generatedCvData = res.cv;
		} catch (err) {
			console.error(err);
			toast.error('Failed to generate tailored CV data');
		} finally {
			isGenerating = false;
		}
	}

	$effect(() => {
		if (job) {
			loadTailoredResume();
		}
	});

	function handlePrint() {
		window.print();
	}

	function copyMarkdown() {
		if (!generatedCvData) return;
		let md = `# ${generatedCvData.personalInfo?.name || profile?.fullName || 'Fullstack Engineer'}\n`;
		md += `${generatedCvData.personalInfo?.email || profile?.email || ''} | ${generatedCvData.personalInfo?.phone || ''} | ${generatedCvData.personalInfo?.location || ''}\n\n`;
		if (toggles.summary && generatedCvData.summary) {
			md += `## Professional Summary\n${generatedCvData.summary}\n\n`;
		}
		if (toggles.skills && generatedCvData.skills) {
			md += `## Technical Skills\n`;
			Object.entries(generatedCvData.skills).forEach(([k, v]) => {
				if (Array.isArray(v) && v.length) md += `- **${k}**: ${v.join(', ')}\n`;
			});
			md += '\n';
		}
		navigator.clipboard.writeText(md);
		toast.success('Markdown copied to clipboard');
	}
</script>

{#if job}
	<!-- Backdrop -->
	<div
		role="button"
		tabindex="0"
		onclick={onClose}
		onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
		class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md transition-opacity"
	></div>

	<!-- Modal -->
	<div class="fixed inset-4 sm:inset-8 z-50 rounded-[10px] border border-border bg-surface-1 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
		<!-- Top Bar -->
		<div class="px-5 py-3.5 border-b border-border flex items-center justify-between gap-4 bg-surface-1">
			<div class="flex items-center gap-3">
				<div class="h-8 w-8 rounded-[6px] bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
					<FileText class="h-4 w-4" />
				</div>
				<div>
					<h3 class="text-sm font-semibold text-text-1">
						Tailored CV Studio — <span class="text-brand-400">{job.title}</span>
					</h3>
					<p class="text-[11px] font-mono text-text-3">
						{job.company} • {job.location} • ATS Optimized A4 Export
					</p>
				</div>
			</div>

			<div class="flex items-center gap-2">
				<button
					type="button"
					onclick={handlePrint}
					class="h-8 px-3 rounded-[6px] bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors shadow-sm"
					title="Export print-ready PDF"
				>
					<Printer class="h-3.5 w-3.5" />
					<span>Export PDF</span>
				</button>

				<button
					type="button"
					onclick={copyMarkdown}
					class="h-8 px-3 rounded-[6px] border border-border bg-surface-2 hover:bg-surface-3 text-text-1 text-xs font-mono inline-flex items-center gap-1.5 transition-colors"
				>
					<Copy class="h-3.5 w-3.5" />
					<span>Copy MD</span>
				</button>

				<button
					type="button"
					onclick={onClose}
					class="h-8 w-8 rounded-[6px] border border-border bg-surface-2 hover:bg-surface-3 text-text-2 hover:text-text-1 inline-flex items-center justify-center transition-colors ml-2"
				>
					<X class="h-4 w-4" />
				</button>
			</div>
		</div>

		<!-- Studio Workspace: Split Screen -->
		<div class="flex-1 flex overflow-hidden">
			<!-- Left Control Sidebar -->
			<div class="w-80 border-r border-border bg-surface-2/30 p-4 space-y-5 overflow-y-auto shrink-0 hidden md:block text-xs">
				<!-- Template Selector -->
				<div class="space-y-1.5">
					<label class="font-mono text-[11px] text-text-3 uppercase tracking-wider block">Template</label>
					<select
						value={selectedTemplate}
						onchange={(e) => {
							selectedTemplate = (e.target as HTMLSelectElement).value as any;
							loadTailoredResume();
						}}
						class="w-full h-8 rounded-[6px] border border-border bg-surface-1 px-2.5 text-xs text-text-1 focus:border-brand-500 focus:outline-none cursor-pointer"
					>
						<option value="jake">Jake ATS (Classic Tech standard)</option>
						<option value="morocco">Morocco PFE / Stage Prep</option>
						<option value="modern">Modern Split Layout</option>
					</select>
				</div>

				<!-- Language Selector -->
				<div class="space-y-1.5">
					<label class="font-mono text-[11px] text-text-3 uppercase tracking-wider block">Language</label>
					<select
						value={selectedLang}
						onchange={(e) => {
							selectedLang = (e.target as HTMLSelectElement).value as any;
							loadTailoredResume();
						}}
						class="w-full h-8 rounded-[6px] border border-border bg-surface-1 px-2.5 text-xs text-text-1 focus:border-brand-500 focus:outline-none cursor-pointer"
					>
						<option value="fr">French (Morocco & ESN Standard)</option>
						<option value="en">English (Global Remote)</option>
					</select>
				</div>

				<!-- Section Toggles -->
				<div class="space-y-2 pt-2 border-t border-border">
					<label class="font-mono text-[11px] text-text-3 uppercase tracking-wider block">Visible Sections</label>
					{#each Object.keys(toggles) as key}
						<label class="flex items-center justify-between py-1 text-xs text-text-2 hover:text-text-1 cursor-pointer">
							<span class="capitalize">{key}</span>
							<input
								type="checkbox"
								bind:checked={toggles[key]}
								class="rounded border-border accent-brand-500"
							/>
						</label>
					{/each}
				</div>

				<!-- ATS Verification Badge -->
				<div class="rounded-[6px] border border-emerald-500/20 bg-emerald-500/10 p-3 space-y-1 text-[11px]">
					<div class="flex items-center gap-1.5 font-semibold text-emerald-400">
						<Check class="h-3.5 w-3.5" />
						<span>ATS Safe Guarantee</span>
					</div>
					<p class="text-text-2 leading-relaxed">
						Zero graphics, pure text geometry, coordinate-aligned margins. Guaranteed 100% parsable by Workday, Taleo, and Greenhouse.
					</p>
				</div>
			</div>

			<!-- Right Preview Pane: A4 Paper Canvas -->
			<div class="flex-1 bg-surface-0 overflow-y-auto p-4 sm:p-8 flex justify-center">
				{#if isGenerating}
					<div class="flex flex-col items-center justify-center gap-3 py-20 text-text-3 font-mono text-xs">
						<Sparkles class="h-6 w-6 animate-spin text-brand-400" />
						<span>Synthesizing tailored ATS resume...</span>
					</div>
				{:else if generatedCvData}
					<!-- A4 Sheet Paper Container (Target for PDF print) -->
					<div
						id="cv-print-canvas"
						class="w-full max-w-[800px] min-h-[1050px] bg-white text-zinc-900 p-10 sm:p-14 shadow-2xl rounded-[4px] space-y-6 font-sans text-xs leading-normal select-text print:p-0 print:shadow-none print:max-w-none print:w-full"
						contenteditable="true"
						spellcheck="false"
					>
						<!-- Header / Personal Info -->
						<div class="text-center border-b border-zinc-300 pb-4 space-y-1">
							<h1 class="text-2xl font-bold uppercase tracking-wide text-zinc-900">
								{generatedCvData.personalInfo?.name || profile?.fullName || 'Fullstack Software Engineer'}
							</h1>
							<div class="flex items-center justify-center gap-3 text-[11px] text-zinc-600 flex-wrap">
								<span>{generatedCvData.personalInfo?.email || profile?.email || 'engineer@example.com'}</span>
								<span>•</span>
								<span>{generatedCvData.personalInfo?.phone || '+212 600 000000'}</span>
								<span>•</span>
								<span>{generatedCvData.personalInfo?.location || 'Morocco / Remote'}</span>
								{#if generatedCvData.personalInfo?.linkedin}
									<span>•</span>
									<span>{generatedCvData.personalInfo.linkedin}</span>
								{/if}
							</div>
						</div>

						<!-- Summary -->
						{#if toggles.summary && generatedCvData.summary}
							<div class="space-y-1.5">
								<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-800 border-b border-zinc-200 pb-0.5">
									{selectedLang === 'fr' ? 'Profil Professionnel' : 'Professional Summary'}
								</h2>
								<p class="text-[11.5px] text-zinc-700 leading-relaxed">
									{generatedCvData.summary}
								</p>
							</div>
						{/if}

						<!-- Technical Skills -->
						{#if toggles.skills && generatedCvData.skills}
							<div class="space-y-1.5">
								<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-800 border-b border-zinc-200 pb-0.5">
									{selectedLang === 'fr' ? 'Compétences Techniques' : 'Technical Skills'}
								</h2>
								<div class="space-y-1 text-[11.5px] text-zinc-700">
									{#if generatedCvData.skills.languages}
										<p><strong class="font-semibold text-zinc-900">Languages:</strong> {Array.isArray(generatedCvData.skills.languages) ? generatedCvData.skills.languages.join(', ') : generatedCvData.skills.languages}</p>
									{/if}
									{#if generatedCvData.skills.frameworks}
										<p><strong class="font-semibold text-zinc-900">Frameworks & Libraries:</strong> {Array.isArray(generatedCvData.skills.frameworks) ? generatedCvData.skills.frameworks.join(', ') : generatedCvData.skills.frameworks}</p>
									{/if}
									{#if generatedCvData.skills.tools}
										<p><strong class="font-semibold text-zinc-900">Cloud & Tools:</strong> {Array.isArray(generatedCvData.skills.tools) ? generatedCvData.skills.tools.join(', ') : generatedCvData.skills.tools}</p>
									{/if}
									{#if generatedCvData.skills.databases}
										<p><strong class="font-semibold text-zinc-900">Databases:</strong> {Array.isArray(generatedCvData.skills.databases) ? generatedCvData.skills.databases.join(', ') : generatedCvData.skills.databases}</p>
									{/if}
								</div>
							</div>
						{/if}

						<!-- Work Experience -->
						{#if toggles.experience && generatedCvData.experience && generatedCvData.experience.length > 0}
							<div class="space-y-3">
								<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-800 border-b border-zinc-200 pb-0.5">
									{selectedLang === 'fr' ? 'Expériences Professionnelles' : 'Professional Experience'}
								</h2>
								{#each generatedCvData.experience as exp}
									<div class="space-y-1">
										<div class="flex items-center justify-between font-semibold text-zinc-900 text-[12px]">
											<span>{exp.title} — <span class="font-normal text-zinc-700">{exp.company}</span></span>
											<span class="text-[11px] font-mono text-zinc-500 font-normal">{exp.startDate || ''} – {exp.endDate || 'Present'}</span>
										</div>
										{#if exp.highlights && exp.highlights.length > 0}
											<ul class="list-disc list-outside pl-4 space-y-0.5 text-[11px] text-zinc-700">
												{#each exp.highlights as h}
													<li>{h}</li>
												{/each}
											</ul>
										{/if}
									</div>
								{/each}
							</div>
						{/if}

						<!-- Projects -->
						{#if toggles.projects && generatedCvData.projects && generatedCvData.projects.length > 0}
							<div class="space-y-3">
								<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-800 border-b border-zinc-200 pb-0.5">
									{selectedLang === 'fr' ? 'Projets & Réalisations' : 'Projects'}
								</h2>
								{#each generatedCvData.projects as proj}
									<div class="space-y-0.5">
										<div class="flex items-center justify-between font-semibold text-zinc-900 text-[12px]">
											<span>{proj.name}</span>
											{#if proj.link}
												<span class="text-[11px] font-mono text-zinc-500 font-normal">{proj.link}</span>
											{/if}
										</div>
										<p class="text-[11px] text-zinc-700 leading-relaxed">{proj.description}</p>
									</div>
								{/each}
							</div>
						{/if}

						<!-- Education -->
						{#if toggles.education && generatedCvData.education && generatedCvData.education.length > 0}
							<div class="space-y-2">
								<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-800 border-b border-zinc-200 pb-0.5">
									{selectedLang === 'fr' ? 'Formation' : 'Education'}
								</h2>
								{#each generatedCvData.education as edu}
									<div class="flex items-center justify-between text-[11.5px]">
										<div>
											<strong class="font-semibold text-zinc-900">{edu.degree}</strong>, {edu.institution}
										</div>
										<span class="text-[11px] font-mono text-zinc-500">{edu.year || ''}</span>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{:else}
					<div class="py-20 text-text-3 font-mono text-xs">
						No preview data available.
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
