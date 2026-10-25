import type { Language, Rule, TokenKind } from './types'

const PREFIX = '/code/phase0/'

/** Les fichiers du dossier code/phase0, lus tels quels à la compilation (le site n'exécute rien de ce code). */
const modules = import.meta.glob<string>(
  [
    '/code/phase0/**/*.{yml,ts,tsx,js,json,html,css,md,sh}',
    '/code/phase0/**/Dockerfile',
    '/code/phase0/.env.example',
    '/code/phase0/.dockerignore',
    '!/code/phase0/data/**',
    '!/code/phase0/web/node_modules/**',
    '!/code/phase0/web/dist/**',
    '!/code/phase0/**/package-lock.json',
    // Frigate écrit des fichiers cachés (.search_stats.json…) à côté de sa config : à ignorer,
    // sinon chaque écriture recharge le site en développement.
    '!/code/phase0/frigate/config/.*',
  ],
  { query: '?raw', import: 'default', eager: true },
)

/** Contenu de chaque fichier, par chemin relatif à code/phase0. */
export const FILES: Record<string, string> = Object.fromEntries(
  Object.entries(modules).map(([path, content]) => [path.slice(PREFIX.length), content]),
)

export const DEFAULT_FILE = 'docker-compose.yml'
export const TREE_LABEL = 'Fichiers de la phase 0'

/** À la racine : les fichiers d'abord, puis les blocs dans cet ordre. */
export const ORDER = [
  'README.md',
  'docker-compose.yml',
  '.env.example',
  '.dockerignore',
  'certs',
  'frigate',
  'sync',
  'api',
  'web',
  'index.html',
  'package.json',
  'vite.config.ts',
  'tsconfig.json',
  'eslint.config.ts',
  'src',
  'main.tsx',
  'index.css',
  'types.ts',
  'lib',
  'components',
  'App',
  'types.ts',
  'constants.ts',
  'helpers.ts',
  'UI.tsx',
  'index.ts',
]

export const EXPLANATIONS: Record<string, string> = {
  'README.md': 'Point d’entrée du dossier : le plan des fichiers, comment démarrer la pile (comptes Frigate, clé de l’API, CA de la maison), la WebApp React et ce qu’il faut savoir (ports publiés, où sont les données, HTTPS et même hôte que Frigate).',
  'docker-compose.yml': 'Décrit les trois conteneurs et comment ils se parlent. Frigate et House Sync partagent un réseau, l’API est sur un autre. Seuls les ports 8971 (Frigate, avec connexion) et 8080 (API) sont publiés ; le port 5000 de Frigate reste interne. Le dossier data/backup est écrit par House Sync et monté en lecture seule dans l’API. House Sync reçoit l’adresse publique de Frigate, l’API reçoit la clé secrète. Le conteneur certs tourne d’abord et s’arrête ; Frigate et l’API lisent le certificat qu’il a créé, Frigate dans un sous-dossier sans la clé de la CA.',
  '.env.example': 'Modèle des secrets : mot de passe de la Reolink, compte viewer de House Sync, adresse de Frigate vue du navigateur, clé secrète de l’API et hôtes du certificat. On le copie en .env, qui n’est jamais commité.',
  'frigate/config/config.yml': 'Configuration de Frigate pour une Reolink : go2rtc ouvre une seule connexion vers la caméra (flux principal et flux léger), le flux léger sert à détecter le mouvement, le principal est enregistré sur mouvement pendant 3 jours. La vue direct propose les deux flux, le léger en premier : c’est lui que House Sync met dans l’iframe de la WebApp. Pas de MQTT, authentification activée. Le mot de passe de la caméra vient d’une variable d’environnement. Les clés exactes dépendent de la version de Frigate.',
  'sync/Dockerfile': 'Image de House Sync : Node 24, utilisateur non root. Node 24 lance directement les fichiers TypeScript, sans étape de compilation.',
  'sync/package.json': 'Réduit au minimum : le projet n’a aucune dépendance, il utilise seulement ce que Node fournit (dont SQLite).',
  'sync/src/index.ts': 'Le seul programme qui écrit dans events.db. Il se connecte à Frigate avec le compte viewer (POST /api/login, cookie frigate_token, reconnexion si la session expire), puis toutes les 15 secondes : lit la liste des caméras et écrit pour chacune l’adresse de sa dernière image et celle de la page du direct ; lit les événements terminés qui ont un clip, copie chaque clip sur le disque backup (clips/caméra/id.mp4) et enregistre l’événement. Il relit une heure en arrière à chaque tour, car un événement long peut finir après des plus récents ; les identifiants déjà connus sont ignorés. Il sert aussi sa propre page (port 8081, HTTPS avec le certificat de la maison) derrière la même clé que l’API : un formulaire, un cookie de session en mémoire, puis la base et le disque backup rendus par page.ts. Ainsi l’API n’expose jamais la base brute.',
  'sync/src/page.ts': 'La page de House Sync, rendue en HTML côté serveur, aux couleurs de la maison : le formulaire de la clé, les totaux (poids des vidéos copiées, taille de la base), puis chaque table de la base (colonnes du schéma, 100 lignes au plus, horodatages en clair, étiquettes en pastille, adresses en lien) et les fichiers du disque backup (taille, date). Chaque clip est un bloc dépliable avec un lecteur vidéo, chargé seulement au clic, servi par House Sync (/files/clips/…). Un seul script : la page se recharge toutes les 15 secondes, sauf quand un clip est ouvert.',
  '.dockerignore': 'Ce que Docker ne copie pas dans les images : les dépendances et la compilation de la WebApp (refaites dans l’image), les données et le .env.',
  'api/Dockerfile': 'Image de House API, en deux étapes : la première compile la WebApp (npm ci puis vite build), la seconde ne garde que l’API et le dossier web compilé, que l’API sert. Le contexte de build est le dossier phase0 pour voir les deux.',
  'certs/Dockerfile': 'Image minuscule (Alpine + openssl) du conteneur éphémère des certificats : il lance make-certs.sh puis s’arrête. Frigate et l’API attendent qu’il ait fini.',
  'certs/make-certs.sh': 'Crée une fois la CA de la maison (rootCA.pem, à installer sur chaque appareil ; sa clé reste sur le PC), puis un certificat du PC signé par elle, avec les adresses de CERT_HOSTS (Chrome exige cette liste, le SAN). Il est refait si la liste change ou s’il expire dans moins de 30 jours. Le même certificat est copié pour Frigate dans un sous-dossier monté seul chez lui, sans la clé de la CA. HTTPS est obligatoire : le cookie de Frigate est SameSite=Lax, le navigateur ne l’envoie à l’iframe du direct et à l’image que si la WebApp est sur le même site que Frigate, donc même scheme et même hôte.',
  'api/package.json': 'Réduit au minimum, sans dépendance : l’API n’utilise que le serveur HTTP de Node.',
  'api/src/index.ts': 'Lecture seule : l’API ouvre events.db en lecture et ne parle jamais à Frigate. Chaque service exige la clé secrète dans l’en-tête X-House-Key, comparée en temps constant : auth la vérifie, direct et image renvoient les adresses de chaque caméra, events renvoie le dernier événement par caméra (?last=1) ou les 200 derniers, clips/id envoie le fichier du disque backup (sans jamais en sortir). Elle sert aussi les fichiers de la WebApp, en HTTPS quand le certificat existe (sinon en HTTP, pour le développement). Sans clé d’au moins 8 caractères, elle refuse de démarrer. Plus tard : poe, avec une clé distincte.',
  'web/index.html': 'La page de la WebApp : une div racine et le script de démarrage. Tout le reste est en React.',
  'web/package.json': 'La WebApp est un projet Vite + React + TypeScript à part, avec les mêmes versions et les mêmes scripts que le site (dev, build, typecheck, lint).',
  'web/vite.config.ts': 'Vite avec React et Tailwind, l’alias @ vers src, et en développement un relais des services de l’API (auth, direct, image, events, clips, welcome) vers House API en HTTPS, certificat de la maison accepté.',
  'web/tsconfig.json': 'TypeScript strict, le même réglage que le site : variables et paramètres inutilisés interdits, alias @/*.',
  'web/eslint.config.ts': 'ESLint, le même réglage que le site : règles TypeScript recommandées, règles des hooks React, dossier dist ignoré.',
  'web/src/main.tsx': 'Le point d’entrée : monte App dans la div racine, en mode strict.',
  'web/src/index.css': 'Tailwind et les couleurs de la WebApp, claires ou sombres selon le système, avec les mêmes jetons que le site (bg, card, fg, muted, line, accent, danger).',
  'web/src/types.ts': 'Les types partagés : ce que renvoient les services de l’API (caméras, événements), les identifiants des onglets et une caméra telle que la page la voit.',
  'web/src/lib/api.ts': 'Le client de House API : chaque appel porte la clé dans l’en-tête X-House-Key, une réponse 401 devient l’erreur « clé refusée ». La clé est lue et gardée dans l’onglet (sessionStorage), jamais dans le code. callService appelle n’importe quel service pour l’explorateur.',
  'web/src/lib/format.ts': 'Mise en forme : les horodatages de Frigate en dates lisibles, la durée et le libellé d’un événement, l’origine d’une adresse (pour Frigate).',
  'web/src/lib/useHouse.ts': 'Le hook d’état de la WebApp : la clé et son statut (verrouillé, vérification, prêt), les caméras (direct et image fusionnés) et les événements, rafraîchis toutes les 10 secondes. Une clé refusée est oubliée.',
  'web/src/components/App/App.tsx': 'Le conteneur de la page : prend l’état du hook useHouse, garde l’onglet courant et passe tout à l’UI.',
  'web/src/components/App/UI.tsx': 'Le rendu de la page : l’en-tête (titre, message, bouton Oublier la clé), le formulaire de la clé tant qu’on n’est pas connecté, puis les onglets et leur contenu : une carte par caméra, l’explorateur de l’API ou Frigate.',
  'web/src/components/KeyForm/KeyForm.tsx': 'Saisie de la clé : le champ est vidé dès l’envoi, la clé ne reste pas dans le formulaire.',
  'web/src/components/Tabs/Tabs.tsx': 'Les onglets de la page (Caméras, API, Frigate) : une barre de boutons avec les rôles tablist et tab.',
  'web/src/components/CameraCard/CameraCard.tsx': 'Une caméra : son nom, sa dernière image rechargée toutes les 10 secondes directement depuis Frigate (paramètre anti-cache), le dernier événement et la frise (Timeline) de ses événements.',
  'web/src/components/Timeline/Timeline.tsx': 'La frise des événements d’une caméra : une fenêtre de temps (1 h, 6 h, 24 h, 7 jours) avec ses graduations, un bloc par événement placé et dimensionné dans le temps (largeur minimale pour rester cliquable), le nombre d’événements plus anciens que la fenêtre. Un clic ouvre le clip sous la frise, un second clic ou Fermer le retire. « Maintenant » avance chaque minute.',
  'web/src/components/Timeline/helpers.ts': 'Les calculs de la frise, sans React : la position d’un instant en % de la fenêtre, les graduations (heures rondes, ou minuits locaux pour 7 jours) et les blocs des événements visibles.',
  'web/src/components/ClipPlayer/ClipPlayer.tsx': 'Le lecteur d’un clip : le fichier est téléchargé via l’API avec la clé (une balise vidéo ne peut pas envoyer d’en-tête), donné au lecteur, et l’adresse locale est libérée au démontage.',
  'web/src/components/ApiExplorer/ApiExplorer.tsx': 'L’explorateur de House API : la liste des services avec leur description, un clic appelle le service avec la clé et affiche le statut HTTP et la réponse en JSON mis en forme.',
  'web/src/components/PageFrame/PageFrame.tsx': 'Une autre page de la maison dans une iframe (Frigate, à son origine) : même site que la WebApp, donc son cookie passe. Un lien l’ouvre aussi dans un onglet.',
  'web/src/components/UI/Button/Button.tsx': 'Le bouton de base de la WebApp, avec trois apparences (défaut, actif, danger), le même que celui du site.',
}

/** Explication par rôle de fichier, pour les fichiers de composant qui suivent la convention (un dossier par composant). */
export const ROLE_EXPLANATIONS: Record<string, string> = {
  'UI.tsx': 'Le rendu pur du composant : ni état métier ni calcul, tout lui arrive par props.',
  'types.ts': 'Les types du composant : ses props, celles de son UI et ses structures internes.',
  'constants.ts': 'Les valeurs fixes du composant : textes, réglages et classes Tailwind (une classe par propriété).',
  'helpers.ts': 'Les fonctions pures du composant : calculs et mises en forme, sans React.',
  'index.ts': 'Le point d’entrée du dossier : l’export par défaut du composant et ses types.',
}

const QUOTED = /'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"/
const HASH_COMMENT = /#[^\n]*/

/** Règles par langage, dans l'ordre de priorité. Pas de groupe capturant : le tout est combiné en une seule expression. */
export const RULES: Record<Language, Rule[]> = {
  ts: [
    ['comment', /\/\/[^\n]*|\/\*[\s\S]*?\*\//],
    ['string', /'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/],
    ['keyword', /\b(?:import|from|export|const|let|var|function|return|if|else|await|async|new|try|catch|type|interface|as|of|in|for|while|throw|default|void|null|undefined|true|false)\b/],
    ['number', /\b\d+(?:\.\d+)?\b/],
  ],
  yaml: [
    ['comment', HASH_COMMENT],
    ['string', QUOTED],
    ['variable', /\$\{[^}\n]*\}|\{FRIGATE_[A-Z_]+\}/],
    ['key', /[A-Za-z_][\w.-]*(?=[ \t]*:(?:[ \t]|$))/],
    ['keyword', /\b(?:true|false|null)\b/],
    ['number', /\b\d+\b/],
  ],
  json: [
    ['key', /"(?:\\.|[^"\\\n])*"(?=\s*:)/],
    ['string', QUOTED],
    ['keyword', /\b(?:true|false|null)\b/],
    ['number', /-?\b\d+(?:\.\d+)?\b/],
  ],
  html: [
    ['comment', /<!--[\s\S]*?-->/],
    ['keyword', /<!doctype[^>]*>/i],
    ['tag', /<\/?[A-Za-z][\w-]*|\/?>/],
    ['string', QUOTED],
    ['attr', /[\w-]+(?==)/],
  ],
  css: [
    ['comment', /\/\*[\s\S]*?\*\//],
    ['string', QUOTED],
    ['key', /[\w-]+(?=\s*:)/],
    ['tag', /[.#]?[A-Za-z][\w-]*(?=[^{;]*\{)/],
    ['number', /-?\b\d+(?:\.\d+)?(?:px|%|ms|s|fr)?\b/],
  ],
  md: [
    ['comment', /^```.*/],
    ['keyword', /^#{1,6}[ \t].*/],
    ['string', /`[^`\n]*`/],
  ],
  dockerfile: [
    ['comment', HASH_COMMENT],
    ['string', QUOTED],
    ['keyword', /^(?:FROM|WORKDIR|COPY|USER|EXPOSE|CMD|RUN|ENV|ARG|ENTRYPOINT)\b/],
  ],
  env: [
    ['comment', HASH_COMMENT],
    ['key', /[A-Z][A-Z0-9_]*(?==)/],
  ],
  sh: [
    ['comment', HASH_COMMENT],
    ['string', QUOTED],
    ['variable', /\$\{?[A-Za-z_][A-Za-z0-9_]*\}?/],
    ['keyword', /\b(?:if|then|else|fi|exec|set|mkdir|openssl|echo)\b/],
  ],
  plain: [],
}

/** Une seule classe de couleur par nature de morceau (les couleurs du thème, claires et sombres). */
export const TOKEN_CLASS: Record<TokenKind, string> = {
  plain: '',
  comment: 'text-muted italic',
  string: 'text-pi',
  keyword: 'text-switch',
  number: 'text-backup',
  key: 'text-camera',
  variable: 'text-backup',
  tag: 'text-camera',
  attr: 'text-backup',
}

export const EMPTY_TEXT = 'Aucun fichier trouvé dans code/phase0.'

export const LAYOUT_CLASS = 'grid gap-3 md:grid-cols-[15rem_minmax(0,1fr)]'
export const TREE_CLASS = 'rounded-xl border border-line bg-bg p-2 text-[0.85rem]'
export const FOLDER_CLASS = 'block px-2 py-1 font-semibold text-fg'
export const FILE_ACTIVE_CLASS = 'block w-full cursor-pointer rounded-lg border border-line bg-card px-2 py-1 text-left font-semibold text-fg'
export const FILE_IDLE_CLASS =
  'block w-full cursor-pointer rounded-lg border border-transparent px-2 py-1 text-left text-muted hover:bg-card hover:text-fg'
export const PATH_CLASS = 'm-0 font-mono text-[0.8rem] text-muted'
export const EXPLANATION_CLASS = 'my-2 text-[0.9rem] text-fg'
export const CODE_BLOCK_CLASS = 'm-0 max-h-[30rem] overflow-auto rounded-xl border border-line bg-bg p-3 text-[0.78rem] leading-relaxed'

/** Indentation par niveau (classes écrites en entier pour que Tailwind les trouve). */
export const DEPTH_CLASS = ['pl-0', 'pl-3', 'pl-6', 'pl-9', 'pl-12', 'pl-15']
