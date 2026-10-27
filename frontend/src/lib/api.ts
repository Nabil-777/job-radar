import type { Job, Application, UserProfile, StructuredCv, ApplicationStage } from '#lib/types.js';

const TOKEN_KEY = 'jobradar_token';

export function getAuthToken(): string | null {
	if (typeof window === 'undefined') return null;
	return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
	if (typeof window !== 'undefined') {
		localStorage.setItem(TOKEN_KEY, token);
	}
}

export function clearAuthToken(): void {
	if (typeof window !== 'undefined') {
		localStorage.removeItem(TOKEN_KEY);
	}
}

function getHeaders(isJson = true): HeadersInit {
	const headers: Record<string, string> = {};
	if (isJson) headers['Content-Type'] = 'application/json';
	const token = getAuthToken();
	if (token) headers['Authorization'] = `Bearer ${token}`;
	return headers;
}

export interface JobFilterParams {
	q?: string;
	domain?: string;
	contract?: string;
	maxAgeDays?: string;
	postedAfter?: string;
	postedBefore?: string;
	limit?: number;
	offset?: number;
	moroccoOnly?: boolean;
}

export async function fetchJobs(filters: JobFilterParams = {}): Promise<{ jobs: Job[]; total: number }> {
	const params = new URLSearchParams();
	if (filters.q) params.append('q', filters.q);
	if (filters.domain && filters.domain !== 'all') params.append('domain', filters.domain);
	if (filters.contract && filters.contract !== 'all') params.append('contract', filters.contract);
	if (filters.maxAgeDays && filters.maxAgeDays !== 'all') params.append('maxAgeDays', filters.maxAgeDays);
	if (filters.postedAfter) params.append('postedAfter', filters.postedAfter);
	if (filters.postedBefore) params.append('postedBefore', filters.postedBefore);
	if (filters.limit) params.append('limit', String(filters.limit));
	if (filters.offset) params.append('offset', String(filters.offset));
	if (filters.moroccoOnly) params.append('location', 'Morocco');

	const res = await fetch(`/api/jobs?${params.toString()}`, {
		headers: getHeaders(false)
	});
	if (!res.ok) throw new Error('Failed to fetch jobs');
	const data = await res.json();
	const rawJobs: Job[] = data.jobs || [];
	const seenIds = new Set<string>();
	const jobs: Job[] = rawJobs.map((j, idx) => {
		let uniqueId = j.id || `job-${idx}`;
		if (seenIds.has(uniqueId)) {
			uniqueId = `${uniqueId}-${idx}`;
		}
		seenIds.add(uniqueId);
		return {
			...j,
			id: uniqueId,
			contract: j.contract || (j as any).contract_type || '',
			domain: j.domain || (j as any).category || ''
		};
	});
	const total = data.stats?.total ?? data.total ?? jobs.length;
	return { jobs, total };
}

export async function triggerRadarSweep(force = true): Promise<{ count: number }> {
	const res = await fetch('/api/jobs/search', {
		method: 'POST',
		headers: getHeaders(true),
		body: JSON.stringify({ force })
	});
	if (!res.ok) throw new Error('Failed to trigger radar sweep');
	return await res.json();
}

// Applications / Kanban
export async function fetchApplications(): Promise<Application[]> {
	const res = await fetch('/api/applications', {
		headers: getHeaders(true)
	});
	if (!res.ok) throw new Error('Failed to fetch applications');
	const data = await res.json();
	return data.applications || [];
}

export async function createApplication(payload: {
	jobId?: string;
	company: string;
	role: string;
	location?: string;
	url?: string;
	stage?: ApplicationStage;
}): Promise<Application> {
	const res = await fetch('/api/applications', {
		method: 'POST',
		headers: getHeaders(true),
		body: JSON.stringify(payload)
	});
	if (!res.ok) throw new Error('Failed to create application');
	const data = await res.json();
	return data.application;
}

export async function updateApplicationStage(id: string, stage: ApplicationStage): Promise<void> {
	const res = await fetch(`/api/applications/${id}/stage`, {
		method: 'PUT',
		headers: getHeaders(true),
		body: JSON.stringify({ stage })
	});
	if (!res.ok) throw new Error('Failed to update stage');
}

export async function deleteApplication(id: string): Promise<void> {
	const res = await fetch(`/api/applications/${id}`, {
		method: 'DELETE',
		headers: getHeaders(true)
	});
	if (!res.ok) throw new Error('Failed to delete application');
}

// Profile & CV
export async function fetchProfile(): Promise<UserProfile> {
	const res = await fetch('/api/profile', {
		headers: getHeaders(true)
	});
	if (!res.ok) throw new Error('Failed to fetch profile');
	const data = await res.json();
	return data.profile || {};
}

export async function uploadCvFile(file: File): Promise<{
	success: boolean;
	structuredCv?: StructuredCv;
	skills?: string[];
	message?: string;
}> {
	const formData = new FormData();
	formData.append('cv', file);

	const token = getAuthToken();
	const headers: Record<string, string> = {};
	if (token) headers['Authorization'] = `Bearer ${token}`;

	const res = await fetch('/api/profile/upload-cv', {
		method: 'POST',
		headers,
		body: formData
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({ error: 'Upload failed' }));
		throw new Error(err.error || 'Failed to parse CV');
	}
	return await res.json();
}

export async function saveStructuredCv(cv: StructuredCv): Promise<void> {
	const res = await fetch('/api/profile/structured-cv', {
		method: 'POST',
		headers: getHeaders(true),
		body: JSON.stringify({ structuredCv: cv })
	});
	if (!res.ok) throw new Error('Failed to save structured CV');
}

// AI Pitch Suite & Tailored CV Studio
export async function generatePitch(jobId: string, format: 'cover-letter' | 'linkedin' | 'email' | 'cv', language: 'fr' | 'en' = 'en'): Promise<string> {
	const res = await fetch('/api/ai/pitch', {
		method: 'POST',
		headers: getHeaders(true),
		body: JSON.stringify({ jobId, format, language })
	});
	if (!res.ok) throw new Error('Failed to generate pitch');
	const data = await res.json();
	return data.pitch || '';
}

export async function generateTailoredCv(payload: {
	jobId: string;
	templateId?: string;
	language?: 'fr' | 'en';
	sectionToggles?: Record<string, boolean>;
}): Promise<{ cv: any; html?: string }> {
	const res = await fetch('/api/ai/tailored-cv', {
		method: 'POST',
		headers: getHeaders(true),
		body: JSON.stringify(payload)
	});
	if (!res.ok) throw new Error('Failed to generate tailored CV');
	return await res.json();
}

// Auth
export async function loginUser(email: string, password: string) {
	const res = await fetch('/api/auth/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, password })
	});
	const data = await res.json();
	if (!res.ok) throw new Error(data.error || 'Invalid credentials');
	if (data.token) setAuthToken(data.token);
	return data;
}

export async function registerUser(email: string, password: string, fullName?: string) {
	const res = await fetch('/api/auth/signup', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, password, fullName })
	});
	const data = await res.json();
	if (!res.ok) throw new Error(data.error || 'Registration failed');
	if (data.token) setAuthToken(data.token);
	return data;
}

export async function demoLogin() {
	const res = await fetch('/api/auth/demo', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' }
	});
	const data = await res.json();
	if (!res.ok) throw new Error(data.error || 'Demo login failed');
	if (data.token) setAuthToken(data.token);
	return data;
}

export async function getMe() {
	const res = await fetch('/api/auth/me', {
		headers: getHeaders(true)
	});
	if (!res.ok) return null;
	const data = await res.json();
	return data.user || null;
}
