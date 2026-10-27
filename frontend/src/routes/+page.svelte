<script lang="ts">
	import { onMount } from 'svelte';
	import type { Job, Application, UserProfile, ActiveTab } from '#lib/types.js';
	import {
		fetchJobs,
		fetchApplications,
		fetchProfile,
		triggerRadarSweep,
		createApplication,
		getMe,
		clearAuthToken
	} from '#lib/api.js';
	import { toast } from 'svelte-sonner';

	// Components
	import Button from '#lib/components/ui/button.svelte';
	import JobCard from '#lib/components/JobCard.svelte';
	import FilterBar from '#lib/components/FilterBar.svelte';
	import JobDrawer from '#lib/components/JobDrawer.svelte';
	import CvStudioModal from '#lib/components/CvStudioModal.svelte';
	import CvUploadModal from '#lib/components/CvUploadModal.svelte';
	import TrackerBoard from '#lib/components/TrackerBoard.svelte';
	import AuthModal from '#lib/components/AuthModal.svelte';

	// Icons
	import {
		Radar,
		Building2,
		Kanban,
		FileText,
		Sparkles,
		UploadCloud,
		User,
		LogOut,
		ExternalLink,
		CheckCircle,
		Layers
	} from 'lucide-svelte';

	// Runes State
	let currentTab = $state<ActiveTab>('radar');
	let jobs = $state<Job[]>([]);
	let totalJobs = $state<number>(0);
	let applications = $state<Application[]>([]);
	let profile = $state<UserProfile | null>(null);
	let currentUser = $state<any>(null);

	// Filters
	let searchQuery = $state<string>('');
	let selectedDomain = $state<string>('all');
	let selectedContract = $state<string>('all');
	let selectedDate = $state<string>('all');
	let isFreshOnly = $state<boolean>(false);

	// Loading & Modals
	let isLoadingJobs = $state<boolean>(true);
	let isSyncingRadar = $state<boolean>(false);
	let selectedJobForDrawer = $state<Job | null>(null);
	let selectedJobForStudio = $state<Job | null>(null);
	let isUploadModalOpen = $state<boolean>(false);
	let isAuthModalOpen = $state<boolean>(false);

	// Filtered Computations
	const displayedJobs = $derived(
		jobs.filter((j) => {
			if (currentTab === 'morocco') {
				const loc = (j.location || '').toLowerCase();
				const isMa = loc.includes('morocco') || loc.includes('maroc') || loc.includes('casablanca') || loc.includes('rabat') || loc.includes('tanger');
				if (!isMa) return false;
			}
			if (isFreshOnly && !j.isFresh) return false;
			return true;
		})
	);

	const internCount = $derived(
		displayedJobs.filter((j) => {
			const t = (j.title + ' ' + (j.contract || '')).toLowerCase();
			return t.includes('stage') || t.includes('pfe') || t.includes('intern');
		}).length
	);

	const juniorCount = $derived(
		displayedJobs.filter((j) => {
			const t = j.title.toLowerCase();
			return t.includes('junior') || t.includes('débutant') || t.includes('entry');
		}).length
	);

	const savedJobIds = $derived(
		new Set(applications.map((a) => a.jobId).filter(Boolean))
	);

	const userSkills = $derived<string[]>(
		Array.isArray(profile?.skills)
			? profile.skills
			: typeof profile?.skills === 'string'
			? (profile.skills as string).split(',').map((s) => s.trim()).filter(Boolean)
			: (profile as any)?.skillsArray || []
	);

	const structuredExperience = $derived<any[]>(
		profile?.structuredCv?.experience ||
		(profile?.structuredCv as any)?.workExperience ||
		[]
	);

	// Data Loading Functions
	async function loadJobsData() {
		isLoadingJobs = true;
		try {
			const data = await fetchJobs({
				q: searchQuery,
				domain: selectedDomain,
				contract: selectedContract,
				maxAgeDays: selectedDate !== 'all' ? selectedDate : undefined,
				limit: 100
			});
			jobs = data.jobs;
			totalJobs = data.total;
		} catch (err) {
			console.error(err);
			toast.error('Failed to load opportunities');
		} finally {
			isLoadingJobs = false;
		}
	}

	async function loadInitialUserData() {
		try {
			const [userRes, profRes, appsRes] = await Promise.allSettled([
				getMe(),
				fetchProfile(),
				fetchApplications()
			]);

			if (userRes.status === 'fulfilled') currentUser = userRes.value;
			if (profRes.status === 'fulfilled') profile = profRes.value;
			if (appsRes.status === 'fulfilled') applications = appsRes.value;
		} catch (err) {
			console.error(err);
		}
	}

	// Trigger load on mount & when filters change
	let debounceTimer: any = null;
	function handleSearchChange(q: string) {
		searchQuery = q;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			loadJobsData();
		}, 300);
	}

	function handleDomainChange(d: string) {
		selectedDomain = d;
		loadJobsData();
	}

	function handleContractChange(c: string) {
		selectedContract = c;
		loadJobsData();
	}

	function handleDateChange(date: string) {
		selectedDate = date;
		loadJobsData();
	}

	async function handleSyncRadar() {
		isSyncingRadar = true;
		try {
			const res = await triggerRadarSweep(true);
			toast.success(`Radar sync complete: ${res.count || 'new'} fresh listings found`);
			await loadJobsData();
		} catch (err) {
			toast.error('Radar sweep failed');
		} finally {
			isSyncingRadar = false;
		}
	}

	async function handleSaveJob(job: Job) {
		try {
			const app = await createApplication({
				jobId: job.id,
				company: job.company,
				role: job.title,
				location: job.location,
				url: job.url,
				stage: 'saved'
			});
			applications = [...applications, app];
			toast.success(`Saved "${job.title}" to Tracker`);
		} catch (err) {
			toast.error('Failed to save to tracker');
		}
	}

	function handleSignOut() {
		clearAuthToken();
		currentUser = null;
		toast.success('Signed out successfully');
	}

	// Initial data fetch
	onMount(() => {
		loadJobsData();
		loadInitialUserData();
	});
</script>

<div class="min-h-screen bg-surface-0 flex flex-col font-sans">
	<!-- Top Navigation Header -->
	<header class="sticky top-0 z-40 border-b border-border bg-surface-1/90 backdrop-blur-md">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
			<!-- Brand Logo & Badge -->
			<div class="flex items-center gap-3">
				<div class="h-7 w-7 rounded-[6px] bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 font-mono font-bold text-xs">
					JR
				</div>
				<div class="flex items-baseline gap-2">
					<span class="font-semibold text-text-1 text-sm tracking-tight">JobRadar</span>
					<span class="font-mono text-[10px] text-text-3">v2.1.0</span>
				</div>
				<div class="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-border bg-surface-2 text-[10px] font-mono text-emerald-400">
					<span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
					<span>19 Sources Live</span>
				</div>
			</div>

			<!-- Center Navigation Tabs -->
			<nav class="hidden md:flex items-center gap-1">
				<button
					type="button"
					onclick={() => (currentTab = 'radar')}
					class={`h-8 px-3 rounded-[6px] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
						currentTab === 'radar'
							? 'bg-surface-3 text-text-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
							: 'text-text-2 hover:text-text-1 hover:bg-surface-2'
					}`}
				>
					<Radar class="h-3.5 w-3.5 text-brand-400" />
					<span>Radar Feed</span>
					<span class="rounded bg-surface-1 border border-border px-1.5 py-0.2 text-[10px] font-mono num text-text-3">
						{totalJobs}
					</span>
				</button>

				<button
					type="button"
					onclick={() => (currentTab = 'morocco')}
					class={`h-8 px-3 rounded-[6px] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
						currentTab === 'morocco'
							? 'bg-surface-3 text-text-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
							: 'text-text-2 hover:text-text-1 hover:bg-surface-2'
					}`}
				>
					<Building2 class="h-3.5 w-3.5 text-red-400" />
					<span>Morocco Hub</span>
					<span class="rounded bg-red-500/10 border border-red-500/20 px-1 text-[10px] font-mono text-red-400">
						MA
					</span>
				</button>

				<button
					type="button"
					onclick={() => (currentTab = 'tracker')}
					class={`h-8 px-3 rounded-[6px] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
						currentTab === 'tracker'
							? 'bg-surface-3 text-text-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
							: 'text-text-2 hover:text-text-1 hover:bg-surface-2'
					}`}
				>
					<Kanban class="h-3.5 w-3.5 text-accent-primary" />
					<span>My Tracker</span>
					<span class="rounded bg-surface-1 border border-border px-1.5 py-0.2 text-[10px] font-mono num text-text-3">
						{applications.length}
					</span>
				</button>

				<button
					type="button"
					onclick={() => (currentTab = 'cv-profile')}
					class={`h-8 px-3 rounded-[6px] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
						currentTab === 'cv-profile'
							? 'bg-surface-3 text-text-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
							: 'text-text-2 hover:text-text-1 hover:bg-surface-2'
					}`}
				>
					<FileText class="h-3.5 w-3.5 text-emerald-400" />
					<span>CV & Match Profile</span>
				</button>
			</nav>

			<!-- Right Header Actions -->
			<div class="flex items-center gap-2">
				<button
					type="button"
					onclick={() => (isUploadModalOpen = true)}
					class="h-8 px-2.5 sm:px-3 rounded-[6px] border border-border bg-surface-1 hover:bg-surface-2 text-text-1 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
					title="Upload PDF Resume to parse skills"
				>
					<UploadCloud class="h-3.5 w-3.5 text-brand-400" />
					<span class="hidden sm:inline">Upload CV</span>
				</button>

				{#if currentUser}
					<div class="flex items-center gap-2 pl-2 border-l border-border">
						<span class="text-xs font-medium text-text-1 max-w-[120px] truncate hidden sm:inline">
							{currentUser.fullName || currentUser.email.split('@')[0]}
						</span>
						<button
							type="button"
							onclick={handleSignOut}
							class="h-8 w-8 rounded-[6px] hover:bg-surface-2 text-text-3 hover:text-text-1 inline-flex items-center justify-center transition-colors"
							title="Sign Out"
						>
							<LogOut class="h-3.5 w-3.5" />
						</button>
					</div>
				{:else}
					<button
						type="button"
						onclick={() => (isAuthModalOpen = true)}
						class="h-8 px-3 rounded-[6px] bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
					>
						<User class="h-3.5 w-3.5" />
						<span>Sign In</span>
					</button>
				{/if}
			</div>
		</div>

		<!-- Mobile Navigation Bar -->
		<div class="flex md:hidden border-t border-border overflow-x-auto px-4 py-1.5 gap-1 text-xs">
			<button
				type="button"
				onclick={() => (currentTab = 'radar')}
				class={`px-2.5 py-1 rounded text-xs shrink-0 ${currentTab === 'radar' ? 'bg-surface-3 text-text-1 font-medium' : 'text-text-2'}`}
			>
				Radar ({totalJobs})
			</button>
			<button
				type="button"
				onclick={() => (currentTab = 'morocco')}
				class={`px-2.5 py-1 rounded text-xs shrink-0 ${currentTab === 'morocco' ? 'bg-surface-3 text-text-1 font-medium' : 'text-text-2'}`}
			>
				Morocco Hub
			</button>
			<button
				type="button"
				onclick={() => (currentTab = 'tracker')}
				class={`px-2.5 py-1 rounded text-xs shrink-0 ${currentTab === 'tracker' ? 'bg-surface-3 text-text-1 font-medium' : 'text-text-2'}`}
			>
				Tracker ({applications.length})
			</button>
			<button
				type="button"
				onclick={() => (currentTab = 'cv-profile')}
				class={`px-2.5 py-1 rounded text-xs shrink-0 ${currentTab === 'cv-profile' ? 'bg-surface-3 text-text-1 font-medium' : 'text-text-2'}`}
			>
				CV & Profile
			</button>
		</div>
	</header>

	<!-- Main Workspace Container -->
	<main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
		<!-- Hero Section: Poetic & Editorial Accent -->
		<div class="space-y-3">
			<div class="flex items-center gap-2">
				<span class="h-2 w-2 rounded-full bg-emerald-400"></span>
				<span class="font-mono text-xs text-text-3 uppercase tracking-wider">
					Autonomous Talent Radar Active
				</span>
			</div>

			<h1 class="text-3xl sm:text-4xl font-normal tracking-tight text-text-1 font-sans">
				When searching for jobs is no longer searching — <em class="font-serif italic font-normal text-brand-400">it's radar.</em>
			</h1>

			<p class="max-w-2xl text-xs sm:text-sm text-text-2 leading-relaxed">
				Continuously tracking Moroccan PFE internships, junior software roles, and global remote engineering positions. Zero hallucinations, coordinate-aware CV parsing.
			</p>
		</div>

		<!-- Tabular Metric Stats Bar -->
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
			<div class="rounded-[8px] border border-border bg-surface-1 p-3.5 space-y-1">
				<span class="font-mono text-[10px] text-text-3 uppercase tracking-wider block">Indexed Roles</span>
				<span class="text-xl font-mono font-bold text-text-1 num">{totalJobs}</span>
			</div>

			<div class="rounded-[8px] border border-border bg-surface-1 p-3.5 space-y-1">
				<span class="font-mono text-[10px] text-text-3 uppercase tracking-wider block">Average Match</span>
				<span class="text-xl font-mono font-bold text-brand-400 num">
					{jobs.length > 0 ? Math.round(jobs.reduce((acc, j) => acc + (j.matchScore || 75), 0) / jobs.length) : 86}%
				</span>
			</div>

			<div class="rounded-[8px] border border-border bg-surface-1 p-3.5 space-y-1">
				<span class="font-mono text-[10px] text-text-3 uppercase tracking-wider block">Active Boards</span>
				<span class="text-xl font-mono font-bold text-text-1 num">19</span>
			</div>

			<div class="rounded-[8px] border border-border bg-surface-1 p-3.5 space-y-1">
				<span class="font-mono text-[10px] text-text-3 uppercase tracking-wider block">Pipeline Tracked</span>
				<span class="text-xl font-mono font-bold text-emerald-400 num">{applications.length}</span>
			</div>
		</div>

		<!-- TAB 1 & 2: RADAR FEED & MOROCCO HUB -->
		{#if currentTab === 'radar' || currentTab === 'morocco'}
			<div class="space-y-4">
				<!-- Filter Bar -->
				<div class="rounded-[8px] border border-border bg-surface-1/60 p-4">
					<FilterBar
						{searchQuery}
						{selectedDomain}
						{selectedContract}
						{selectedDate}
						{isFreshOnly}
						totalCount={displayedJobs.length}
						{internCount}
						{juniorCount}
						isSyncing={isSyncingRadar}
						onSearchChange={handleSearchChange}
						onDomainChange={handleDomainChange}
						onContractChange={handleContractChange}
						onDateChange={handleDateChange}
						onFreshToggle={(f) => (isFreshOnly = f)}
						onSync={handleSyncRadar}
					/>
				</div>

				<!-- Jobs Feed -->
				{#if isLoadingJobs}
					<div class="space-y-3">
						{#each Array(4) as _}
							<div class="h-28 rounded-[8px] border border-border bg-surface-1/40 animate-pulse"></div>
						{/each}
					</div>
				{:else if displayedJobs.length > 0}
					<div class="space-y-2.5">
						{#each displayedJobs as job (job.id)}
							<JobCard
								{job}
								isSaved={savedJobIds.has(job.id)}
								onSelect={(j) => (selectedJobForDrawer = j)}
								onSave={handleSaveJob}
							/>
						{/each}
					</div>
				{:else}
					<div class="rounded-[8px] border border-border bg-surface-1 p-12 text-center space-y-3">
						<Radar class="h-8 w-8 text-text-3 mx-auto" />
						<h3 class="text-sm font-semibold text-text-1">No opportunities match current criteria</h3>
						<p class="text-xs text-text-3 max-w-sm mx-auto">
							Try adjusting your filters or date cutoff, or run an autonomous radar sweep to discover new roles.
						</p>
						<button
							type="button"
							onclick={() => {
								searchQuery = '';
								selectedDomain = 'all';
								selectedContract = 'all';
								selectedDate = 'all';
								isFreshOnly = false;
								loadJobsData();
							}}
							class="h-8 px-3 rounded-[6px] border border-border bg-surface-2 hover:bg-surface-3 text-text-1 text-xs font-medium"
						>
							Reset All Filters
						</button>
					</div>
				{/if}
			</div>

		<!-- TAB 3: APPLICATION TRACKER (KANBAN) -->
		{:else if currentTab === 'tracker'}
			<TrackerBoard
				{applications}
				onRefresh={loadInitialUserData}
			/>

		<!-- TAB 4: CV & MATCH PROFILE -->
		{:else if currentTab === 'cv-profile'}
			<div class="space-y-6">
				<div class="rounded-[8px] border border-border bg-surface-1 p-6 flex items-start justify-between gap-4 flex-wrap">
					<div class="space-y-1">
						<h2 class="text-base font-semibold text-text-1">Engineering Match DNA & CV Profile</h2>
						<p class="text-xs text-text-2">
							Your profile powers the coordinate-aware matcher and non-hallucinating CV studio.
						</p>
					</div>

					<button
						type="button"
						onclick={() => (isUploadModalOpen = true)}
						class="h-8 px-3.5 rounded-[6px] bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors shadow-sm"
					>
						<UploadCloud class="h-4 w-4" />
						<span>Upload & Replace CV</span>
					</button>
				</div>

				<!-- Extracted Skills Matrix -->
				<div class="rounded-[8px] border border-border bg-surface-1 p-5 space-y-3">
					<h3 class="text-xs font-semibold uppercase tracking-wider text-text-2">
						Extracted Technical Skills ({userSkills.length})
					</h3>
					<div class="flex items-center gap-1.5 flex-wrap">
						{#each userSkills as skill}
							<span class="rounded-[4px] bg-surface-2 border border-border px-2.5 py-1 text-xs font-mono text-text-1">
								{skill}
							</span>
						{:else}
							<div class="py-6 text-center text-xs text-text-3 font-mono w-full">
								No skills extracted yet. Upload your PDF resume to calibrate the matching radar.
							</div>
						{/each}
					</div>
				</div>

				<!-- Structured Experience & Education -->
				{#if profile?.structuredCv}
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="rounded-[8px] border border-border bg-surface-1 p-5 space-y-3">
							<h3 class="text-xs font-semibold uppercase tracking-wider text-text-2">
								Verified Experience
							</h3>
							{#each structuredExperience as exp}
								<div class="border-b border-border/50 pb-2.5 space-y-1 text-xs">
									<div class="flex items-center justify-between font-semibold text-text-1">
										<span>{exp.title}</span>
										<span class="text-[11px] font-mono text-text-3 font-normal">{exp.startDate || ''} – {exp.endDate || 'Present'}</span>
									</div>
									<span class="text-[11px] text-brand-400 block">{exp.company}</span>
								</div>
							{:else}
								<span class="text-xs text-text-3">No experience records.</span>
							{/each}
						</div>

						<div class="rounded-[8px] border border-border bg-surface-1 p-5 space-y-3">
							<h3 class="text-xs font-semibold uppercase tracking-wider text-text-2">
								Education & Certifications
							</h3>
							{#each (profile.structuredCv.education || []) as edu}
								<div class="border-b border-border/50 pb-2.5 space-y-0.5 text-xs">
									<div class="flex items-center justify-between font-semibold text-text-1">
										<span>{edu.degree}</span>
										<span class="text-[11px] font-mono text-text-3 font-normal">{edu.year || ''}</span>
									</div>
									<span class="text-[11px] text-text-2 block">{edu.institution}</span>
								</div>
							{:else}
								<span class="text-xs text-text-3">No education records.</span>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</main>

	<!-- Slide-Over Job Detail Drawer -->
	<JobDrawer
		job={selectedJobForDrawer}
		isSaved={selectedJobForDrawer ? savedJobIds.has(selectedJobForDrawer.id) : false}
		onClose={() => (selectedJobForDrawer = null)}
		onSave={handleSaveJob}
		onOpenCvStudio={(j) => {
			selectedJobForStudio = j;
			selectedJobForDrawer = null;
		}}
	/>

	<!-- Tailored CV Studio Modal -->
	<CvStudioModal
		job={selectedJobForStudio}
		{profile}
		onClose={() => (selectedJobForStudio = null)}
	/>

	<!-- Upload CV Modal -->
	<CvUploadModal
		isOpen={isUploadModalOpen}
		{profile}
		onClose={() => (isUploadModalOpen = false)}
		onProfileUpdated={(p) => {
			profile = p;
			loadJobsData();
		}}
	/>

	<!-- Authentication Modal -->
	<AuthModal
		isOpen={isAuthModalOpen}
		onClose={() => (isAuthModalOpen = false)}
		onAuthSuccess={(user) => {
			currentUser = user;
			loadInitialUserData();
			loadJobsData();
		}}
	/>
</div>
