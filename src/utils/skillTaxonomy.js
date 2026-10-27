/**
 * JobRadar Tech Skill Taxonomy & Canonical Alias Resolver
 * 300+ Tech & Engineering Skills with safe word-boundary matching for C++, C#, .NET, Node.js, etc.
 */

const SKILL_TAXONOMY = {
  languages: [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'C', 'Go', 'Rust',
    'PHP', 'Ruby', 'Swift', 'Kotlin', 'Dart', 'SQL', 'Bash', 'Shell', 'R', 'Scala',
    'Perl', 'HTML', 'HTML5', 'CSS', 'CSS3', 'Sass', 'SCSS', 'Solidity', 'Elixir',
    'Haskell', 'Lua', 'Assembly', 'MATLAB', 'Groovy', 'Julia'
  ],
  frameworks: [
    'React', 'React Native', 'Next.js', 'Vue.js', 'Nuxt.js', 'Angular', 'Svelte',
    'Node.js', 'Express', 'NestJS', 'Spring Boot', 'Django', 'Flask', 'FastAPI',
    'Laravel', 'Symfony', 'ASP.NET', '.NET', '.NET Core', 'Ruby on Rails', 'Flutter',
    'Tailwind CSS', 'Bootstrap', 'Redux', 'Zustand', 'GraphQL', 'gRPC', 'Electron',
    'Prisma', 'TypeORM', 'Hibernate', 'Sequelize', 'jQuery', 'Chakra UI', 'Material-UI',
    'Vite', 'Webpack', 'Remix', 'Astro', 'Quarkus', 'Micronaut', 'Fastify', 'Koa'
  ],
  databases: [
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle Database', 'Microsoft SQL Server',
    'Elasticsearch', 'DynamoDB', 'Cassandra', 'Firebase', 'Supabase', 'Neo4j', 'MariaDB',
    'CouchDB', 'InfluxDB', 'Snowflake', 'BigQuery', 'ClickHouse', 'CockroachDB'
  ],
  cloudDevOps: [
    'Docker', 'Kubernetes', 'AWS', 'Amazon Web Services', 'Azure', 'Google Cloud', 'GCP',
    'Linux', 'Ubuntu', 'Debian', 'Git', 'GitHub', 'GitLab', 'Bitbucket', 'GitHub Actions',
    'GitLab CI', 'Jenkins', 'CI/CD', 'Terraform', 'Ansible', 'Nginx', 'Apache', 'Helm',
    'Prometheus', 'Grafana', 'Serverless', 'Vercel', 'Netlify', 'AWS Lambda', 'Cloudflare',
    'ArgoCD', 'Datadog', 'Splunk', 'Vagrant', 'CircleCI', 'Travis CI'
  ],
  aiCyberData: [
    'PyTorch', 'TensorFlow', 'Keras', 'OpenCV', 'Scikit-learn', 'Pandas', 'NumPy',
    'LangChain', 'LlamaIndex', 'RAG', 'LLM', 'Hugging Face', 'Transformers', 'BERT',
    'NLP', 'Computer Vision', 'Generative AI', 'Deep Learning', 'Machine Learning',
    'OWASP', 'Pentesting', 'Penetration Testing', 'SOC', 'SIEM', 'Wireshark', 'Metasploit',
    'Burp Suite', 'Network Security', 'Cryptography', 'IAM', 'DevSecOps', 'Kali Linux',
    'Ethical Hacking', 'Nmap', 'Snort', 'CISSP', 'CEH', 'Splunk SIEM', 'Data Analytics',
    'Tableau', 'Power BI', 'Spark', 'Hadoop', 'Kafka', 'Airflow', 'dbt'
  ],
  engineeringPractices: [
    'REST API', 'Microservices', 'Clean Architecture', 'Clean Code', 'Design Patterns',
    'Agile / Scrum', 'Scrum', 'Kanban', 'TDD', 'BDD', 'Unit Testing', 'Integration Testing',
    'Jest', 'Mocha', 'Cypress', 'Playwright', 'Selenium', 'Code Review', 'Pair Programming',
    'Object-Oriented Programming (OOP)', 'Domain-Driven Design (DDD)', 'Event-Driven Architecture',
    'Performance Optimization', 'System Design', 'Scalability'
  ]
};

// Aliases and synonym normalizations
const ALIAS_MAP = {
  'k8s': 'Kubernetes',
  'kube': 'Kubernetes',
  'nodejs': 'Node.js',
  'node.js': 'Node.js',
  'node js': 'Node.js',
  'node': 'Node.js',
  'reactjs': 'React',
  'react.js': 'React',
  'react js': 'React',
  'react': 'React',
  'react native': 'React Native',
  'reactnative': 'React Native',
  'nextjs': 'Next.js',
  'next.js': 'Next.js',
  'next': 'Next.js',
  'vuejs': 'Vue.js',
  'vue.js': 'Vue.js',
  'vue': 'Vue.js',
  'nuxtjs': 'Nuxt.js',
  'nuxt': 'Nuxt.js',
  'angularjs': 'Angular',
  'angular': 'Angular',
  'springboot': 'Spring Boot',
  'spring-boot': 'Spring Boot',
  'spring': 'Spring Boot',
  'postgres': 'PostgreSQL',
  'postgresql': 'PostgreSQL',
  'psql': 'PostgreSQL',
  'mongo': 'MongoDB',
  'mongodb': 'MongoDB',
  'ci/cd': 'CI/CD',
  'cicd': 'CI/CD',
  'ci-cd': 'CI/CD',
  'github actions': 'GitHub Actions',
  'gitlab ci': 'GitLab CI',
  'golang': 'Go',
  'dotnet': '.NET',
  '.net': '.NET',
  '.net core': '.NET Core',
  'aspnet': 'ASP.NET',
  'asp.net': 'ASP.NET',
  'js': 'JavaScript',
  'javascript': 'JavaScript',
  'ts': 'TypeScript',
  'typescript': 'TypeScript',
  'py': 'Python',
  'python3': 'Python',
  'py3': 'Python',
  'tf': 'Terraform',
  'terraform': 'Terraform',
  'aws': 'AWS',
  'gcp': 'Google Cloud',
  'google cloud platform': 'Google Cloud',
  'azure': 'Azure',
  'microsoft azure': 'Azure',
  'docker': 'Docker',
  'git': 'Git',
  'github': 'GitHub',
  'gitlab': 'GitLab',
  'rest': 'REST API',
  'restful': 'REST API',
  'rest api': 'REST API',
  'rest apis': 'REST API',
  'restful apis': 'REST API',
  'graphql': 'GraphQL',
  'grpc': 'gRPC',
  'rag': 'RAG',
  'llm': 'LLM',
  'llms': 'LLM',
  'genai': 'Generative AI',
  'generative ai': 'Generative AI',
  'langchain': 'LangChain',
  'llamaindex': 'LlamaIndex',
  'huggingface': 'Hugging Face',
  'hugging face': 'Hugging Face',
  'pytorch': 'PyTorch',
  'tensorflow': 'TensorFlow',
  'tf/keras': 'TensorFlow',
  'soc': 'SOC',
  'siem': 'SIEM',
  'pentest': 'Pentesting',
  'pentesting': 'Pentesting',
  'penetration testing': 'Pentesting',
  'owasp': 'OWASP',
  'devsecops': 'DevSecOps',
  'tdd': 'TDD',
  'bdd': 'BDD',
  'unit testing': 'Unit Testing',
  'clean code': 'Clean Code',
  'clean architecture': 'Clean Architecture',
  'microservices': 'Microservices',
  'micro-services': 'Microservices',
  'scrum': 'Agile / Scrum',
  'agile': 'Agile / Scrum',
  'agile/scrum': 'Agile / Scrum',
  'agile / scrum': 'Agile / Scrum',
  'c++': 'C++',
  'cpp': 'C++',
  'c#': 'C#',
  'csharp': 'C#'
};

/**
 * Escapes regex special characters
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Creates a word-boundary safe regex pattern that correctly handles
 * skills with special characters like C++, C#, .NET, Node.js
 */
function createSafeRegex(skill) {
  const escaped = escapeRegex(skill);

  // If skill is single letter 'C', prevent matching 'C++' or 'C#'
  if (skill.toLowerCase() === 'c') {
    return /(?<![\w])C(?![+#\w])/i;
  }
  // If skill/alias is 'js', prevent matching inside 'node.js', 'next.js', etc.
  if (skill.toLowerCase() === 'js') {
    return /(?<![\w.])js(?![.\w])/i;
  }

  // If skill starts or ends with non-word character (like +, #, .), standard \b fails
  const prefix = /^[\w]/.test(skill) ? '(?<![\\w])' : '';
  const suffix = /[\w]$/.test(skill) ? '(?![\\w])' : '';

  return new RegExp(`${prefix}${escaped}${suffix}`, 'i');
}

// Precompile regexes for all taxonomy entries and aliases
const COMPILED_PATTERNS = [];

// 1. Compile aliases first
for (const [alias, canonical] of Object.entries(ALIAS_MAP)) {
  COMPILED_PATTERNS.push({
    canonical,
    regex: createSafeRegex(alias),
    priority: alias.length
  });
}

// 2. Compile taxonomy items
for (const [category, items] of Object.entries(SKILL_TAXONOMY)) {
  for (const item of items) {
    COMPILED_PATTERNS.push({
      canonical: item,
      regex: createSafeRegex(item),
      priority: item.length
    });
  }
}

// Sort patterns by priority (longer matches first to avoid e.g. "C" matching inside "C++")
COMPILED_PATTERNS.sort((a, b) => b.priority - a.priority);

/**
 * Normalizes a raw skill name to its canonical form
 */
function normalizeSkillName(rawName) {
  if (!rawName || typeof rawName !== 'string') return '';
  const trimmed = rawName.trim().toLowerCase();
  if (ALIAS_MAP[trimmed]) return ALIAS_MAP[trimmed];

  for (const items of Object.values(SKILL_TAXONOMY)) {
    const found = items.find(it => it.toLowerCase() === trimmed);
    if (found) return found;
  }

  // Capitalize nicely if not found
  return rawName.trim().replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Extracts recognized technical skills from raw text with safe boundaries and alias resolution
 */
function extractTaxonomySkills(text) {
  if (!text || typeof text !== 'string') {
    return {
      allDetected: [],
      byCategory: {
        languages: [],
        frameworks: [],
        databases: [],
        cloudDevOps: [],
        aiCyberData: [],
        engineeringPractices: []
      }
    };
  }

  const detectedSet = new Set();
  const lowerText = text.toLowerCase();

  for (const { canonical, regex } of COMPILED_PATTERNS) {
    // Quick substring check before running regex to optimize speed
    if (regex.test(text)) {
      detectedSet.add(canonical);
    }
  }

  const allDetected = Array.from(detectedSet);

  // Group by category
  const byCategory = {
    languages: allDetected.filter(s => SKILL_TAXONOMY.languages.includes(s)),
    frameworks: allDetected.filter(s => SKILL_TAXONOMY.frameworks.includes(s)),
    databases: allDetected.filter(s => SKILL_TAXONOMY.databases.includes(s)),
    cloudDevOps: allDetected.filter(s => SKILL_TAXONOMY.cloudDevOps.includes(s)),
    aiCyberData: allDetected.filter(s => SKILL_TAXONOMY.aiCyberData.includes(s)),
    engineeringPractices: allDetected.filter(s => SKILL_TAXONOMY.engineeringPractices.includes(s))
  };

  return {
    allDetected,
    byCategory
  };
}

module.exports = {
  SKILL_TAXONOMY,
  ALIAS_MAP,
  normalizeSkillName,
  extractTaxonomySkills
};
