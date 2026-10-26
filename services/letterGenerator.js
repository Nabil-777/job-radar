const { getProfile } = require('./storage');

/**
 * Generates an impactful Cold Email / Cover Letter tailored to a specific job and company
 */
function generateCoverLetter({ jobTitle, company, location, language = 'English', customNotes = '' }) {
  const profile = getProfile();

  const lang = language.toLowerCase();

  if (lang.startsWith('fr') || lang === 'french') {
    return {
      subject: `Candidature : ${jobTitle} - ${profile.fullName}`,
      body: `Madame, Monsieur,

Je me permets de vous contacter afin de vous soumettre ma candidature pour le poste de ${jobTitle} au sein de ${company}.

Actuellement étudiant(e) / diplômé(e) en ${profile.school}, je développe une expertise solide dans les domaines suivants : ${profile.skills}. Passionné(e) par les défis technologiques actuels et admirant le travail accompli par les équipes de ${company}, je souhaite vivement mettre mes compétences et ma rigueur au service de vos projets.

Au cours de mes projets pratiques, j'ai notamment eu l'opportunité de concevoir et déployer des solutions concrètes, ce qui m'a permis d'acquérir une forte autonomie, un esprit d'analyse aiguisé et une grande adaptabilité.
${customNotes ? `\nNote particulière : ${customNotes}\n` : ''}
Vous trouverez ci-joint mon CV ainsi que des exemples de mes réalisations sur mon profil GitHub / Portfolio (${profile.portfolioUrl || 'disponible sur demande'}).

Je serais ravi(e) d'échanger avec vous lors d'un bref entretien pour vous exposer plus en détail ma motivation et la façon dont je pourrais contribuer aux objectifs de ${company}.

Je vous remercie par avance pour l'attention que vous porterez à ma candidature et vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

${profile.fullName}
${profile.title}
Téléphone : ${profile.phone}
Email : ${profile.email}
LinkedIn : ${profile.linkedinUrl}
Portfolio : ${profile.portfolioUrl}`
    };
  }

  // Default: English (International & Tech Standard)
  return {
    subject: `Application: ${jobTitle} - ${profile.fullName}`,
    body: `Dear Hiring Team at ${company},

I am writing to express my strong interest in the ${jobTitle} position at ${company}.

With a background in ${profile.school} and hands-on experience in ${profile.skills}, I have been actively following ${company}'s work and would be thrilled to bring my problem-solving mindset and technical skills to your engineering team.

Key highlights I bring to this role:
- Solid foundation in core technologies: ${profile.skills}
- Proven track record of building and shipping end-to-end projects with high code quality and best practices
- Quick learner with a passion for diving deep into complex technical challenges and collaborating with cross-functional teams
${customNotes ? `\nAdditional context: ${customNotes}\n` : ''}
You can explore some of my latest work and code repositories on GitHub/Portfolio: ${profile.portfolioUrl || 'available upon request'}
LinkedIn Profile: ${profile.linkedinUrl}

I would welcome the opportunity to discuss how my skill set and enthusiasm align with your goals for the ${jobTitle} role. Thank you very much for your time and consideration.

Best regards,

${profile.fullName}
${profile.title}
Phone: ${profile.phone}
Email: ${profile.email}
LinkedIn: ${profile.linkedinUrl}
Portfolio / GitHub: ${profile.portfolioUrl}`
  };
}

module.exports = { generateCoverLetter };
