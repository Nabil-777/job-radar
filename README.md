# 🎯 JobRadar - Automated Tech Job & Internship Finder

JobRadar huwa ssystem kaml li kiyjm3 lik **Internships (Stage / PFE)**, **Entry-Level (Junior)**, wla **Any Specific Job Level** f domains dyal tech b7al **AI Engineering**, **Cybersecurity**, **Software Development**, **Cloud / DevOps**, w **Data Science**.

Kiyjbed les offres f real-time mn **19+ dial les plus grandes plateformes + Système d'Ajout de Providers Personnalisés**:
1. 🇲🇦 **Jobzyn.com** (Le "Welcome to the Jungle" marocain - Startups, Scale-ups & boîtes Tech modernes)
2. 🇲🇦 **WeTech.ma** (Site 100% dédié aux métiers de l'informatique & Cloud au Maroc)
3. 🇲🇦 **Talent.com Maroc (ma.talent.com)** (Moteur d'agrégation d'offres d'emploi & stages IT à travers tout le Maroc)
4. 🇲🇦 **Dreamjob.ma** (Stages d'entreprises & concours IT du secteur public, semi-public et privé)
5. 🇲🇦 **Emploi.ma** (Le grand portail d'offres d'emploi et stages techniques au Maroc)
6. 🇲🇦 **Morocco Top ESN Hub** (Les plus gros recruteurs IT au Maroc : Capgemini, DXC, CGI, Alten, Inetum, SQLI, Atos, Sofrecom, Oracle Labs...)
7. 🇲🇦 **Rekrute.com** (Leader historique des stages PFE, pré-embauche et postes IT au Maroc)
8. ⚡ **Custom Providers & RSS Feeds Engine** (Ajoute n'importe quel flux RSS, blog carrières ou API JSON en 1 clic)
9. 🚀 **GitHub Tech Index / SimplifyJobs** (Plus de 2,400+ stages w jobs Junior chez FAANG & Top Tech: Google, Amazon, Apple, Meta, Adobe, Qualcomm, BCG, EA...)
10. 🟠 **Indeed** (Live scraper b direct links dial Greenhouse, Lever, Workable, BambooHR, ADP)
11. 🔵 **LinkedIn Jobs** (Live guest scraper f ga3 les pays - Maroc, Remote, USA, Europe...)
12. ✈️ **Relocate.me** (Offres tech f l'Europe avec Visa Sponsorship & Relocation pris en charge)
13. 🦄 **Y Combinator (YC)** (Offres officielles dial les startups accélérées par YC)
14. 🏔️ **Himalayas** (Top global remote tech job board avec salaires affichés)
15. 🌐 **Jobicy** (Worldwide remote jobs f dev, AI, cybersecurity)
16. 💼 **WeWorkRemotely** (WWR - plus grand site d télétravail tech)
17. 🟧 **Hacker News (Who is Hiring)** (Offres directes des fondateurs w CTOs de startups Silicon Valley)
18. 🔴 **Remotive** (Worldwide remote developer & security jobs)
19. 🟡 **RemoteOK** (100% remote tech jobs)
20. 🟣 **Arbeitnow** (Tech jobs f Europe & Global avec visa sponsorship)

---

## 🇲🇦 Nouveau Onglet Dédié : "Morocco Tech Hub"
Daba f l'application f [http://localhost:4000](http://localhost:4000) ghadi tl9a onglet jdid **"🇲🇦 Morocco Tech Hub"** fih :
1. **Les Portails Directs des ESN / SSII (80% des PFE & Juniors au Maroc) :**
   * **Capgemini Engineering / TS Maroc** (Casa Nearshore, Rabat, Fès)
   * **DXC Technology Maroc** (Technopolis Rabat, Casa)
   * **CGI Maroc** (Rabat, Casa, Fès)
   * **Alten Maroc** (Rabat, Fès, Tétouan, Casa)
   * **Inetum & Sofrecom (Orange IT)**
   * **Oracle Labs Maroc (R&D Elite)**
   * **SQLI Maroc** (Rabat, Casa, Oujda)
   * **Atos / Eviden Maroc**
   * **Sopra Steria Maroc**
   * *Bouton 1-click pour scanner les offres en direct ou ouvrir le portail carrières officiel.*
2. **Les Jobboards Tech au Maroc :** WeTech.ma, Jobzyn.com, Rekrute.com, Geeksblabla Community.
3. **Programmes Bootcamps & Insertion Directe :** JobInTech.academy (100% gratuit, 200+ entreprises partenaires), YouCode & 1337, ARK-X.
4. **Remote depuis le Maroc (En Devises) :** Welcome to the Jungle (Télétravail total France), Wellfound (Startups), Ureed.com & Bayt (Dubaï & Golfe).

---

## ⚡ Quick Start

### 1. Run the Web Dashboard
Khdem biha direct mn browser dyalk:
```bash
cd "C:\Users\Admin\.gemini\antigravity\scratch\job-radar"
npm start
```
Ouvri f browser: **[http://localhost:4000](http://localhost:4000)**

### 2. Run from Terminal (CLI)
Ila bghiti tjbed les offres direct mn command line:
```bash
# 1. Jbed les offres de Jobzyn.com (Startups marocaines)
node cli.js --source jobzyn --keywords "React"

# 2. Jbed les offres de WeTech.ma (100% IT Maroc)
node cli.js --source wetech --level all

# 3. Jbed les offres de Talent.com Maroc (ma.talent.com)
node cli.js --source talent-morocco --keywords "informatique"

# 4. Jbed les stages et concours IT de Dreamjob.ma
node cli.js --source dreamjob --level internship

# 5. Jbed les offres des plus grandes ESN au Maroc (Capgemini, DXC, CGI, Alten...)
node cli.js --source esn-morocco --level internship --location Morocco

# 6. Jbed les stages AI dial FAANG / Top Tech (GitHub Index)
node cli.js --source simplify --level internship --keywords "AI"

# 7. Jbed les offres avec Visa Sponsorship pour l'Europe (Relocate.me)
node cli.js --source relocate --keywords "Python"

# 8. Ga3 les 18 plateformes en même temps :
node cli.js --source all --domain dev --level internship --location Morocco
```

---

## 📁 Project Structure
```
job-radar/
├── server.js                 # Express Server & REST API (port 4000)
├── cli.js                    # Command-line interface
├── package.json
├── services/
│   ├── jobzynService.js      # Jobzyn.com (Maroc Startups, Scale-ups & Tech)
│   ├── wetechService.js      # WeTech.ma (100% IT & Cloud au Maroc)
│   ├── talentMoroccoService.js# Talent.com Morocco (Agrégateur national IT)
│   ├── dreamjobService.js    # Dreamjob.ma (Stages & Concours IT)
│   ├── esnMoroccoService.js  # Morocco Top ESNs Hub (Capgemini, DXC, CGI, Alten, Inetum, SQLI...)
│   ├── rekruteService.js     # Rekrute.com (Morocco IT & Stage PFE)
│   ├── simplifyService.js    # GitHub Tech Index (2,400+ Internships & New Grad)
│   ├── indeedService.js      # Indeed live crawler (Direct Greenhouse/Lever links)
│   ├── linkedinScraper.js    # LinkedIn live guest scraper
│   ├── relocateService.js    # Relocate.me (Europe Visa Sponsored & Relocation)
│   ├── ycJobStoriesService.js# Y Combinator official startup job stories
│   ├── hackerNewsService.js  # Hacker News "Who is Hiring" founder postings
│   ├── himalayasService.js   # Himalayas API (Global remote tech & salaries)
│   ├── jobicyService.js      # Jobicy API
│   ├── wwrService.js         # WeWorkRemotely RSS feeds
│   ├── remotiveService.js    # Remotive API
│   ├── remoteokService.js    # RemoteOK API
│   ├── arbeitnowService.js   # Arbeitnow API
│   ├── aggregator.js         # Unified engine connecting all 18 providers
│   ├── storage.js            # Persistent JSON storage for tracked jobs
│   └── letterGenerator.js    # Cold Email & Cover Letter generator (EN & FR)
├── data/
│   ├── applications.json     # Tracked job applications
│   └── user_profile.json     # User profile details
└── public/
    ├── index.html            # Modern dashboard with dedicated Morocco Directory
    ├── app.js                # Search, filter, tracker, modal & export logic
    └── styles.css            # Custom badges & theme styling
```
