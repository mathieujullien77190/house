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
    '!/code/phase0/**/node_modules/**',
    '!/code/phase0/**/dist/**',
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
  'CLAUDE.md',
  'docker-compose.yml',
  '.env.example',
  '.dockerignore',
  'certs',
  'frigate',
  'sync',
  'api',
  'web',
  'Dockerfile',
  'index.html',
  'package.json',
  'vite.config.ts',
  'tsconfig.json',
  'eslint.config.ts',
  'src',
  'index.ts',
  'main.tsx',
  'config.ts',
  'app.ts',
  'index.css',
  'types.ts',
  'db',
  'middleware',
  'routes',
  'repositories',
  'services',
  'lib',
  'components',
  'App',
  'constants.ts',
  'helpers.ts',
  'UI.tsx',
]

export const EXPLANATIONS: Record<string, string> = {
  'README.md': 'Point d’entrée du dossier : le plan des fichiers, comment démarrer la pile (comptes Frigate, clé de l’API, CA de la maison), la WebApp React et ce qu’il faut savoir (ports publiés, où sont les données, HTTPS et même hôte que Frigate).',
  'docker-compose.yml': 'Décrit les trois conteneurs et comment ils se parlent. Frigate et House Sync partagent un réseau, l’API est sur un autre. Seuls les ports 8971 (Frigate, avec connexion) et 8080 (API) sont publiés ; le port 5000 de Frigate reste interne. Le dossier data/backup est écrit par House Sync et monté en lecture seule dans l’API. House Sync reçoit l’adresse publique de Frigate, l’API reçoit la clé secrète. Le conteneur certs tourne d’abord et s’arrête ; Frigate et l’API lisent le certificat qu’il a créé, Frigate dans un sous-dossier sans la clé de la CA.',
  '.env.example': 'Modèle des secrets : mot de passe de la Reolink, compte viewer de House Sync, adresse de Frigate vue du navigateur, clé secrète de l’API et hôtes du certificat. On le copie en .env, qui n’est jamais commité.',
  'frigate/config/config.yml': 'Configuration de Frigate pour une Reolink : go2rtc ouvre une seule connexion vers la caméra (flux principal et flux léger), le flux léger sert à détecter le mouvement, le principal est enregistré sur mouvement et gardé 6 heures seulement (0,25 jour, pour les segments comme pour les clips d’événements) : House Sync copie les clips et garde une image par minute, Frigate n’a besoin que d’une marge au cas où House Sync serait arrêté un moment. La vue direct propose les deux flux, le léger en premier : c’est lui que House Sync met dans l’iframe de la WebApp. Pas de MQTT, authentification activée. Le mot de passe de la caméra vient d’une variable d’environnement. Les clés exactes dépendent de la version de Frigate.',
  'sync/Dockerfile': 'Image de House Sync, en deux étapes : la première compile sa page React (dossier web), la seconde ne garde que le script (Node 24 lance directement le TypeScript) et le dossier web compilé, qu’il sert lui-même sur le port 8081.',
  'sync/package.json': 'Réduit au minimum : House Sync n’a aucune dépendance, il utilise seulement ce que Node fournit (dont SQLite).',
  'sync/src/data.ts': 'Ce que la page de House Sync lit, sans HTTP : le résumé des tables (colonnes, nombre de lignes), une page d’une table (ordre naturel : les plus récents d’abord), les fichiers du disque backup et la pagination bornée (100 lignes au plus).',
  'sync/src/index.ts': 'Le seul programme qui écrit dans events.db. Il se connecte à Frigate avec le compte viewer (POST /api/login, cookie frigate_token, reconnexion si la session expire), puis toutes les 5 secondes : lit la liste des caméras et écrit pour chacune l’adresse de sa dernière image et celle de la page du direct ; lit les événements terminés qui ont un clip, copie chaque clip sur le disque backup (clips/caméra/id.mp4) et enregistre l’événement. Il relit une heure en arrière à chaque tour, car un événement long peut finir après des plus récents, et page les réponses de Frigate (50 par page) pour ne rien sauter après une coupure ; les identifiants déjà connus sont ignorés. Un clip pas encore prêt au moment de la copie laisse la ligne sans clip, et House Sync retente à chaque tour tant que Frigate garde ses enregistrements (6 h). Comme Frigate n’enregistre que sur mouvement, il garde aussi une image par caméra et par minute (dernière image de Frigate, 720 px de haut, table snapshots, dossier snapshots/) pendant 7 jours, puis fait le ménage. Il sert aussi sa propre page (port 8081, HTTPS avec le certificat de la maison) : les fichiers React compilés (dossier web) sont publics, les services JSON (/api/overview, /api/table, /api/clips) et les fichiers du disque backup (/files/…) sont derrière une session ouverte avec la même clé que l’API (POST /login, cookie en mémoire). Ainsi l’API n’expose jamais la base brute.',
  'sync/web/package.json': 'La page de House Sync est un projet Vite + React + TypeScript à part, comme la WebApp, avec les mêmes versions et les mêmes scripts.',
  'sync/web/vite.config.ts': 'Vite avec React et Tailwind, l’alias @ vers src, et en développement un relais de /api, /login, /logout et /files vers House Sync ; le serveur de développement passe en HTTPS avec le certificat de la maison, sinon le cookie de session (Secure) ne serait pas gardé.',
  'sync/web/tsconfig.json': 'TypeScript strict, le même réglage que le site.',
  'sync/web/eslint.config.ts': 'ESLint, le même réglage que le site.',
  'sync/web/index.html': 'La page : une div racine et le script de démarrage.',
  'sync/web/src/main.tsx': 'Le point d’entrée : monte App dans la div racine, en mode strict.',
  'sync/web/src/index.css': 'Tailwind et les couleurs de la maison (plus un vert et un orange pour les pastilles et les noms de tables).',
  'sync/web/src/types.ts': 'Les types des services de House Sync : la vue d’ensemble (base, tables, disque backup), une page paginée, une ligne, un fichier, un média à montrer.',
  'sync/web/src/lib/api.ts': 'Le client des services de House Sync : la session est un cookie posé par /login et envoyé tout seul ; une réponse 401 devient « connexion requise ». fileUrl donne l’adresse d’un fichier du disque backup.',
  'sync/web/src/lib/format.ts': 'Mise en forme : tailles en o/Ko/Mo/Go, dates lisibles depuis des millisecondes ou des secondes Frigate.',
  'sync/web/src/components/App/App.tsx': 'Le conteneur de la page : la session (vérifiée au démarrage avec le cookie), la vue d’ensemble rechargée toutes les 15 s sauf média ouvert, le média du panneau, et un compteur qui fait recharger leur page aux tableaux.',
  'sync/web/src/components/App/UI.tsx': 'Le rendu de la page : l’en-tête (heure de mise à jour, Rafraîchir, Quitter), le formulaire de la clé, les totaux, le panneau média, puis les tables de la base et les clips.',
  'sync/web/src/components/KeyForm/KeyForm.tsx': 'Saisie de la clé : le champ est vidé dès l’envoi.',
  'sync/web/src/components/Pager/Pager.tsx': 'La pagination d’un tableau : « 1 à 20 sur 143 » et deux boutons.',
  'sync/web/src/components/DataTable/UI.tsx': 'Un tableau paginé, rendu pur : titre, description, détail, colonnes, cellules déjà rendues, et le Pager. Le même pour les tables de la base et les clips.',
  'sync/web/src/components/TableSection/TableSection.tsx': 'Une table de la base, paginée (20 lignes) : charge sa page et la recharge quand la page de House Sync se rafraîchit. Sa description est dans constants.ts.',
  'sync/web/src/components/TableSection/UI.tsx': 'Le rendu d’une cellule : un chemin de clip ou d’image devient un bouton « voir » (vers le panneau), une adresse un lien, un horodatage Frigate une date, une étiquette une pastille.',
  'sync/web/src/components/ClipsSection/ClipsSection.tsx': 'Les clips du disque backup, paginés (20 fichiers), avec taille, date et un bouton « voir ».',
  'sync/web/src/components/MediaPanel/MediaPanel.tsx': 'Le clip ou l’image qu’on regarde, dans un panneau collant au-dessus des tableaux : la vidéo démarre à l’ouverture, Fermer retire le panneau (donc arrête la lecture) sans toucher à la taille des tableaux.',
  'sync/web/src/components/Totals/UI.tsx': 'Les trois chiffres en tête de page : le poids des vidéos, des images par minute et de la base ; buildTotals (helpers.ts) les calcule depuis la vue d’ensemble.',
  'sync/web/src/components/UI/Button/Button.tsx': 'Le bouton de base, le même que celui du site et de la WebApp.',
  '.dockerignore': 'Ce que Docker ne copie pas dans les images : les dépendances et les compilations (WebApp, page de House Sync, API), refaites dans les images, les données et le .env.',
  'api/Dockerfile': 'Image de House API, en deux étapes : la première compile la WebApp (npm ci puis vite build), la seconde installe les dépendances de l’API (Express, sans celles de développement) et garde le dossier web compilé, que l’API sert. Le contexte de build est le dossier phase0 pour voir les deux.',
  'certs/Dockerfile': 'Image minuscule (Alpine + openssl) du conteneur éphémère des certificats : il lance make-certs.sh puis s’arrête. Frigate et l’API attendent qu’il ait fini.',
  'certs/make-certs.sh': 'Crée une fois la CA de la maison (rootCA.pem, à installer sur chaque appareil ; sa clé reste sur le PC), puis un certificat du PC signé par elle, avec les adresses de CERT_HOSTS (Chrome exige cette liste, le SAN). Il est refait si la liste change ou s’il expire dans moins de 30 jours. Le même certificat est copié pour Frigate dans un sous-dossier monté seul chez lui, sans la clé de la CA. HTTPS est obligatoire : le cookie de Frigate est SameSite=Lax, le navigateur ne l’envoie à l’iframe du direct et à l’image que si la WebApp est sur le même site que Frigate, donc même scheme et même hôte.',
  'api/package.json': 'L’API tourne sur Express 5 ; les types et TypeScript ne servent qu’à la vérification (npm run typecheck), Node 24 exécute le TypeScript tel quel.',
  'api/tsconfig.json': 'TypeScript strict pour Node (module nodenext, imports avec extension .ts, syntaxe effaçable seulement) : la vérification sans compilation.',
  'api/src/index.ts': 'Le démarrage : lit la configuration, construit l’application Express et l’écoute en HTTPS avec le certificat de la maison (ou en HTTP sans). Le cookie de Frigate (SameSite=Lax) n’atteint la WebApp que sur le même scheme et le même hôte que Frigate.',
  'api/src/config.ts': 'La configuration, lue une fois dans l’environnement et validée : port, dossier de la WebApp, disque backup, clé (8 caractères au moins, sinon l’API ne démarre pas), certificat.',
  'api/src/app.ts': 'L’application Express : ouvre la base en lecture seule, assemble dépôts, services et routes, sert la WebApp compilée en statique, répond 404 et aux erreurs en JSON.',
  'api/src/types.ts': 'Les lignes de la base (événement, caméra) et la forme d’un événement renvoyé (le chemin du clip devient un service).',
  'api/src/db/database.ts': 'La base de House Sync, ouverte en lecture seule au premier besoin (elle n’existe qu’après son premier tour) ; deux fonctions, all et get, et l’erreur DatabaseNotReady.',
  'api/src/repositories/camerasRepository.ts': 'Les requêtes SQL des caméras : adresses du direct et de la dernière image.',
  'api/src/repositories/eventsRepository.ts': 'Les requêtes SQL des événements : les derniers, le dernier par caméra, le chemin d’un clip.',
  'api/src/repositories/snapshotsRepository.ts': 'Les requêtes SQL des images par minute : les instants couverts, l’image la plus proche d’un instant.',
  'api/src/services/camerasService.ts': 'Le service des caméras : ce que la WebApp affiche (le direct et l’image viennent de Frigate, pas de l’API).',
  'api/src/services/eventsService.ts': 'Le service des événements : les lignes deviennent des réponses (clip → /clips/id), 200 au plus ou le dernier par caméra.',
  'api/src/services/snapshotsService.ts': 'Le service des images par minute : les instants couverts (20 000 au plus) et l’image à deux minutes près d’un instant.',
  'api/src/lib/backupFiles.ts': 'L’envoi d’un fichier du disque backup par son chemin relatif, jamais hors du disque, avec la reprise partielle (Range) que la vidéo utilise pour se déplacer.',
  'api/src/middleware/requireKey.ts': 'Le middleware de la clé : l’en-tête X-House-Key comparé en temps constant, sinon 401.',
  'api/src/middleware/errorHandler.ts': 'Les erreurs en JSON : 404 pour l’inconnu, 503 tant que la base n’existe pas, 500 sans détail pour le reste.',
  'api/src/routes/index.ts': 'Toutes les routes : welcome sans clé ; auth, direct, image, events, clips, snapshots et snapshot derrière requireKey (liste SECURED_PATHS) ; les fichiers de la WebApp restent publics.',
  'api/src/routes/welcome.ts': 'GET /welcome : l’API est là.',
  'api/src/routes/auth.ts': 'GET /auth : la clé est bonne (le middleware l’a vérifiée).',
  'api/src/routes/cameras.ts': 'GET /direct et GET /image : les adresses de chaque caméra chez Frigate.',
  'api/src/routes/events.ts': 'GET /events (?last=1 pour le dernier par caméra) et GET /clips/:id (la vidéo d’un événement, identifiant validé).',
  'api/src/routes/snapshots.ts': 'GET /snapshots (camera, from, to) et GET /snapshot (camera, at), paramètres validés, 400 sinon.',
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
  'web/src/lib/useHouse.ts': 'Le hook d’état de la WebApp : la clé et son statut (verrouillé, vérification, prêt), les caméras (direct et image fusionnés) et les événements, rafraîchis chaque seconde. Une clé refusée est oubliée.',
  'web/src/components/App/App.tsx': 'Le conteneur de la page : prend l’état du hook useHouse, garde l’onglet courant et passe tout à l’UI.',
  'web/src/components/App/UI.tsx': 'Le rendu de la page : l’en-tête (titre, message, bouton Oublier la clé), le formulaire de la clé tant qu’on n’est pas connecté, puis les onglets et leur contenu : une carte par caméra, l’explorateur de l’API ou Frigate.',
  'web/src/components/KeyForm/KeyForm.tsx': 'Saisie de la clé : le champ est vidé dès l’envoi, la clé ne reste pas dans le formulaire.',
  'web/src/components/Tabs/Tabs.tsx': 'Les onglets de la page (Caméras, API, Frigate) : une barre de boutons avec les rôles tablist et tab.',
  'web/src/components/CameraCard/CameraCard.tsx': 'Une caméra : en haut sa dernière image, rechargée chaque seconde directement depuis Frigate (paramètre anti-cache), remplacée par l’image gardée par House Sync à l’instant choisi sur la frise ou par le clip de l’événement choisi (« Maintenant » sur la frise ramène à la dernière image) ; puis le dernier événement et la frise (Timeline).',
  'web/src/components/Timeline/Timeline.tsx': 'La frise des événements d’une caméra : une fenêtre de temps (10 min, 1 h, 6 h, 24 h, 7 jours) qu’on fait glisser au pointeur ou avec ◀ ▶, « Maintenant » pour revenir au direct (le bord droit suit alors l’heure). Un bloc par événement (clic : son clip remplace l’image en haut de la carte et démarre à l’instant cliqué dans le bloc, le curseur s’y place puis suit la lecture), une bande bleue là où House Sync a des images, et un simple clic sur l’axe pose le curseur rouge ailleurs : la carte montre alors l’image gardée à cet instant et l’événement se ferme. « Maintenant » ferme tout. La couverture est rechargée à chaque déplacement, pas pendant le glisser.',
  'web/src/components/Timeline/helpers.ts': 'Les calculs de la frise, sans React : la position d’un instant en % de la fenêtre et l’inverse, les graduations (heures rondes locales, ou minuits pour 7 jours), les blocs des événements visibles (avec le rapport entre largeur dessinée et durée réelle, pour qu’un clic dans un bloc élargi tombe juste), les plages de couverture (images à moins de 150 s l’une de l’autre) et le libellé de la fenêtre.',
  'web/src/components/SnapshotImage/SnapshotImage.tsx': 'L’image gardée par House Sync la plus proche d’un instant (service snapshot, à deux minutes près), téléchargée via l’API avec la clé puis donnée au navigateur ; un message si aucune image n’existe à cet instant.',
  'web/src/components/ClipPlayer/ClipPlayer.tsx': 'Le lecteur d’un clip : le fichier est téléchargé via l’API avec la clé (une balise vidéo ne peut pas envoyer d’en-tête), donné au lecteur, et l’adresse locale est libérée au démontage. Il démarre à la position demandée (l’instant cliqué dans le bloc de la frise), remonte la durée réelle de la vidéo (pour savoir de combien le clip commence avant l’événement) et sa position de lecture (timeupdate), pour que le curseur de la frise suive la vidéo.',
  'web/src/components/ApiExplorer/ApiExplorer.tsx': 'L’explorateur de House API : la liste des services avec leur description, un clic appelle le service avec la clé et affiche le statut HTTP et la réponse en JSON mis en forme.',
  'web/src/components/PageFrame/PageFrame.tsx': 'Une autre page de la maison dans une iframe (Frigate, à son origine) : même site que la WebApp, donc son cookie passe. Un lien l’ouvre aussi dans un onglet.',
  'web/src/components/UI/Button/Button.tsx': 'Le bouton de base de la WebApp, avec trois apparences (défaut, actif, danger), le même que celui du site.',
}

/** Explication par rôle de fichier, pour les fichiers de composant qui suivent la convention (un dossier par composant). */
export const ROLE_EXPLANATIONS: Record<string, string> = {
  'CLAUDE.md': 'Les consignes de ce dossier pour Claude Code : ce qu’il contient, ses règles et ses commandes. Le fichier racine du dépôt renvoie à ceux-ci.',
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
