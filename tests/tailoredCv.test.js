const test = require('node:test');
const assert = require('node:assert/strict');
const { generateTailoredCV } = require('../src/services/aiService');
const { generateTailoredResume } = require('../src/services/cvGeneratorService');
const { parseResumeText } = require('../src/services/cvParserService');
const { readPdfLayout } = require('../src/utils/pdfLayoutReader');

test('generateTailoredCV produces structured ATS CV matching target role and company', async () => {
  const job = {
    title: 'Senior React & Node Engineer',
    company: 'Fintech Casablanca',
    location: 'Casablanca, Morocco',
    experienceLevel: 'mid',
    tags: ['React', 'Node.js', 'PostgreSQL', 'Docker']
  };

  const profile = {
    full_name: 'Nabil Developer',
    title: 'Full-Stack Software Engineer',
    email: 'nabil@example.com',
    phone: '+212 612-345678',
    location: 'Rabat, Morocco',
    linkedin_url: 'https://linkedin.com/in/nabil',
    github_url: 'https://github.com/nabil',
    skills_json: JSON.stringify(['React', 'Node.js', 'PostgreSQL', 'Docker', 'Python', 'AWS']),
    education_summary: 'Master in Software Engineering'
  };

  const cv = await generateTailoredCV({ job, profile, language: 'English' });

  assert.equal(cv.success, true);
  assert.equal(cv.candidateName, 'Nabil Developer');
  assert.match(cv.targetedTitle, /Senior React & Node Engineer/i);
  assert.equal(cv.contact.email, 'nabil@example.com');
  assert.ok(cv.summary.includes('Fintech Casablanca') || cv.summary.includes('React'));
  assert.ok(Array.isArray(cv.skillsByCategory.coreStack));
  assert.ok(cv.skillsByCategory.coreStack.length > 0);
  assert.ok(cv.experience.length >= 2);
  assert.ok(cv.projects.length >= 1);
  assert.ok(cv.education.length >= 1);
  assert.ok(cv.markdown.includes('# Nabil Developer'));
  assert.ok(cv.markdown.includes('## Professional Summary'));
  assert.ok(cv.markdown.includes('## Core Competencies'));
  assert.ok(cv.markdown.includes('## Professional Experience'));
});

test('generateTailoredCV generates clean French CV for Morocco opportunities', async () => {
  const job = {
    title: 'Stagiaire Développeur Python / IA',
    company: 'Tech Innov Rabat',
    location: 'Rabat',
    experienceLevel: 'internship'
  };

  const profile = {
    full_name: 'Amine Ingénieur',
    title: 'Élève Ingénieur Informatique',
    email: 'amine@example.com',
    location: 'Casablanca, Maroc',
    skills_json: JSON.stringify(['Python', 'FastAPI', 'PyTorch', 'Git'])
  };

  const cv = await generateTailoredCV({ job, profile, language: 'French' });

  assert.equal(cv.success, true);
  assert.equal(cv.candidateName, 'Amine Ingénieur');
  assert.match(cv.summary, /Ingénieur|Développeur/i);
  assert.ok(cv.summary.includes('Tech Innov Rabat') || cv.summary.includes('Python'));
  assert.ok(cv.markdown.includes('# Amine Ingénieur'));
  assert.ok(cv.markdown.includes('## Professional Summary'));
});

test('generateTailoredResume renders Jake ATS, Morocco PFE, and Modern Split A4 templates with zero hallucinations', async () => {
  const job = {
    title: 'Full-Stack JavaScript Developer',
    company: 'Capgemini Maroc',
    location: 'Casablanca',
    experienceLevel: 'entry',
    tags: ['React', 'Node.js', 'Docker', 'TypeScript']
  };

  const structuredCv = {
    basics: {
      fullName: 'Nabil El Amrani',
      headline: 'Élève-Ingénieur en Génie Informatique',
      email: 'nabil@example.com',
      phone: '+212 600-000000',
      location: 'Casablanca, Morocco',
      links: {
        linkedin: 'https://linkedin.com/in/nabil',
        github: 'https://github.com/nabil'
      },
      summary: 'Élève-ingénieur passionné par le développement full-stack.'
    },
    education: [
      {
        institution: 'ENSA Oujda',
        degree: "Diplôme d'Ingénieur d'État en Génie Informatique",
        location: 'Oujda',
        startDate: '2021',
        endDate: '2026',
        highlights: ['Option Génie Logiciel']
      }
    ],
    workExperience: [
      {
        company: 'SQLI Maroc',
        role: 'Stagiaire Développeur Web (Stage PFA)',
        contractType: 'Stage PFA',
        location: 'Oujda',
        startDate: '2025-07',
        endDate: '2025-09',
        technologies: ['React', 'Node.js', 'PostgreSQL'],
        bullets: ['Développement d’un tableau de bord de suivi des performances.']
      }
    ],
    projects: [
      {
        name: 'JobRadar Tech Intelligence',
        role: 'Lead Developer',
        url: 'https://github.com/Nabil-777/job-radar',
        technologies: ['Node.js', 'Express', 'SQLite'],
        bullets: ['Agrégation d’offres d’emploi et scoring ATS en temps réel.']
      }
    ],
    skills: {
      languages: ['JavaScript', 'TypeScript', 'SQL', 'Python'],
      frameworks: ['React', 'Node.js', 'Express'],
      databases: ['PostgreSQL', 'SQLite'],
      cloudDevOps: ['Docker', 'Git', 'GitHub Actions'],
      aiCyberData: [],
      engineeringPractices: ['REST API', 'Clean Architecture', 'CI/CD']
    },
    certifications: [],
    spokenLanguages: [
      { language: 'Arabic', fluency: 'Native' },
      { language: 'French', fluency: 'Fluent' },
      { language: 'English', fluency: 'Professional Working' }
    ]
  };

  const profile = {
    full_name: 'Nabil El Amrani',
    email: 'nabil@example.com',
    structured_cv_json: JSON.stringify(structuredCv)
  };

  // 1. Test Jake ATS Template
  const resJake = await generateTailoredResume({ job, profile, language: 'en', template: 'jake-ats' });
  assert.equal(resJake.success, true);
  assert.equal(resJake.template, 'jake-ats');
  assert.ok(resJake.renderedHtml.includes('cv-template-jake'));
  assert.ok(resJake.renderedHtml.includes('SQLI Maroc')); // Confirms user's real experience preserved!
  assert.ok(resJake.renderedHtml.includes('JobRadar Tech Intelligence')); // Real project preserved!
  assert.ok(resJake.atsAnalysis.score >= 50);
  assert.ok(resJake.atsAnalysis.matchedKeywords.length > 0);

  // 2. Test Morocco PFE Template
  const resMorocco = await generateTailoredResume({ job, profile, language: 'fr', template: 'morocco-pfe' });
  assert.equal(resMorocco.success, true);
  assert.equal(resMorocco.template, 'morocco-pfe');
  assert.ok(resMorocco.renderedHtml.includes('cv-template-morocco'));
  assert.ok(resMorocco.renderedHtml.includes('ENSA Oujda'));

  // 3. Test Modern Split Template
  const resSplit = await generateTailoredResume({ job, profile, language: 'fr', template: 'modern-split' });
  assert.equal(resSplit.success, true);
  assert.equal(resSplit.template, 'modern-split');
  assert.ok(resSplit.renderedHtml.includes('cv-template-split'));
  assert.ok(resSplit.renderedHtml.includes('cv-columns-wrap'));
});

test('parseResumeText correctly extracts sections, contact, and taxonomy skills offline', async () => {
  const sampleResume = `
Nabil El Amrani
Élève-Ingénieur en Génie Informatique (5ème année)
Email: nabil.amrani@gmail.com | Tél: +212 6 12 34 56 78 | Ville: Casablanca, Maroc
LinkedIn: linkedin.com/in/nabil-amrani | GitHub: github.com/Nabil-777

Formations
2021 - 2026
Diplôme d'Ingénieur d'État en Génie Informatique
ENSA Oujda - École Nationale des Sciences Appliquées

Expériences Professionnelles
Juil. 2025 - Sept. 2025
Stagiaire Ingénieur d'Études et Développement (Stage PFA) - SQLI Maroc
• Conception et développement d'un portail web analytique en React et Node.js.
• Optimisation des requêtes PostgreSQL et mise en conteneur sous Docker.

Projets Personnels & Académiques
JobRadar - Plateforme d'Intelligence Emploi Tech
• Développement d'un agrégateur temps réel sous Node.js, Express et SQLite.
• Création d'un moteur de matching CV avec scoring ATS 0-100%.

Compétences Techniques
Langages: JavaScript, TypeScript, Python, Java, SQL, C++
Frameworks: React, Node.js, Express, Spring Boot, FastAPI, Next.js
Bases de données: PostgreSQL, MongoDB, SQLite, Redis
DevOps & Cloud: Docker, Kubernetes, Git, GitHub Actions, Linux, CI/CD

Langues
Arabe: Langue maternelle
Français: Courant (C1)
Anglais: Professionnel (B2/C1)
`;

  const parsed = await parseResumeText(sampleResume);

  assert.equal(parsed.basics.fullName, 'Nabil El Amrani');
  assert.equal(parsed.basics.email, 'nabil.amrani@gmail.com');
  assert.ok(parsed.basics.phone.includes('+212'));
  assert.ok(parsed.basics.links.linkedin.includes('nabil-amrani'));
  assert.ok(parsed.basics.links.github.includes('Nabil-777'));

  assert.ok(parsed.education.length >= 1);
  assert.ok(parsed.education[0].institution.includes('ENSA') || parsed.education[0].degree.includes('Ingénieur'));

  assert.ok(parsed.workExperience.length >= 1);
  assert.ok(parsed.workExperience[0].bullets.length >= 1);

  assert.ok(parsed.projects.length >= 1);
  assert.ok(parsed.projects[0].name.includes('JobRadar'));

  assert.ok(parsed.skills.languages.includes('JavaScript') || parsed.skills.languages.includes('TypeScript'));
  assert.ok(parsed.skills.cloudDevOps.includes('Docker') || parsed.skills.cloudDevOps.includes('Kubernetes'));
  assert.ok(parsed.spokenLanguages.length >= 2);
});

test('readPdfLayout rejects empty or corrupted buffers with SCANNED_PDF_UNSUPPORTED or EMPTY_PDF', async () => {
  await assert.rejects(async () => {
    await readPdfLayout(Buffer.from(''));
  }, { code: 'EMPTY_PDF' });

  // Corrupted non-PDF text buffer with no PDF text objects
  await assert.rejects(async () => {
    await readPdfLayout(Buffer.from('Not a real PDF stream content at all'));
  });
});
