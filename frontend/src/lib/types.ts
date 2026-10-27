export interface Job {
	id: string;
	title: string;
	company: string;
	location: string;
	contract?: string;
	domain?: string;
	url: string;
	description?: string;
	postedAt?: string;
	postedAtLabel?: string;
	isFresh?: boolean;
	dateStatus?: string;
	matchScore?: number;
	matchedSkills?: string[];
	missingSkills?: string[];
	salary?: string;
	source?: string;
}

export type ApplicationStage = 'saved' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected';

export interface Application {
	id: string;
	jobId?: string;
	company: string;
	role: string;
	location?: string;
	stage: ApplicationStage;
	url?: string;
	notes?: string;
	appliedAt?: string;
	createdAt?: string;
	updatedAt?: string;
}

export interface UserProfile {
	id?: string;
	email?: string;
	fullName?: string;
	skills?: string[];
	targetTitle?: string;
	minMatchThreshold?: number;
	structuredCv?: StructuredCv;
}

export interface StructuredCv {
	personalInfo?: {
		name?: string;
		email?: string;
		phone?: string;
		location?: string;
		linkedin?: string;
		github?: string;
	};
	summary?: string;
	skills?: {
		languages?: string[];
		frameworks?: string[];
		tools?: string[];
		databases?: string[];
		concepts?: string[];
	};
	experience?: Array<{
		title: string;
		company: string;
		location?: string;
		startDate?: string;
		endDate?: string;
		highlights: string[];
	}>;
	education?: Array<{
		degree: string;
		institution: string;
		location?: string;
		year?: string;
		details?: string;
	}>;
	projects?: Array<{
		name: string;
		techStack?: string[];
		description: string;
		link?: string;
	}>;
	languages?: Array<{
		name: string;
		level: string;
	}>;
}

export type ActiveTab = 'radar' | 'morocco' | 'tracker' | 'cv-profile';
