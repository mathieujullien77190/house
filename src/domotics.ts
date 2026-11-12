// Les quatre domaines de la maison connectée : ce qui est en place, ce qui est en préparation (avec son prix s'il est connu).
// Les prix sont ceux relevés le 3 novembre 2026 (Amazon et shelly.com), à revérifier avant de commander ; ceux de la boîte à servos des volets Nice ont été relevés le 12 novembre 2026 (Amazon).

export type DomainId = 'cameras' | 'lights' | 'shutters' | 'plugs'

export interface DomainItem {
  id: string
  title: string
  text: string
  /** Prix en euros, absent tant qu'on ne l'a pas relevé. */
  price?: number
  url?: string
}

export interface DomainInfo {
  id: DomainId
  label: string
  intro: string
  inPlace: DomainItem[]
  planned: DomainItem[]
}

export const domains: Record<DomainId, DomainInfo> = {
  cameras: {
    id: 'cameras',
    label: 'Caméra',
    intro: 'Quatre caméras, enregistrées en continu par le mini PC.',
    inPlace: [
      {
        id: 'reolink',
        title: '4 caméras Reolink RLC-810A',
        text: 'voliere-exterieur, voliere-interieur, salon-de-jardin et voliere-toit. 4K, alimentées par le câble réseau (PoE) depuis le switch TP-Link ES208GP, ports 3, 4, 7 et 8 : 4 × 12 W = 48 W au plus pour 64 W de budget. Un enregistrement continu de 6 h, des clips sur mouvement copiés sur le disque de sauvegarde, le son du clip seulement pour voliere-interieur. La page invité ne montre que voliere-exterieur et voliere-interieur.',
      },
      {
        id: 'mini-pc',
        title: 'Mini PC ACEMAGIC K1',
        text: 'Fait tourner la pile Docker : go2rtc (le direct) et motion (l’enregistreur), une seule unité pour les quatre caméras, puis House Sync, House API et la WebApp (et la page invité, éteinte par défaut). Accessible hors de la maison par le VPN WireGuard de la Freebox.',
      },
    ],
    planned: [
      {
        id: 'cable-cam',
        title: 'Caméra sur câble motorisé',
        text: 'Une caméra WiFi sur un chariot qui roule le long d’un câble d’acier tendu (20 m à terme, essai sur 5 m d’abord). Un seul moteur pas à pas à un bout, piloté par un ESP32 avec des fins de course, et une poulie à l’autre bout pour fermer la boucle. Alimentation de la caméra à trancher : caméra sur batterie rechargée à un bout, ou deux conducteurs 12 V avec des frotteurs. Une page de House commanderait la position, comme pour les volets. Prix à relever.',
      },
    ],
  },
  lights: {
    id: 'lights',
    label: 'Lumière',
    intro: 'Les lampes Philips Hue, commandées par leur pont.',
    inPlace: [
      {
        id: 'hue-bridge',
        title: 'Pont Philips Hue',
        text: 'Les lampes sont rangées par zone de la maison (chambre, salle de bain, cuisine, couloir, entrée, salon, volière). House les allume, les éteint et règle leur luminosité depuis l’onglet Lumière de la WebApp.',
      },
      {
        id: 'hue-sensors',
        title: 'Détecteurs de mouvement de la volière',
        text: 'Mouvement, température, luminosité et pile, lus par House.',
      },
      {
        id: 'hue-rules',
        title: 'Automatisations du pont',
        text: 'Quatre règles, dans le pont. « Eteind tout » éteint toutes les pièces à 10:00, cage comprise. Le détecteur « motion interieur » (cage) allume la scène « Lumineux » en cas de mouvement la nuit et éteint la lumière après 40 min sans mouvement le jour, 20 min la nuit. Depuis le 11 novembre 2026, la lampe de la volière a en plus « Allume perruche 16h » (scène « Lumineux » tous les jours à 16:00) et « Eteind perruche 18h » (tous les jours à 18:00, extinction progressive sur 15 minutes). « motion exterieur » est lu et journalisé, mais ne commande plus rien depuis le 7 novembre.',
      },
    ],
    planned: [
      {
        id: 'hue-sun',
        title: 'Lever et coucher du soleil automatiques',
        text: 'Les capteurs utilisent des heures fixes (07:39 et 17:27 au 3 novembre 2026) qui ne suivent pas les saisons. Il faut renseigner la localisation du pont dans l’appli Hue, puis remplacer les heures par « sunrise » et « sunset ».',
      },
    ],
  },
  shutters: {
    id: 'shutters',
    label: 'Volet',
    intro: 'Les volets roulants, commandés par radio en 433 MHz : le volet de la cuisine depuis la WebApp, les autres par leur télécommande murale en attendant la boîte à servos.',
    inPlace: [
      {
        id: 'kitchen-shutter',
        title: 'Volet de la cuisine, piloté depuis la WebApp (depuis le 9 novembre 2026)',
        text: 'Une ESP32 avec un module radio CC1101 (433 MHz) sous le firmware ESPSomfy-RTS se fait passer pour une télécommande Somfy RTS. House API lui envoie les ordres (monter, stop, descendre) par le réseau de la maison (SHUTTERS, SHUTTERS_ESP_URL, shutterDriver.ts) ; l’onglet Volet de la WebApp les commande, avec une action automatique au lever et au coucher du soleil. Le schéma 3D du montage est sous les schémas matériel et logiciel de cet onglet.',
      },
      {
        id: 'nice-remotes',
        title: 'Télécommandes murales Nice (volets PC, SALON et PORTE)',
        text: 'Trois NiceWay WM001G, 433,92 MHz, à code tournant : elles ne peuvent pas être copiées par radio. Ce sont aujourd’hui la seule façon de commander ces trois volets, sans retour d’état.',
      },
    ],
    planned: [
      {
        id: 'servo-box',
        title: 'Boîte à 9 servos pour les télécommandes Nice (achats faits le 12 novembre 2026, pas encore reçus)',
        text: 'Un servo Miuzei MF90 par touche (monter, stop, descendre) des trois télécommandes, soit 9 servos, commandés par une seconde ESP32 et une carte PCA9685 (I2C), alimentés par un bloc 5 V 3 A. Budget total : 83,93 €. La liste d’achats détaillée et le schéma 3D du montage sont sous le schéma 3D des volets, dans cet onglet.',
        price: 83.93,
      },
      {
        id: 'service-servos',
        title: 'Firmware de la seconde ESP32 et commande dans House API',
        text: 'Le firmware qui pose les servos sur les touches, puis les boutons des volets PC, salon et porte dans la WebApp, sur le modèle de celui de la cuisine. À écrire quand le matériel est là ; rien n’est encore écrit.',
      },
    ],
  },
  plugs: {
    id: 'plugs',
    label: 'Prise',
    intro: 'Mesurer la consommation, prise par prise, puis au compteur.',
    inPlace: [
      {
        id: 'kasa',
        title: 'Prise Kasa HS100',
        text: 'Pilotée en local avec python-kasa, derrière le répéteur Wi-Fi RE365.',
      },
    ],
    planned: [
      {
        id: 'shelly-4',
        title: 'Shelly Plug M Gen3, lot de 4',
        text: 'Mesure de puissance, lecture en local sans compte (interface web, webhooks, MQTT), 13 A. Entrée CEE 7/7 : elle va dans une prise murale française. Quatre appareils : PC fixe et écran, mini PC et switch, box, TV et box TV.',
        price: 37.9,
        url: 'https://www.shelly.com/fr/products/shelly-plug-m-gen3-white-4-pack',
      },
      {
        id: 'shelly-1',
        title: 'Shelly Plug M Gen3, à l’unité',
        text: 'La cinquième prise, pour le frigo. Jamais de coupure automatique sur le frigo, le mini PC, le switch et la box : seulement la mesure et une alerte.',
        price: 12.9,
      },
      {
        id: 'linky',
        title: 'Module TIC pour le Linky',
        text: 'Compteur monophasé en mode historique, le Wi-Fi arrive à côté. Un module TIC en Wi-Fi (type Denky D4) donnerait la puissance de toute la maison en direct, sans toucher au tableau. Prix à vérifier.',
      },
      {
        id: 'water',
        title: 'Compteur d’eau (Itron Cyble, relevé radio Veolia)',
        text: 'Le module radio est chiffré, donc pas lisible à la maison. Piste : l’index jour par jour du compte client Veolia, par une intégration non officielle.',
      },
      {
        id: 'service-plugs',
        title: 'Lecture des watts dans House API',
        text: 'Une page par appareil et une alerte quand le frigo reste à 0 W trop longtemps. À écrire quand les prises sont là.',
      },
    ],
  },
}
