const axios = require('axios');
const { calculateMatchScore } = require('./matchingEngine');

/**
 * Generates tailored cover letter, LinkedIn pitch, cold message, and CV tips
 */
async function generateAIPitch({ job, profile, language = 'English', customNotes = '' }) {
  const match = calculateMatchScore(job, profile);
  const matchedSkillsStr = match.matchedSkills.join(', ') || 'Software Development, Problem Solving, Git';
  const missingSkillsStr = match.missingSkills.join(', ') || 'Cloud Architecture';

  // Check if external LLM API is configured
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const ollamaUrl = process.env.OLLAMA_URL;

  let llmResponse = null;

  const prompt = `You are an expert tech career coach for Morocco and global tech markets.
Candidate Profile:
- Name: ${profile.full_name || 'Candidate'}
- Current Title: ${profile.title || 'Software Developer'}
- Skills: ${matchedSkillsStr}
- Education: ${profile.education_summary || 'Computer Science / Engineering'}
- Location: ${profile.location || 'Morocco'}

Target Job:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Level: ${job.experienceLevel || 'Entry / Mid'}
- Key Tech Stack: ${matchedSkillsStr}
- Additional Context/Notes: ${customNotes || 'N/A'}
- Preferred Language: ${language}

Generate a JSON object with:
1. "coverLetter": A compelling, highly personalized 3-paragraph cover letter in ${language}.
2. "linkedinNote": A concise connection note for HR/Recruiters under 300 characters in ${language}.
3. "coldEmail": A direct email to the hiring manager with subject line.
4. "cvTips": Array of exactly 3 bullet points advising what to highlight on their CV.
Respond ONLY with raw JSON: {"coverLetter": "...", "linkedinNote": "...", "coldEmail": "...", "cvTips": ["...", "...", "..."]}`;

  try {
    if (geminiKey) {
      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        },
        { timeout: 10000 }
      );
      const text = res.data.candidates[0].content.parts[0].text;
      llmResponse = JSON.parse(text);
    } else if (groqKey) {
      const res = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        },
        { headers: { Authorization: `Bearer ${groqKey}` }, timeout: 10000 }
      );
      llmResponse = JSON.parse(res.data.choices[0].message.content);
    } else if (openaiKey) {
      const res = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        },
        { headers: { Authorization: `Bearer ${openaiKey}` }, timeout: 10000 }
      );
      llmResponse = JSON.parse(res.data.choices[0].message.content);
    } else if (ollamaUrl) {
      const res = await axios.post(
        `${ollamaUrl}/api/generate`,
        { model: 'llama3', prompt, stream: false, format: 'json' },
        { timeout: 15000 }
      );
      llmResponse = JSON.parse(res.data.response);
    }
  } catch (err) {
    console.warn('[AI Service] LLM call failed or timed out, switching to high-precision local template engine:', err.message);
  }

  if (llmResponse && llmResponse.coverLetter) {
    return {
      success: true,
      provider: 'llm',
      matchScore: match.matchScore,
      matchedSkills: match.matchedSkills,
      missingSkills: match.missingSkills,
      ...llmResponse
    };
  }

  // High-precision local fallback engine (deterministic & robust)
  const isFrench = language.toLowerCase().includes('fr');
  const candidateName = profile.full_name || 'Candidate';
  const roleTitle = job.title || 'Software Engineering Position';
  const companyName = job.company || 'your engineering team';

  let coverLetter = '';
  let linkedinNote = '';
  let coldEmail = '';
  let cvTips = [];

  if (isFrench) {
    coverLetter = `Madame, Monsieur l'équipe de recrutement chez ${companyName},

Actuellement ${profile.title || 'élève ingénieur / développeur passionné'} basé à ${profile.location || 'Maroc'}, je vous soumets ma candidature avec un vif enthousiasme pour l'opportunité de ${roleTitle}. Suivant de près l'innovation et les projets menés par ${companyName}, je suis convaincu que mon profil technique répond parfaitement à vos exigences opérationnelles.

Au cours de mes projets académiques et personnels, j'ai développé une solide maîtrise technique axée sur ${matchedSkillsStr}. Habitué à concevoir des architectures modulaires, fiables et orientées performance, j'accorde une importance primordiale aux bonnes pratiques (Clean Code, tests unitaires, revues de code et automatisation CI/CD). ${customNotes ? `Particulièrement motivé par : ${customNotes}.` : ''}

Rejoindre ${companyName} représente pour moi l'opportunité idéale d'apporter une réelle valeur ajoutée tout en continuant d'élever mes compétences au sein d'une équipe exigeante et bienveillante. Je me tiens à votre entière disposition pour un entretien afin de vous détailler mes réalisations techniques.

Dans cette attente, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

${candidateName}`;

    linkedinNote = `Bonjour ! Passionné par les projets menés chez ${companyName}, je candidate au poste de ${roleTitle}. Avec un background solide en ${matchedSkillsStr.split(',').slice(0, 2).join(' & ')}, je serais ravi d'échanger avec vous sur mon profil. Au plaisir !`;

    coldEmail = `Objet : Candidature : ${roleTitle} — ${candidateName}

Bonjour,

Je vous contacte au sujet du poste de ${roleTitle} au sein de ${companyName}.
Diplômé / étudiant en informatique avec une expertise pratique en ${matchedSkillsStr}, j'ai développé plusieurs projets d'envergure démontrant ma capacité à livrer des solutions robustes et évolutives.

Vous trouverez mon CV en pièce jointe ainsi que mes réalisations sur mon portfolio : ${profile.portfolio_url || 'disponible sur demande'}.

Seriez-vous ouvert à un rapide échange de 10 minutes cette semaine ?

Bien cordialement,
${candidateName}
${profile.phone || ''} | ${profile.email || ''}`;

    cvTips = [
      `Mettez en avant vos réalisations concrètes sur les technologies clés demandées : ${matchedSkillsStr || 'la stack demandée'}.`,
      `Structurez vos expériences sous le format STAR (Situation, Tâche, Action, Résultat chiffré) pour capter l'attention des recruteurs chez ${companyName}.`,
      missingSkillsStr ? `Préparez un exemple ou mentionnez votre rapidité d'apprentissage sur : ${missingSkillsStr}.` : 'Vérifiez la clarté de vos liens GitHub et LinkedIn.'
    ];
  } else {
    coverLetter = `Dear Hiring Team at ${companyName},

I am writing to express my strong interest in the ${roleTitle} opportunity at ${companyName}. As a ${profile.title || 'dedicated software engineer'} with hands-on expertise in modern tech stacks, I have been closely following ${companyName}'s impactful engineering work and would love to contribute to your team's mission.

Through my engineering projects and practical experience, I have developed strong competencies in ${matchedSkillsStr}. I specialize in building maintainable, high-performance systems and value clean architecture, automated testing, and agile collaboration. ${customNotes ? `Specifically, ${customNotes}.` : ''}

Joining ${companyName} is an exciting opportunity to apply my problem-solving skills to real-world challenges while collaborating with a high-caliber team. I welcome the opportunity to discuss how my technical background aligns with your current roadmap.

Thank you for your time and consideration.

Sincerely,
${candidateName}`;

    linkedinNote = `Hi! I noticed the ${roleTitle} opening at ${companyName} and would love to connect. I bring hands-on experience in ${matchedSkillsStr.split(',').slice(0, 2).join(' & ')} and believe my background would be a great fit for your team. Best, ${candidateName}.`;

    coldEmail = `Subject: Application: ${roleTitle} — ${candidateName}

Hi team,

I am reaching out regarding the ${roleTitle} opening at ${companyName}.
With a strong engineering foundation in ${matchedSkillsStr}, I have delivered production-grade projects focused on scalability and clean architecture.

My resume and key portfolio projects are available at ${profile.portfolio_url || 'my GitHub'}.

I would appreciate the opportunity to have a brief 10-minute introductory conversation.

Best regards,
${candidateName}
${profile.email || ''} | ${profile.phone || ''}`;

    cvTips = [
      `Emphasize quantifiable achievements with the core technologies: ${matchedSkillsStr}.`,
      `Tailor your summary section to directly mirror keywords from ${companyName}'s job description.`,
      missingSkillsStr ? `Prepare a brief talking point showing readiness to ramp up quickly on: ${missingSkillsStr}.` : 'Ensure live demo links or GitHub repositories are clickable in your PDF.'
    ];
  }

  return {
    success: true,
    provider: 'local-template-engine',
    matchScore: match.matchScore,
    matchedSkills: match.matchedSkills,
    missingSkills: match.missingSkills,
    coverLetter,
    linkedinNote,
    coldEmail,
    cvTips
  };
}

module.exports = { generateAIPitch };
