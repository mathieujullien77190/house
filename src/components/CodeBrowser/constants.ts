import type { Language, Rule, TokenKind } from './types'

const PREFIX = '/code/phase0/'

/** Les fichiers du dossier code/phase0, lus tels quels à la compilation (le site n'exécute rien de ce code). */
const modules = import.meta.glob<string>(
  [
    '/code/phase0/**/*.{yml,ts,js,json,html,md}',
    '/code/phase0/**/Dockerfile',
    '/code/phase0/.env.example',
    '!/code/phase0/data/**',
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
export const ORDER = ['README.md', 'docker-compose.yml', '.env.example', 'frigate', 'sync', 'api', 'web']

export const EXPLANATIONS: Record<string, string> = {
  'README.md': 'Point d’entrée du dossier : le plan des fichiers, comment démarrer la pile et ce qu’il faut savoir (ports publiés, pas encore d’authentification sur l’API).',
  'docker-compose.yml': 'Décrit les trois conteneurs et comment ils se parlent. Frigate et House Sync partagent un réseau, l’API est sur un autre. Seuls les ports 8971 (Frigate, avec connexion) et 8080 (API) sont publiés ; le port 5000 de Frigate reste interne. Le dossier data/backup est écrit par House Sync et monté en lecture seule dans l’API.',
  '.env.example': 'Modèle des secrets : mot de passe de la Reolink et compte viewer de House Sync. On le copie en .env, qui n’est jamais commité.',
  'frigate/config/config.yml': 'Configuration de Frigate pour une Reolink : go2rtc ouvre une seule connexion vers la caméra (flux principal et flux léger), le flux léger sert à détecter le mouvement, le principal est enregistré sur mouvement pendant 3 jours. Pas de MQTT, authentification activée. Le mot de passe de la caméra vient d’une variable d’environnement. Les clés exactes dépendent de la version de Frigate.',
  'sync/Dockerfile': 'Image de House Sync : Node 24, utilisateur non root. Node 24 lance directement les fichiers TypeScript, sans étape de compilation.',
  'sync/package.json': 'Réduit au minimum : le projet n’a aucune dépendance, il utilise seulement ce que Node fournit (dont SQLite).',
  'sync/src/index.ts': 'Version minimale : crée la base events.db avec ses trois tables (événements, adresse de la dernière image, adresse iframe), puis vérifie toutes les 30 secondes que Frigate répond. Plus tard : connexion avec le compte viewer, lecture des événements, copie des clips et écriture des adresses.',
  'api/Dockerfile': 'Image de House API : elle contient l’API et le dossier web, que l’API sert. Le contexte de build est le dossier phase0 pour pouvoir copier les deux.',
  'api/package.json': 'Réduit au minimum, sans dépendance : l’API n’utilise que le serveur HTTP de Node.',
  'api/src/index.ts': 'Version minimale : un service GET /welcome qui répond en JSON, et le service des fichiers de la WebApp (sans jamais sortir du dossier web). Plus tard : auth, direct, image, events, clips et poe.',
  'web/index.html': 'La page de la WebApp : un texte qui affiche la réponse de l’API et un bouton pour réessayer.',
  'web/main.js': 'Un seul appel : la page demande /welcome à l’API et affiche la réponse, ou « API injoignable ». C’est la vérification que la chaîne WebApp, API fonctionne.',
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
export const DEPTH_CLASS = ['pl-0', 'pl-3', 'pl-6', 'pl-9']
