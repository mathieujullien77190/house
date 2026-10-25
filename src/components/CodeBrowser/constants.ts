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
    '!/code/phase0/ui/storybook-static/**',
    '!/code/phase0/**/package-lock.json',
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
  'go2rtc',
  'motion',
  'sync',
  'api',
  'ui',
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
  'README.md': 'Point d’entrée du dossier : le plan des fichiers, comment démarrer la pile (mot de passe de la caméra, clé de l’API, CA de la maison), la WebApp React, l’enregistreur et ce qu’il faut savoir (ports publiés, où sont les données, HTTPS).',
  'docker-compose.yml': 'Décrit les conteneurs et comment ils se parlent : go2rtc, l’enregistreur motion et House Sync partagent un réseau, l’API est sur un autre et rejoint le premier pour relayer le direct. Seuls les ports 8080 (API et WebApp) et 8081 (page de House Sync) sont publiés ; go2rtc et l’API de l’enregistreur restent internes. Le dossier data/backup est écrit par House Sync et monté en lecture seule dans l’API ; data/recordings et data/clips sont ceux de l’enregistreur. Le conteneur certs tourne d’abord et s’arrête ; House Sync et l’API lisent le certificat qu’il a créé.',
  '.env.example': 'Modèle des secrets : mot de passe de la Reolink (lu par go2rtc), clé secrète de l’API et hôtes du certificat. On le copie en .env, qui n’est jamais commité.',
  'sync/Dockerfile': 'Image de House Sync, en deux étapes : la première compile sa page React (dossier web), la seconde ne garde que le script (Node 24 lance directement le TypeScript) et le dossier web compilé, qu’il sert lui-même sur le port 8081.',
  'sync/package.json': 'Réduit au minimum : House Sync n’a aucune dépendance, il utilise seulement ce que Node fournit (dont SQLite).',
  'sync/src/data.ts': 'Ce que la page de House Sync lit, sans HTTP : le résumé des tables (colonnes, nombre de lignes), une page d’une table (ordre naturel : les plus récents d’abord), les fichiers du disque backup et la pagination bornée (100 lignes au plus).',
  'sync/src/index.ts': 'Le seul programme qui écrit dans events.db. Toutes les 5 secondes, il interroge l’enregistreur (motion, réseau Docker, sans mot de passe) : lit la liste des caméras et écrit pour chacune l’adresse de sa dernière image et celle de la page du direct ; lit les événements terminés qui ont un clip, copie chaque clip sur le disque backup (clips/caméra/id.mp4) et enregistre l’événement. Il relit une heure en arrière à chaque tour, car un événement long peut finir après des plus récents, et page les réponses de l’enregistreur (50 par page) pour ne rien sauter après une coupure ; les identifiants déjà connus sont ignorés. Un clip n’est copié que 20 secondes après la fin de l’événement (l’enregistreur fabrique le clip après la fin du mouvement : plus tôt, il manquerait ou serait tronqué) ; d’ici là ou s’il n’est pas prêt, la ligne reste sans clip et House Sync retente à chaque tour tant que l’enregistreur garde ses segments (6 h). Les événements en cours (un mouvement encore en train) sont insérés tout de suite sans fin ni clip, pour que la frise les montre ; la même ligne reçoit sa fin et son clip quand l’enregistreur les donne terminés, ou disparaît s’il ne la connaît plus. Comme l’enregistreur ne garde les clips que sur mouvement, il garde aussi une image par caméra et par minute (dernière image de l’enregistreur, 720 px de haut, table snapshots, dossier snapshots/) pendant 7 jours, puis fait le ménage. Il sert aussi sa propre page (port 8081, HTTPS avec le certificat de la maison) : les fichiers React compilés (dossier web) sont publics, les services JSON (/api/overview, /api/table, /api/clips) et les fichiers du disque backup (/files/…) sont derrière une session ouverte avec la même clé que l’API (POST /login, cookie en mémoire). Ainsi l’API n’expose jamais la base brute.',
  'sync/web/package.json': 'La page de House Sync est un projet Vite + React + TypeScript à part, comme la WebApp, avec les mêmes versions et les mêmes scripts.',
  'sync/web/vite.config.ts': 'Vite avec React et Tailwind, l’alias @ vers src, et en développement un relais de /api, /login, /logout et /files vers House Sync ; le serveur de développement passe en HTTPS avec le certificat de la maison, sinon le cookie de session (Secure) ne serait pas gardé.',
  'sync/web/tsconfig.json': 'TypeScript strict, le même réglage que le site.',
  'sync/web/eslint.config.ts': 'ESLint, le même réglage que le site.',
  'sync/web/index.html': 'La page : une div racine et le script de démarrage.',
  'sync/web/src/main.tsx': 'Le point d’entrée : monte App dans la div racine, en mode strict.',
  'sync/web/src/index.css': 'Tailwind et les couleurs de la maison (plus un vert et un orange pour les pastilles et les noms de tables).',
  'sync/web/src/types.ts': 'Les types des services de House Sync : la vue d’ensemble (base, tables, disque backup), une page paginée, une ligne, un fichier, un média à montrer.',
  'sync/web/src/lib/api.ts': 'Le client des services de House Sync : la session est un cookie posé par /login et envoyé tout seul ; une réponse 401 devient « connexion requise ». fileUrl donne l’adresse d’un fichier du disque backup.',
  'sync/web/src/lib/format.ts': 'Mise en forme : tailles en o/Ko/Mo/Go, dates lisibles depuis des millisecondes ou des secondes.',
  'sync/web/src/lib/totals.ts': 'Les trois chiffres en tête de page (vidéos, images par minute, base), calculés depuis la vue d’ensemble pour le composant Totals de @house/ui.',
  'sync/web/src/components/App/App.tsx': 'Le conteneur de la page : la session (vérifiée au démarrage avec le cookie), l’onglet courant (Base ou Disque), la vue d’ensemble rechargée toutes les 15 s sauf média ouvert, le média du panneau, et un compteur qui fait recharger leur page aux tableaux.',
  'sync/web/src/components/App/UI.tsx': 'Le rendu de la page avec les composants de @house/ui : Page et PageHeader (heure de mise à jour, Rafraîchir, Quitter), le formulaire de la clé, les onglets Base et Disque, les totaux, le panneau média, puis les tables de la base ou les clips.',
  'sync/web/src/components/KeyForm/KeyForm.tsx': 'Saisie de la clé : le champ est vidé dès l’envoi. Le formulaire est celui de @house/ui.',
  'sync/web/src/components/TableSection/TableSection.tsx': 'Une table de la base, paginée (20 lignes) dans le DataTable de @house/ui, repliée par défaut sauf events (OPEN_BY_DEFAULT) : elle ne charge sa page qu’une fois dépliée, et la recharge quand la page de House Sync se rafraîchit. Sa description est dans constants.ts.',
  'sync/web/src/components/TableSection/UI.tsx': 'Le rendu d’une cellule : un chemin de clip ou d’image devient un bouton « voir » (vers le panneau), une adresse un lien, un horodatage une date, une étiquette une pastille.',
  'sync/web/src/components/ClipsSection/ClipsSection.tsx': 'Les clips du disque backup, paginés (20 fichiers) dans le DataTable de @house/ui, avec taille, date et un bouton « voir ».',
  'sync/web/src/components/MediaPanel/MediaPanel.tsx': 'Le conteneur du panneau : l’adresse du fichier (servi par House Sync derrière la session) va au MediaPanel de @house/ui.',
  '.dockerignore': 'Ce que Docker ne copie pas dans les images : les dépendances et les compilations (WebApp, page de House Sync, API), refaites dans les images, les données et le .env.',
  'api/Dockerfile': 'Image de House API, en deux étapes : la première compile la WebApp (npm ci puis vite build), la seconde installe les dépendances de l’API (Express, sans celles de développement) et garde le dossier web compilé, que l’API sert. Le contexte de build est le dossier phase0 pour voir les deux.',
  'certs/Dockerfile': 'Image minuscule (Alpine + openssl) du conteneur éphémère des certificats : il lance make-certs.sh puis s’arrête. House Sync et l’API attendent qu’il ait fini.',
  'certs/make-certs.sh': 'Crée une fois la CA de la maison (rootCA.pem, à installer sur chaque appareil ; sa clé reste sur le PC), puis un certificat du PC signé par elle, avec les adresses de CERT_HOSTS (Chrome exige cette liste, le SAN). Il est refait si la liste change ou s’il expire dans moins de 30 jours. HTTPS est obligatoire : le cookie de session de l’API est Secure.',
  'api/package.json': 'L’API tourne sur Express 5 ; les types et TypeScript ne servent qu’à la vérification (npm run typecheck), Node 24 exécute le TypeScript tel quel.',
  'api/tsconfig.json': 'TypeScript strict pour Node (module nodenext, imports avec extension .ts, syntaxe effaçable seulement) : la vérification sans compilation.',
  'api/src/index.ts': 'Le démarrage : lit la configuration, construit l’application Express et l’écoute en HTTPS avec le certificat de la maison (ou en HTTP sans). Il n’y a plus de contrainte d’hôte : le direct passe par l’API, pas par un cookie tiers.',
  'api/src/config.ts': 'La configuration, lue une fois dans l’environnement et validée : port, dossier de la WebApp, disque backup, clé (8 caractères au moins, sinon l’API ne démarre pas), adresse de go2rtc (réseau Docker), certificat.',
  'api/src/middleware/session.ts': 'La session : un cookie (HttpOnly, Secure, SameSite=Lax) posé par /auth, avec un jeton aléatoire gardé en mémoire ; il remplace l’en-tête X-House-Key pour ce qu’une balise img ou video charge, dont le direct. /logout la ferme.',
  'api/src/services/liveService.ts': 'Le direct et l’image à l’instant, relayés depuis go2rtc (réseau Docker) : le nom du flux vient de l’adresse que House Sync a écrite pour la caméra, le flux MJPEG est celui déclaré <flux>_mjpeg dans go2rtc/go2rtc.yaml.',
  'api/src/routes/live.ts': 'GET /stream (le direct MJPEG, multipart/x-mixed-replace) et GET /frame (une image) : la réponse de go2rtc est recopiée telle quelle, et fermer l’onglet coupe la demande vers go2rtc ; 404 pour une caméra inconnue, 502 si go2rtc ne répond pas.',
  'api/src/app.ts': 'L’application Express : ouvre la base en lecture seule, assemble dépôts, services et routes, sert la WebApp compilée en statique, répond 404 et aux erreurs en JSON.',
  'api/src/types.ts': 'Les lignes de la base (événement, caméra) et la forme d’un événement renvoyé (le chemin du clip devient un service).',
  'api/src/db/database.ts': 'La base de House Sync, ouverte en lecture seule au premier besoin (elle n’existe qu’après son premier tour) ; deux fonctions, all et get, et l’erreur DatabaseNotReady.',
  'api/src/repositories/camerasRepository.ts': 'Les requêtes SQL des caméras : adresses du direct et de la dernière image.',
  'api/src/repositories/eventsRepository.ts': 'Les requêtes SQL des événements : les derniers, ceux qui touchent une fenêtre de temps (from, to, caméra), le dernier par caméra, le chemin d’un clip.',
  'api/src/repositories/snapshotsRepository.ts': 'Les requêtes SQL des images par minute : les instants couverts, l’image la plus proche d’un instant.',
  'api/src/lib/switchClient.ts': 'Le client de la page web du switch ES208GP (aucune API officielle sans contrôleur) : il se connecte comme la page (logon.cgi), lit l’état des ports dans poe_port_config.cgi, change le PoE d’un port avec la même requête que le bouton Apply, relit pour vérifier, puis se déconnecte. Une session à la fois, les appels passent à la file. Les commandes viennent du firmware 1.0.1.',
  'api/src/services/poeService.ts': 'Allumer ou éteindre une caméra : retrouve son port sur le switch (SWITCH_PORTS) et y coupe ou rend le PoE ; l’état est gardé 3 secondes en cache car le switch est lent.',
  'api/src/routes/poe.ts': 'GET /poe (l’alimentation de chaque caméra) et POST /poe/<caméra> avec {"on": true|false}. 503 si aucun switch n’est configuré, 400 si le corps est mauvais, 404 pour une caméra inconnue.',
  'web/src/components/PowerButton/PowerButton.tsx': 'Le bouton Allumer / Éteindre la caméra : reçoit l’état de l’alimentation (usePower), allume ou éteint d’un clic et affiche l’état (alimentée avec les watts, démarrage, éteinte). Rien ne s’affiche sans switch configuré.',
  'api/src/services/camerasService.ts': 'Le service des caméras : ce que la WebApp affiche (le direct et l’image viennent de go2rtc, relayé par l’API).',
  'api/src/services/eventsService.ts': 'Le service des événements : les lignes deviennent des réponses (clip → /clips/id) : les 200 derniers, ceux d’une fenêtre de temps (1000 au plus) ou le dernier par caméra.',
  'api/src/services/snapshotsService.ts': 'Le service des images par minute : les instants couverts (20 000 au plus) et l’image à deux minutes près d’un instant.',
  'api/src/lib/backupFiles.ts': 'L’envoi d’un fichier du disque backup par son chemin relatif, jamais hors du disque, avec la reprise partielle (Range) que la vidéo utilise pour se déplacer.',
  'api/src/middleware/requireKey.ts': 'Le middleware de la clé : l’en-tête X-House-Key comparé en temps constant, ou une session ouverte (cookie), sinon 401.',
  'api/src/middleware/errorHandler.ts': 'Les erreurs en JSON : 404 pour l’inconnu, 503 tant que la base n’existe pas, 500 sans détail pour le reste.',
  'api/src/routes/index.ts': 'Toutes les routes : welcome et logout sans clé ; auth, direct, image, events, clips, snapshots, snapshot, stream et frame derrière requireKey (liste SECURED_PATHS) ; les fichiers de la WebApp restent publics.',
  'api/src/routes/welcome.ts': 'GET /welcome : l’API est là.',
  'api/src/routes/auth.ts': 'GET /auth : la clé est bonne (le middleware l’a vérifiée), et une session (cookie) est ouverte pour le direct ; GET /logout la ferme.',
  'api/src/routes/cameras.ts': 'GET /direct et GET /image : les adresses de chaque caméra chez l’enregistreur.',
  'api/src/routes/events.ts': 'GET /events (?last=1 pour le dernier par caméra ; ?camera=&from=&to= en secondes pour une fenêtre de temps, vérifiés : 400 sinon) et GET /clips/:id (la vidéo d’un événement, identifiant validé).',
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
  'web/src/lib/usePower.ts': 'Le hook de l’alimentation d’une caméra : lit GET /poe toutes les 10 secondes (null sans switch configuré) et laisse remplacer l’état dès qu’on allume ou éteint. La carte s’en sert pour montrer une image noire quand la caméra est éteinte, et le bouton pour son état.',
  'web/src/lib/format.ts': 'Mise en forme : les horodatages en dates lisibles, la durée et le libellé d’un événement.',
  'web/src/lib/useHouse.ts': 'Le hook d’état de la WebApp : la clé et son statut (verrouillé, vérification, prêt), les caméras (leurs noms, d’après /direct) et les événements, rafraîchis chaque seconde. Une clé refusée est oubliée ; « Oublier la clé » ferme aussi la session (/logout).',
  'web/src/components/App/App.tsx': 'Le conteneur de la page : prend l’état du hook useHouse, garde l’onglet courant et passe tout à l’UI.',
  'web/src/components/App/UI.tsx': 'Le rendu de la page avec les composants de @house/ui : Page et PageHeader (titre, message, bouton Oublier la clé), le formulaire de la clé tant qu’on n’est pas connecté, puis les onglets et leur contenu : une carte par caméra, ou l’explorateur de l’API (deux onglets).',
  'web/src/components/KeyForm/KeyForm.tsx': 'Saisie de la clé : le champ est vidé dès l’envoi, la clé ne reste pas dans le formulaire. Le formulaire lui-même est celui de @house/ui.',
  'web/src/components/CameraCard/CameraCard.tsx': 'Le conteneur d’une caméra : décide ce qui est montré en haut (le direct (une balise img sur /stream : un flux MJPEG que l’API relaie depuis go2rtc, une seule requête), l’image gardée par House Sync à l’instant choisi sur la frise, ou le clip de l’événement choisi ; pour un événement en cours, le direct avec un mot d’explication), calcule l’avance du clip, et passe le média et la frise à la carte de @house/ui. « Maintenant » sur la frise ramène au direct.',
  'web/src/components/Timeline/Timeline.tsx': 'Le conteneur de la frise (le dessin est celui de @house/ui) : une fenêtre de temps (10 min, 1 h, 6 h, 24 h) qu’on fait glisser au pointeur, « Maintenant » pour revenir au direct (le bord droit suit alors l’heure). Un bloc par événement (clic : son clip remplace l’image en haut de la carte et démarre à l’instant cliqué dans le bloc, le curseur s’y place puis suit la lecture ; un événement en cours est un bloc hachuré rouge qui s’allonge jusqu’au bord droit), une bande bleue là où House Sync a des images, et un simple clic sur l’axe pose le curseur rouge ailleurs : la carte montre alors l’image gardée à cet instant et l’événement se ferme. « Maintenant » ferme tout. La couverture est rechargée à chaque déplacement, pas pendant le glisser.',
  'web/src/components/Timeline/helpers.ts': 'Les calculs de la frise, sans React : la position d’un instant en % de la fenêtre et l’inverse, les graduations (heures rondes locales, ou minuits pour les très grandes fenêtres), les blocs des événements visibles (avec le rapport entre largeur dessinée et durée réelle, pour qu’un clic dans un bloc élargi tombe juste), les plages de couverture (images à moins de 150 s l’une de l’autre) et le libellé de la fenêtre.',
  'web/src/components/SnapshotImage/SnapshotImage.tsx': 'L’image gardée par House Sync la plus proche d’un instant (service snapshot, à deux minutes près), téléchargée via l’API avec la clé puis donnée au navigateur ; un message si aucune image n’existe à cet instant.',
  'web/src/components/ClipPlayer/ClipPlayer.tsx': 'Le conteneur du lecteur : le clip est téléchargé via l’API avec la clé (une balise vidéo ne peut pas envoyer d’en-tête), donné au lecteur de @house/ui, et l’adresse locale est libérée au démontage. Position de départ, durée et avancée passent entre la carte et le lecteur.',
  'web/src/components/ApiExplorer/ApiExplorer.tsx': 'Le conteneur de l’explorateur de House API : la liste des services (constants.ts), un clic appelle le service avec la clé et donne le statut HTTP et la réponse mise en forme au composant de @house/ui.',
  'motion/package.json': 'L’enregistreur : aucune dépendance (Node 24 lance le TypeScript, ffmpeg fait le travail vidéo), un script pour les tests et un pour la vérification des types.',
  'motion/Dockerfile': 'Node 24 et ffmpeg, rien d’autre : l’enregistreur et ses sources.',
  'motion/tsconfig.json': 'TypeScript strict pour Node, la vérification sans compilation.',
  'motion/src/index.ts': 'L’assemblage : pour chaque caméra, lance l’enregistrement par segments et la surveillance du mouvement ; toutes les 5 secondes fabrique les clips des événements finis ; chaque minute supprime les segments, événements et clips de plus de 6 h ; démarre l’API.',
  'motion/src/detector.ts': 'Les fonctions pures du détecteur : changedShare (la part des pixels qui ont changé de plus d’un seuil entre deux images grises) et createDetector, la machine à états qui ouvre un événement après quelques images en mouvement et le ferme après quelques secondes de calme ; une part énorme de pixels changés est un changement de lumière, ignoré.',
  'motion/src/config.ts': 'Le réglage par l’environnement : caméras, adresses de go2rtc, dossiers, durée des segments et de conservation, marges avant et après un événement, seuils du détecteur.',
  'motion/src/detector.test.ts': 'Les tests du détecteur (node --test) : part de pixels changés, ouverture et fermeture d’un événement, changement de lumière ignoré.',
  'go2rtc/go2rtc.yaml': 'Les flux de la caméra : go2rtc ouvre une seule connexion RTSP vers la Reolink, pour le flux principal (4K, enregistré) et le flux léger (détection), et déclare le flux léger transcodé en MJPEG que l’API relaie pour le direct. Le mot de passe vient de la variable REOLINK_PASSWORD.',
  'go2rtc/CLAUDE.md': 'Les consignes de ce dossier : les trois flux par caméra, le mot de passe en variable d’environnement, comment ajouter une caméra.',
  'motion/src/events.ts': 'Le magasin des événements (id, caméra, début, fin, clip prêt ou non), écrit dans un fichier JSON pour survivre à un redémarrage : ouvrir, fermer, marquer le clip, lister, nettoyer.',
  'motion/src/segments.ts': 'L’enregistrement continu : ffmpeg copie le flux principal sans le transcoder en segments de 10 secondes nommés par l’heure, relancé s’il s’arrête ; le choix des segments qui couvrent une plage de temps, et le nettoyage des vieux.',
  'motion/src/clips.ts': 'Fabrique le clip d’un événement : les segments de la plage (avec marges) mis bout à bout par ffmpeg dans un MP4 compatible navigateur, sans transcodage.',
  'motion/src/watcher.ts': 'La surveillance : ffmpeg lit le flux léger et sort des images grises 160×90, 5 par seconde ; chaque image passe au détecteur, qui ouvre et ferme les événements. Relancé s’il s’arrête.',
  'motion/src/server.ts': 'L’API interne que House Sync interroge : la config (caméras et flux de direct), les événements (filtres after, before, has_clip, in_progress), le clip d’un événement et la dernière image d’une caméra (prise par go2rtc). Jamais publiée, sans mot de passe.',
  'motion/src/events.test.ts': 'Les tests du magasin d’événements : ouverture, fermeture, clip prêt, liste filtrée, nettoyage.',
  'motion/CLAUDE.md': 'Les consignes de l’enregistreur : ce qu’il fait pour chaque caméra, ses fichiers et comment régler la détection.',
  'ui/package.json': 'Le paquet @house/ui : les composants dumb des deux apps, consommé en source (pas de build) ; React en dépendance paire, Storybook en développement.',
  'ui/tsconfig.json': 'TypeScript strict pour le paquet, ses stories et la configuration Storybook.',
  'ui/eslint.config.ts': 'ESLint, le même réglage que le site, le dossier storybook-static ignoré.',
  'ui/vite.config.ts': 'La configuration Vite que Storybook reprend : React et Tailwind.',
  'ui/.storybook/main.ts': 'Storybook : React + Vite, les stories dans stories/, l’addon docs.',
  'ui/.storybook/preview.ts': 'Les réglages des pages docs : autodocs, l’ordre des sections (Base, Formulaires, Données, Médias, Caméras, Pages), le langage des snippets.',
  'ui/.storybook/storybook.css': 'Tailwind et les jetons du paquet, pour que les stories aient les couleurs de la maison.',
  'ui/src/index.ts': 'Le barrel public du paquet : chaque composant et ses types.',
  'ui/src/tokens.css': 'Les couleurs de la maison, claires ou sombres selon le système, exposées à Tailwind (@theme) ; chaque app les importe après Tailwind.',
  'ui/src/components/Button/Button.tsx': 'Le bouton de base des deux apps : trois apparences (défaut, actif, danger), type button par défaut.',
  'ui/src/components/Tabs/Tabs.tsx': 'Une barre d’onglets (rôles tablist et tab) ; l’onglet actif est une prop, une valeur vide n’en active aucun.',
  'ui/src/components/Page/Page.tsx': 'Page (le cadre, largeur bornée) et PageHeader (titre, texte d’état gris ou rouge, boutons à droite) : le même en-tête dans les deux apps.',
  'ui/src/components/Notice/Notice.tsx': 'Une phrase d’information ou d’erreur sous un en-tête.',
  'ui/src/components/SectionTitle/SectionTitle.tsx': 'Le titre d’une section de page, avec un détail en petit.',
  'ui/src/components/KeyForm/KeyForm.tsx': 'Le formulaire de la clé secrète : valeur, envoi et phrase d’aide viennent du parent.',
  'ui/src/components/Pager/Pager.tsx': 'La pagination d’un tableau : « 1 à 20 sur 143 » et deux boutons ; la page est au parent.',
  'ui/src/components/DataTable/DataTable.tsx': 'Un tableau paginé dans une carte : titre, description, détail, colonnes, cellules déjà rendues, et le Pager ; repliable par le titre quand le parent donne onToggle (état collapsed au parent).',
  'ui/src/components/Totals/Totals.tsx': 'Des chiffres en tête de page, une carte chacun, déjà mis en forme.',
  'ui/src/components/MediaPanel/MediaPanel.tsx': 'Un clip ou une image dans un panneau collant : la vidéo démarre à l’ouverture, Fermer retire le panneau sans déplacer ce qui est dessous.',
  'ui/src/components/ClipPlayer/ClipPlayer.tsx': 'Le lecteur d’un clip : démarre à startAt (et y saute à chaque changement), remonte sa durée et sa position ; le téléchargement est au parent.',
  'ui/src/components/SnapshotImage/SnapshotImage.tsx': 'Une image au format 16/9, ou un message dans le même cadre.',
  'ui/src/components/Timeline/Timeline.tsx': 'La frise, entièrement dessinée à partir de positions en % : graduations, bande de couverture, un bloc par événement (élargi au minimum, hachuré rouge en cours), le curseur ; elle ne fait que dessiner et remonter les gestes (clic dans un bloc sur la durée réelle, pointeur, molette via axisRef).',
  'ui/src/components/CameraCard/CameraCard.tsx': 'La carte d’une caméra : nom, média légendé (un emplacement), avertissement éventuel, frise (un emplacement).',
  'ui/src/components/ApiExplorer/ApiExplorer.tsx': 'La liste des services d’une API et la réponse de celui qu’on a appelé ; l’appel est au parent.',
  'ui/src/components/PageFrame/PageFrame.tsx': 'Une autre page dans une iframe, avec un lien pour l’ouvrir à part ; un texte quand l’adresse est vide.',
  'ui/stories/source.ts': 'Le helper source() : le snippet du bloc Source d’une page docs, à poser sur la story.',
  'ui/stories/i18n.ts': 'Le helper prose() : la prose d’une page docs en français puis en anglais, lue dans les deux .md du dossier.',
  'ui/stories/decorators.tsx': 'Le décorateur boxed : un cadre de la largeur d’une page des apps.',
}

/** Explication par rôle de fichier, pour les fichiers de composant qui suivent la convention (un dossier par composant). */
export const ROLE_EXPLANATIONS: Record<string, string> = {
  'CLAUDE.md': 'Les consignes de ce dossier pour Claude Code : ce qu’il contient, ses règles et ses commandes. Le fichier racine du dépôt renvoie à ceux-ci.',
  '.stories.tsx': 'Une story Storybook du paquet @house/ui : un cas d’usage du composant, avec son snippet (le .source.md du dossier) et sa prose (les .fr.md et .en.md). Un composant interactif a ici un petit composant de démo qui tient l’état.',
  '.source.md': 'Le snippet montré dans le bloc Source de la page docs : ce qu’un consommateur du paquet écrit, importé depuis @house/ui.',
  '.fr.md': 'La prose française de la page docs de la story : ce que le cas montre, et la seule chose non évidente à savoir.',
  '.en.md': 'La prose anglaise de la page docs de la story, la même chose qu’en français.',
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
    ['variable', /\$\{[^}\n]*\}/],
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
