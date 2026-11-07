import type { ArchView } from '@/components/ArchDiagram'
import type { ArchitectureConfig, ViewId } from './types'

export const TITLE = 'Architecture du système'
export const VIEW_GROUP_LABEL = 'Vue du schéma'
export const DEFAULT_VIEW: ViewId = 'hardware'

const HARDWARE: ArchView = {
  id: 'hardware',
  label: 'Matériel',
  intro: [
    'Ce qui se branche : le switch (branché au secteur) alimente les deux Reolink en PoE et se relie au mini PC et à la box. Le mini PC reçoit les flux, enregistre, sert la WebApp et garde les clips sur son SSD interne de 1 To.',
    'Les applications s’ouvrent depuis le PC de la maison, par le WiFi de la box. Hors de la maison, un téléphone passe par le VPN WireGuard de la box : un tunnel chiffré par internet jusqu’à la box, qui le laisse atteindre le mini PC comme s’il était à la maison. Aucun port des applications n’est ouvert sur internet.',
  ],
  ariaLabel:
    'Vue matériel : deux Reolink alimentées en PoE par le switch, branché au secteur ; le switch est relié au mini PC (SSD interne de 1 To) et à la box ; le PC de la maison rejoint la box en WiFi ; depuis l’extérieur, un téléphone rejoint la box par un tunnel VPN WireGuard à travers internet',
  viewBox: '0 0 1000 545',
  panels: [
    { id: 'cameras', x: 20, y: 20, w: 180, h: 360, tone: 'panel', title: 'Caméras' },
    { id: 'pc', x: 440, y: 20, w: 360, h: 360, tone: 'panel', title: 'Mini PC' },
    { id: 'home', x: 830, y: 20, w: 150, h: 360, tone: 'panel', title: 'Maison' },
    { id: 'outside', x: 20, y: 405, w: 960, h: 120, tone: 'panel', title: 'Hors de la maison (4G ou autre WiFi)' },
  ],
  boxes: [
    { id: 'cam1', x: 35, y: 80, w: 150, h: 90, tone: 'plain', title: 'Reolink · voliere-exterieur', lines: ['RLC-810A · 4K H.265', 'PoE 802.3af · 12 W'] },
    { id: 'cam2', x: 35, y: 210, w: 150, h: 90, tone: 'plain', title: 'Reolink · voliere-interieur', lines: ['RLC-810A · 4K H.265', 'PoE 802.3af · 12 W'] },
    { id: 'switch', x: 250, y: 110, w: 150, h: 110, tone: 'plain', title: 'Switch ES208GP', lines: ['8 ports PoE+ · 64 W', 'administrable (page web)', 'alimentation ⚡'] },
    { id: 'mini', x: 480, y: 70, w: 280, h: 120, tone: 'plain', title: 'Mini PC · Docker Compose', lines: ['ACEMAGIC K1 · Ryzen 5 7530U · 16 Go', 'SSD M.2 1 To : système, Docker, clips', 'alimentation ⚡ · tout en conteneurs'] },
    { id: 'pc', x: 845, y: 70, w: 120, h: 80, tone: 'plain', title: 'PC', lines: ['ouvre les applications', 'WiFi'] },
    { id: 'box', x: 845, y: 205, w: 120, h: 90, tone: 'plain', title: 'Box', lines: ['internet · WiFi', 'serveur VPN', 'WireGuard'] },
    { id: 'remote', x: 60, y: 440, w: 190, h: 70, tone: 'plain', title: 'Téléphone', lines: ['appli WireGuard', 'ouvre 192.168.27.139 : 8080 · 8081'] },
    { id: 'internet', x: 400, y: 440, w: 200, h: 70, tone: 'dashed', title: 'Internet', lines: ['le tunnel est chiffré', 'de bout en bout'] },
  ],
  arrows: [
    { id: 'cam1', d: 'M185 125 H215 V160 H248', both: true },
    { id: 'cam2', d: 'M185 255 H215 V190 H248', both: true },
    { id: 'mini', d: 'M402 150 H478', both: true },
    { id: 'box', d: 'M375 222 V362 H905 V297', both: true },
    { id: 'wifi', d: 'M905 152 V203', both: true },
    { id: 'tunnel1', d: 'M252 475 H398', both: true, vpn: true },
    { id: 'tunnel2', d: 'M602 475 H935 V297', both: true, vpn: true },
  ],
  labels: [
    { id: 'poe1', x: 212, y: 118, text: 'PoE', anchor: 'middle' },
    { id: 'poe2', x: 212, y: 248, text: 'PoE', anchor: 'middle' },
    { id: 'rj45', x: 440, y: 142, text: 'RJ45', anchor: 'middle' },
    { id: 'rj45c', x: 540, y: 354, text: 'RJ45 vers la box', anchor: 'middle' },
    { id: 'wifi', x: 915, y: 183, text: 'WiFi' },
    { id: 'tunnel', x: 760, y: 466, text: 'tunnel WireGuard (UDP)', anchor: 'middle', vpn: true },
    { id: 'tunnel-note', x: 760, y: 500, text: 'seul port ouvert sur la box', anchor: 'middle', note: true },
  ],
}

const SOFTWARE: ArchView = {
  id: 'software',
  label: 'Logiciel',
  intro: [
    'Quatre conteneurs Docker sur le mini PC : une unité « go2rtc + motion » pour les deux caméras, House Sync, et House API qui sert la WebApp ; un cinquième, la page invité, se lance à la demande.',
    'L’unité est un go2rtc et son enregistreur motion : go2rtc ouvre une seule connexion vers chaque caméra et la partage ; motion enregistre le flux principal des deux caméras par segments, détecte le mouvement sur le flux léger et fabrique les clips. Une autre machine aurait sa propre unité. House Sync interroge l’enregistreur par polling, copie les clips et une image par minute sur le SSD du mini PC, et écrit dans SQLite les événements et l’adresse du go2rtc de chaque caméra.',
    'L’utilisateur donne sa clé une seule fois : House API pose un cookie de session signé de 30 jours (HttpOnly), que le navigateur renvoie ensuite tout seul ; la clé n’est gardée nulle part. Le direct (MJPEG, quelques images par seconde) et l’image à l’instant viennent du go2rtc, relayés par l’API dans le réseau Docker ; les événements, les clips et les images par minute viennent de SQLite et du SSD. Les clips se lisent en continu (par morceaux), sans les télécharger en entier. L’API n’appelle jamais l’enregistreur.',
    'Sécurité : le go2rtc (1984, 8554) et l’API de l’enregistreur n’ont pas de mot de passe et ne sont jamais publiés ; seuls l’API (8080) et la page de House Sync (8081), avec la clé, le sont, et le pare-feu du mini PC (ufw) les réserve au réseau de la maison et au VPN WireGuard de la Freebox.',
    'Allumer ou éteindre une caméra : l’API se connecte à la page web du switch (HTTP, compte admin dans une variable d’environnement, sans contrôleur Omada ni conteneur de plus) et coupe ou rend le PoE du port de la caméra (poe). Couper le port éteint vraiment la caméra ; son enregistreur réessaie alors son flux en boucle jusqu’au retour du courant.',
    'Accès distant : le téléphone, hors de la maison, ouvre un tunnel WireGuard vers la Freebox, qui lui donne une adresse du réseau 192.168.27.0/24 ; il voit alors le mini PC à l’adresse 192.168.27.139 et atteint ses ports 8080 (WebApp) et 8081 (House Sync) comme depuis la maison. Rien n’est redirigé sur la Freebox, et l’API sert le certificat public de la maison (/rootCA.crt) pour que le téléphone fasse confiance au HTTPS.',
    'Page invité : un conteneur à part (guest), éteint par défaut (profil Compose), qui montre le direct à quelqu’un à qui on donne un lien secret : les caméras en petites vignettes sur une ligne, celle qu’on touche en grand, en 4K. Lecture seule, sans clip ni réglage ; il ne voit que go2rtc (son propre réseau Docker), jamais l’API ni House Sync. Elle tient un journal des visites que House Sync importe dans sa table guest_visits (adresse, réseau, navigateur, caméra regardée, durée). Elle est ouverte à internet par Tailscale Funnel (https://<machine>.<réseau>.ts.net/, sans redirection de port sur la Freebox : Tailscale relaie vers le port 8090 du mini PC, avec un vrai certificat HTTPS). Le bouton « Coupée » de House Sync (onglet Réglages) écrit un petit fichier que la page relit : elle ferme alors son port, plus rien n’y répond ; « En ligne » le rouvre. docker compose stop guest l’arrête tout à fait.',
  ],
  ariaLabel:
    'Vue logiciel : quatre conteneurs Docker sur le mini PC, plus la page invité à la demande. Deux Reolink envoient chacune leur flux RTSP à un même go2rtc, qui le partage avec l’enregistreur motion et le relaie en MJPEG à House API ; House Sync interroge l’enregistreur, copie les clips et une image par minute sur le SSD du mini PC et écrit dans une base SQLite les événements et l’adresse du go2rtc de chaque caméra ; l’utilisateur ouvre la WebApp, qui appelle les services de House API (clé puis cookie de session), lesquels relaient le go2rtc pour le direct, lisent SQLite et le SSD pour le reste, et coupent ou rendent le PoE du port d’une caméra sur le switch ; à distance, un téléphone passe par le serveur VPN WireGuard de la Freebox pour atteindre les mêmes services',
  viewBox: '0 0 1340 715',
  panels: [
    { id: 'cam', x: 20, y: 20, w: 200, h: 675, tone: 'panel', title: 'Caméras' },
    { id: 'pc', x: 260, y: 20, w: 890, h: 675, tone: 'panel', title: 'Mini PC' },
    { id: 'docker-unit', x: 280, y: 70, w: 310, h: 230, tone: 'warm', title: 'Docker · go2rtc + motion (les 2 caméras)' },
    { id: 'docker-sync', x: 470, y: 415, w: 370, h: 270, tone: 'warm', title: 'Docker · House Sync', titleEnd: true },
    { id: 'docker-house', x: 865, y: 60, w: 270, h: 350, tone: 'warm', title: 'Docker · API + WebApp' },
    { id: 'docker-guest', x: 280, y: 350, w: 175, h: 235, tone: 'warm', title: 'Docker · invité' },
  ],
  boxes: [
    { id: 'stream1', x: 40, y: 90, w: 160, h: 80, tone: 'plain', title: 'Reolink · voliere-exterieur', lines: ['flux 4K principal', 'flux léger'] },
    { id: 'stream2', x: 40, y: 190, w: 160, h: 80, tone: 'plain', title: 'Reolink · voliere-interieur', lines: ['flux 4K principal', 'flux léger'] },
    { id: 'go2rtc', x: 300, y: 105, w: 100, h: 170, tone: 'plain', title: 'go2rtc', lines: ['partage les 2 flux', 'MJPEG · image'] },
    { id: 'motion', x: 450, y: 105, w: 110, h: 170, tone: 'plain', title: 'motion', lines: ['mouvement', 'clips · 6 h', 'les 2 caméras'] },
    { id: 'webapp', x: 875, y: 90, w: 250, h: 70, tone: 'green', title: 'WebApp', lines: ['la page web', 'appelle l’API'] },
    { id: 'api', x: 875, y: 245, w: 250, h: 140, tone: 'green', title: 'House API', lines: ['auth : clé → cookie 30 jours', 'stream : direct MJPEG', 'frame : image à l’instant', 'events · clips · snapshots', 'poe : coupe / relance'] },
    { id: 'sync', x: 480, y: 450, w: 150, h: 96, tone: 'green', title: 'House Sync', lines: ['interroge motion', 'copie clips + images', 'écrit SQLite'] },
    { id: 'guest', x: 290, y: 385, w: 155, h: 125, tone: 'green', title: 'Page invité', lines: ['vignettes + 1 caméra 4K', 'lien secret · lecture seule', 'port 8090 · à la demande'] },
    { id: 'switch', x: 1195, y: 400, w: 130, h: 90, tone: 'plain', title: 'Switch ES208GP', lines: ['PoE port par port', 'alimente les caméras'] },
    { id: 'browser', x: 1195, y: 80, w: 130, h: 90, tone: 'plain', title: 'Utilisateur', lines: ['ouvre la WebApp', 'à la maison'] },
    { id: 'vpn', x: 1175, y: 515, w: 150, h: 75, tone: 'plain', title: 'Box · VPN', lines: ['serveur WireGuard', '192.168.27.0/24'] },
    { id: 'remote', x: 1175, y: 640, w: 150, h: 55, tone: 'plain', title: 'Téléphone 4G', lines: ['appli WireGuard'] },
  ],
  arrows: [
    { id: 'rtsp1', d: 'M200 130 H298', live: true },
    { id: 'guest-mjpeg', d: 'M310 383 V277', live: true, both: true },
    { id: 'guest-sync', d: 'M478 500 H447', both: true },
    { id: 'restream1', d: 'M400 130 H448' },
    { id: 'rtsp2', d: 'M200 230 H298', live: true },
    { id: 'restream2', d: 'M400 230 H448' },
    { id: 'polling', d: 'M600 450 V190 H562' },
    { id: 'mjpeg-stream', d: 'M873 308 H340 V277', live: true, both: true },
    { id: 'mjpeg-frame', d: 'M873 326 H370 V277', live: true, both: true },
    { id: 'auth', d: 'M905 162 V243' },
    { id: 'stream', d: 'M955 162 V243', live: true, both: true },
    { id: 'frame', d: 'M1005 162 V243', live: true, both: true },
    { id: 'events', d: 'M1055 162 V243' },
    { id: 'poe', d: 'M1105 162 V243' },
    { id: 'app', d: 'M1193 125 H1127', live: true, both: true },
    { id: 'write', d: 'M632 498 H668' },
    { id: 'write-db', d: 'M590 548 V611 H653' },
    { id: 'read-backup', d: 'M910 387 V490 H812' },
    { id: 'read-db', d: 'M980 387 V611 H827' },
    { id: 'api-switch', d: 'M1100 387 V445 H1193' },
    { id: 'tunnel', d: 'M1250 638 V592', both: true, vpn: true },
    { id: 'vpn-pc', d: 'M1173 552 H1128', vpn: true },
  ],
  labels: [
    { id: 'rtsp1', x: 249, y: 121, text: 'RTSP', anchor: 'middle', live: true },
    { id: 'guest-mjpeg', x: 304, y: 335, text: 'MJPEG', anchor: 'end', live: true },
    { id: 'guest-note1', x: 290, y: 530, text: 'fichiers ↔ House Sync :', note: true },
    { id: 'guest-note2', x: 290, y: 546, text: 'état (coupée),', note: true },
    { id: 'guest-note3', x: 290, y: 562, text: 'visites (guest_visits).', note: true },
    { id: 'restream1', x: 424, y: 121, text: 'RTSP', anchor: 'middle' },
    { id: 'rtsp2', x: 249, y: 221, text: 'RTSP', anchor: 'middle', live: true },
    { id: 'restream2', x: 424, y: 221, text: 'RTSP', anchor: 'middle' },
    { id: 'polling', x: 608, y: 432, text: 'polling · interne' },
    { id: 'mjpeg-stream', x: 730, y: 303, text: 'stream.mjpeg · flux d’images JPEG', anchor: 'middle', live: true },
    { id: 'mjpeg-frame', x: 730, y: 342, text: 'frame.jpeg · une image (1984, réseau Docker)', anchor: 'middle', live: true },
    { id: 'auth', x: 911, y: 207, text: 'auth' },
    { id: 'stream', x: 961, y: 207, text: 'stream', live: true },
    { id: 'frame', x: 1011, y: 207, text: 'frame', live: true },
    { id: 'events', x: 1061, y: 207, text: 'events' },
    { id: 'poe', x: 1111, y: 207, text: 'poe' },
    { id: 'app', x: 1160, y: 116, text: 'HTTP', anchor: 'middle', live: true },
    { id: 'write', x: 650, y: 489, text: 'write', anchor: 'middle' },
    { id: 'write-db', x: 598, y: 603, text: 'write' },
    { id: 'read-backup', x: 872, y: 507, text: 'read (clips, images)', anchor: 'middle' },
    { id: 'read-db', x: 905, y: 603, text: 'read', anchor: 'middle' },
    { id: 'api-switch', x: 1108, y: 424, text: 'poe on/off' },
    { id: 'api-switch-login', x: 1108, y: 438, text: 'page web · compte (env.)', note: true },
    { id: 'compose1', x: 280, y: 600, text: 'docker compose :', note: true },
    { id: 'compose2', x: 280, y: 616, text: 'quatre conteneurs (+ certs, + guest).', note: true },
    { id: 'sec1', x: 280, y: 640, text: 'go2rtc et motion : non publiés,', note: true },
    { id: 'sec2', x: 280, y: 656, text: 'seuls 8080, 8081 et 8090 (clé).', note: true },    { id: 'tunnel', x: 1242, y: 620, text: 'tunnel', anchor: 'end', vpn: true },
    { id: 'vpn-ports', x: 1168, y: 544, text: '192.168.27.139 : 8080 · 8081', anchor: 'end', vpn: true },
    { id: 'vpn-note1', x: 1168, y: 574, text: 'pare-feu : maison + VPN', anchor: 'end', note: true },
  ],
  disks: [
    { id: 'backup', cx: 740, cy: 468, title: 'SSD du mini PC', lines: ['clips · images/minute'] },
    { id: 'sqlite', cx: 740, cy: 568, rx: 85, title: 'SQLite', lines: ['événements', 'images par minute', 'flux go2rtc par caméra'] },
  ],
}

/** Ce que font les réglages de la sauvegarde (page de House Sync), selon leur valeur. */
const SETTINGS: ArchView = {
  id: 'settings',
  label: 'Réglages',
  intro: [
    'Quatre réglages par caméra, sur la page de House Sync (onglet Réglages) : les clips gardés, le rythme des images de la frise et la cadence des deux directs (4K et léger). Ils sont gardés dans SQLite (table settings) et House Sync les applique.',
    'Les clips : « Toujours » garde tout ; « Jamais » éteint aussi la détection de mouvement (ffmpeg du flux léger est arrêté : pas d’événement, moins de processeur) ; « La nuit » ne garde que de 30 minutes avant le coucher du soleil à 30 minutes après son lever, l’heure du soleil étant calculée pour la maison. En dehors de cette fenêtre, c’est comme « Jamais ». Dans une volière où tout bouge le jour, les clips de nuit sont les seuls qui comptent.',
    'Les images : une image JPEG par caméra toutes les 30 s, 1, 2 ou 5 minutes, gardées 7 jours pour la frise. Les deux directs, 4K et léger, ont chacun un curseur de 1 à 25 images par seconde ; House Sync change à chaud la source du flux MJPEG correspondant de go2rtc, ce qui réduit l’encodage JPEG et le débit (le décodage de la caméra reste complet).',
  ],
  ariaLabel:
    'Vue réglages : le réglage des clips (toujours, la nuit, jamais) décide si la détection de mouvement tourne et si les clips sont gardés sur le SSD ; le réglage des images fixe leur rythme de sauvegarde pour la frise ; les curseurs des directs 4K et léger règlent le nombre d’images par seconde des flux MJPEG de go2rtc',
  viewBox: '0 0 1000 720',
  panels: [
    { id: 'clips', x: 20, y: 20, w: 960, h: 360, tone: 'panel', title: 'Clips et détection de mouvement (par caméra)' },
    { id: 'snap', x: 20, y: 400, w: 960, h: 130, tone: 'panel', title: 'Images de la frise' },
    { id: 'live', x: 20, y: 550, w: 960, h: 150, tone: 'panel', title: 'Directs : images par seconde' },
  ],
  boxes: [
    { id: 'setting', x: 40, y: 150, w: 190, h: 110, tone: 'green', title: 'Réglage « Clips vidéo »', lines: ['Toujours · La nuit · Jamais', 'gardé par House Sync', '(SQLite, table settings)'] },
    { id: 'always', x: 340, y: 55, w: 620, h: 92, tone: 'green', title: 'Toujours', lines: ['détection de mouvement allumée en permanence', 'chaque mouvement : un événement et un clip (4K et H.264)', 'House Sync copie le clip sur le SSD du mini PC'] },
    { id: 'night', x: 340, y: 155, w: 620, h: 92, tone: 'warm', title: 'La nuit', lines: ['de 30 min avant le coucher du soleil à 30 min après le lever', 'dans cette fenêtre : comme « Toujours »', 'en dehors : comme « Jamais » (soleil calculé pour la maison)'] },
    { id: 'never', x: 340, y: 255, w: 620, h: 92, tone: 'dashed', title: 'Jamais', lines: ['détection éteinte : ffmpeg du flux léger arrêté', 'aucun événement, aucun clip, moins de processeur', 'les clips déjà gardés ne sont pas effacés'] },
    { id: 'snapset', x: 40, y: 440, w: 190, h: 80, tone: 'green', title: 'Une image toutes les', lines: ['30 s · 1 · 2 · 5 min', '1 min par défaut'] },
    { id: 'snapout', x: 330, y: 440, w: 300, h: 80, tone: 'plain', title: 'SSD · snapshots', lines: ['une image par caméra, bande bleue de la frise', 'gardée 7 jours'] },
    { id: 'slider', x: 40, y: 585, w: 190, h: 50, tone: 'green', title: 'Curseur « Direct 4K »', lines: ['1 à 25 images/s'] },
    { id: 'slider-light', x: 40, y: 640, w: 190, h: 50, tone: 'green', title: 'Curseur « Direct léger »', lines: ['1 à 25 images/s'] },
    { id: 'go2rtc-4k', x: 330, y: 585, w: 300, h: 50, tone: 'plain', title: 'go2rtc · voliere-exterieur_main_mjpeg', lines: ['flux principal 4K H.265 recodé en JPEG'] },
    { id: 'go2rtc-light', x: 330, y: 640, w: 300, h: 50, tone: 'plain', title: 'go2rtc · voliere-exterieur_sub_mjpeg', lines: ['flux secondaire H.264 recodé en JPEG'] },
  ],
  arrows: [
    { id: 'to-always', d: 'M230 190 H290 V101 H338' },
    { id: 'to-night', d: 'M230 205 H338' },
    { id: 'to-never', d: 'M230 220 H290 V301 H338' },
    { id: 'snap', d: 'M230 480 H328' },
    { id: 'live4k', d: 'M230 610 H328', live: true },
    { id: 'livelight', d: 'M230 665 H328', live: true },
  ],
  labels: [
    { id: 'push1', x: 40, y: 292, text: 'House Sync dit à motion', note: true },
    { id: 'push2', x: 40, y: 308, text: 'd’allumer ou d’éteindre', note: true },
    { id: 'push3', x: 40, y: 324, text: 'la détection (chaque minute).', note: true },
    { id: 'snap', x: 279, y: 472, text: 'cadence', anchor: 'middle' },
    { id: 'live4k', x: 279, y: 602, text: 'PATCH', anchor: 'middle', live: true },
    { id: 'livelight', x: 279, y: 657, text: 'PATCH', anchor: 'middle', live: true },
    { id: 'snap-note', x: 660, y: 470, text: 'Au-delà de 5 min, « l’image à cet instant »', note: true },
    { id: 'snap-note2', x: 660, y: 486, text: 'serait trop loin de ce que tu cliques.', note: true },
    { id: 'live-note1', x: 660, y: 600, text: 'Moins d’images : moins d’encodage JPEG et de débit.', note: true },
    { id: 'live-note2', x: 660, y: 616, text: 'Le décodage de la caméra reste complet.', note: true },
    { id: 'live-note3', x: 660, y: 640, text: 'Le direct en cours repart quand le réglage change.', note: true },
  ],
}

/** Les interfaces : la même introduction pour tout le système. */
const INTERFACES_INTRO = [
  'Les deux interfaces web (la WebApp et la page de House Sync), le paquet @house/ui qu’elles partagent avec son Storybook, et House API qui sert la WebApp.',
  'Chaque application garde ses conteneurs (état, appels, calculs) et passe des props à des composants qui ne tiennent aucune donnée.',
]

const CODE_INTRO = [
  'Les fichiers du système, tels qu’ils sont dans le dépôt (dossier code/stack) : les conteneurs, lancés par le même docker-compose.yml sur le mini PC. Clique sur un fichier pour voir son code et ce qu’il fait.',
  'Les clips et la base vont sur le SSD interne de 1 To : les volumes de data/ y restent. Le site n’exécute rien de ce code.',
]

const DEPLOY_INTRO = [
  'Où joindre chaque chose : la box (et son VPN WireGuard), le switch, les caméras, le mini PC, la WebApp, l’API et House Sync.',
  'Les comptes sont nommés, jamais les mots de passe : ils sont dans le fichier .env du mini PC.',
]

/** Le système tel qu'il est : ses deux schémas et l'introduction des vues sans schéma. */
export const ARCHITECTURE: ArchitectureConfig = {
  title: TITLE,
  views: { hardware: HARDWARE, software: SOFTWARE, settings: SETTINGS },
  intros: { interfaces: INTERFACES_INTRO, code: CODE_INTRO, deploy: DEPLOY_INTRO },
}

export const VIEW_OPTIONS: { id: ViewId; label: string }[] = [
  { id: 'hardware', label: HARDWARE.label },
  { id: 'software', label: SOFTWARE.label },
  { id: 'settings', label: SETTINGS.label },
  { id: 'interfaces', label: 'Interfaces' },
  { id: 'code', label: 'Code' },
  { id: 'deploy', label: 'Déploiement' },
]
