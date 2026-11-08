// Les quatre domaines de la maison connectée : ce qui est en place, ce qui est en préparation (avec son prix s'il est connu).
// Les prix sont ceux relevés le 3 novembre 2026 (Amazon et shelly.com), à revérifier avant de commander.

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
    intro: 'Deux caméras au portail, enregistrées en continu par le mini PC.',
    inPlace: [
      {
        id: 'reolink',
        title: '2 caméras Reolink RLC-810A',
        text: '4K, alimentées par le câble réseau (PoE) depuis le switch TP-Link ES208GP, ports 3 et 4. Un enregistrement continu de 6 h, des clips sur mouvement copiés sur le disque de sauvegarde.',
      },
      {
        id: 'mini-pc',
        title: 'Mini PC ACEMAGIC K1',
        text: 'Fait tourner la pile Docker : go2rtc (le direct), motion (l’enregistreur), House Sync, House API et la WebApp. Accessible hors de la maison par le VPN WireGuard de la Freebox.',
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
        text: 'Une règle éteint toutes les pièces à 10:00. Deux règles de capteurs allument et éteignent la cage selon le jour et la nuit.',
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
    intro: 'Les volets roulants, commandés par radio en 433 MHz.',
    inPlace: [
      {
        id: 'somfy-remote',
        title: 'Télécommande Somfy RTS',
        text: 'La seule façon de commander les volets aujourd’hui : monter, descendre, stop, sans retour d’état.',
      },
      {
        id: 'ww001c-remote',
        title: 'Télécommande WW001C',
        text: '433,92 MHz, pile CR2032, moteur peut-être de marque Nice. On ne sait pas encore si son code est fixe ou tournant.',
      },
    ],
    planned: [
      {
        id: 'cc1101',
        title: 'Module radio CC1101 433 MHz (Binghe, antenne SMA)',
        text: 'Émet et reçoit en 433 MHz. Alimenté en 3,3 V par l’ESP32. Prendre la version 433 MHz, pas 868.',
        price: 8.99,
      },
      {
        id: 'esp32',
        title: 'Carte ESP32 WROOM-32 USB-C (Heemol)',
        text: 'Le cerveau du montage, sur le Wi-Fi 2,4 GHz. Posée près des volets, alimentée par un chargeur USB. Firmware ESPSomfy-RTS, qui apprend les volets Somfy comme une télécommande de plus.',
        price: 12.98,
      },
      {
        id: 'dupont',
        title: 'Câbles Dupont femelle-femelle (Elegoo, lot de 120)',
        text: '8 fils pour relier le CC1101 à l’ESP32, sans soudure : 3V3, GND, SCK, MISO, MOSI, CSN, GDO0, GDO2.',
        price: 8.99,
      },
      {
        id: 'usb-power',
        title: 'Chargeur USB et câble USB-C de données',
        text: 'N’importe quel chargeur de téléphone (5 V, 1 A) sur une prise de 230 V près des volets, et un câble USB-C qui transmet les données. L’ESP32 consomme moins d’un watt et donne le 3,3 V au CC1101.',
      },
      {
        id: 'service-shutters',
        title: 'Service « volets » dans House API',
        text: 'Boutons monter, descendre et stop dans la WebApp, sur le modèle de /hue : House API enverrait les ordres à l’ESP32 par le réseau de la maison. À écrire quand le matériel est là.',
      },
      {
        id: 'ww001c-test',
        title: 'Identifier le code de la WW001C',
        text: 'Le CC1101 peut écouter la télécommande : un code fixe se rejoue, un code tournant se traite comme un Somfy.',
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
