import type { ArchView } from '@/components/ArchDiagram'
import type { ShutterViewId } from '@/components/ShutterSystem/types'

export const DEFAULT_VIEW: ShutterViewId = 'hardware'

const HARDWARE: ArchView = {
  id: 'remote-hardware',
  label: 'Matériel',
  intro: [
    'Un seul boîtier, une seule carte ESP32, alimentée par un chargeur USB. Le module radio CC1101 (8 fils) émet en 433 MHz vers les moteurs de volets Somfy RTS ; un petit émetteur infrarouge (transistor et LED, 3 fils) commande la pompe à chaleur Mitsubishi sans Wi-Fi, comme sa télécommande.',
    'L’ESP32 rejoint la Freebox en Wi-Fi 2,4 GHz et sert sa propre page : aucun serveur à côté. À distance, le téléphone passe par le WireGuard de la Freebox. Projet : rien n’est commandé ni codé.',
  ],
  ariaLabel:
    'Vue matériel du boîtier volet et clim : une prise murale alimente un chargeur USB relié en USB-C à une carte ESP32 ; l’ESP32 pilote par 8 fils un module radio CC1101 qui parle en 433 MHz aux moteurs Somfy RTS, et par 3 fils un émetteur infrarouge qui commande la pompe à chaleur ; l’ESP32 rejoint la Freebox en Wi-Fi et le téléphone s’y connecte par WireGuard',
  viewBox: '0 0 1000 435',
  panels: [
    { id: 'power', x: 20, y: 20, w: 190, h: 250, tone: 'panel', title: 'Alimentation' },
    { id: 'box', x: 250, y: 20, w: 380, h: 250, tone: 'panel', title: 'Boîtier' },
    { id: 'devices', x: 670, y: 20, w: 310, h: 250, tone: 'panel', title: 'Appareils' },
    { id: 'network', x: 20, y: 295, w: 960, h: 125, tone: 'panel', title: 'Réseau de la maison et accès à distance' },
  ],
  boxes: [
    { id: 'outlet', x: 35, y: 75, w: 160, h: 60, tone: 'plain', title: 'Prise murale', lines: ['230 V'] },
    { id: 'charger', x: 35, y: 170, w: 160, h: 80, tone: 'plain', title: 'Chargeur USB', lines: ['5 V · 1 A', 'chargeur de téléphone'] },
    { id: 'esp32', x: 265, y: 75, w: 150, h: 110, tone: 'green', title: 'ESP32 WROOM-32', lines: ['Wi-Fi 2,4 GHz', 'firmware maison', 'USB-C · 5 V'] },
    { id: 'cc1101', x: 450, y: 75, w: 165, h: 70, tone: 'green', title: 'CC1101', lines: ['433,42 MHz · antenne', '3,3 V (ESP32)'] },
    { id: 'ir', x: 450, y: 170, w: 165, h: 85, tone: 'green', title: 'Émetteur infrarouge', lines: ['2N2222 · 330 Ω · 47 Ω', 'LED 940 nm', '5 V (ESP32)'] },
    { id: 'motor', x: 690, y: 75, w: 130, h: 80, tone: 'plain', title: 'Volet Somfy', lines: ['moteur RTS', '433,42 MHz'] },
    { id: 'remote', x: 840, y: 75, w: 125, h: 80, tone: 'plain', title: 'Télécommande', lines: ['Somfy RTS', 'déjà là'] },
    { id: 'ac', x: 690, y: 175, w: 275, h: 80, tone: 'plain', title: 'Pompe à chaleur', lines: ['Mitsubishi sans Wi-Fi', 'récepteur infrarouge de l’unité'] },
    { id: 'freebox', x: 60, y: 335, w: 200, h: 70, tone: 'plain', title: 'Freebox', lines: ['Wi-Fi 2,4 GHz', 'serveur WireGuard'] },
    { id: 'phone', x: 700, y: 335, w: 230, h: 70, tone: 'plain', title: 'Téléphone', lines: ['page de l’ESP32', 'WireGuard hors de la maison'] },
  ],
  arrows: [
    { id: 'outlet-charger', d: 'M115 137 V168' },
    { id: 'usb', d: 'M197 210 H232 V130 H263' },
    { id: 'wires', d: 'M417 110 H448', both: true },
    { id: 'irwires', d: 'M417 170 H432 V212 H448' },
    { id: 'radio', d: 'M617 110 H688', dashed: true },
    { id: 'infrared', d: 'M617 212 H688', dashed: true },
    { id: 'remote', d: 'M838 115 H822', dashed: true },
    { id: 'wifi', d: 'M340 187 V310 H160 V333', both: true, dashed: true },
    { id: 'vpn', d: 'M262 370 H698', both: true, dashed: true },
  ],
  labels: [
    { id: 'volts', x: 122, y: 158, text: '230 V' },
    { id: 'usb', x: 228, y: 160, text: 'USB-C', anchor: 'end' },
    { id: 'wires', x: 432, y: 102, text: '8 fils', anchor: 'middle' },
    { id: 'irwires', x: 442, y: 164, text: '3 fils', anchor: 'end' },
    { id: 'radio', x: 652, y: 102, text: '433 MHz', anchor: 'middle' },
    { id: 'infrared', x: 652, y: 204, text: 'infrarouge', anchor: 'middle' },
    { id: 'wifi', x: 350, y: 302, text: 'Wi-Fi' },
    { id: 'vpn', x: 480, y: 362, text: 'WireGuard', anchor: 'middle' },
  ],
}

const SOFTWARE: ArchView = {
  id: 'remote-software',
  label: 'Logiciel',
  intro: [
    'Le téléphone ouvre la page de l’ESP32 (à l’intérieur de la maison en Wi-Fi, au dehors par le WireGuard de la Freebox). La page, un petit HTML + JS embarqué dans l’ESP32, appelle son API JSON : pas de serveur, pas de compte.',
    'Le firmware (Arduino/PlatformIO, à écrire) a deux modules : les volets (Somfy RTS : chaque volet est une télécommande de plus, avec son code tournant gardé en mémoire flash) et la clim (bibliothèque IRremoteESP8266, protocole Mitsubishi). Le Wi-Fi se règle au premier démarrage et le firmware se met à jour sans fil.',
    'Les deux sorties sont à sens unique : l’ESP32 ne sait ni si le volet est ouvert, ni si la clim a bien reçu l’ordre.',
  ],
  ariaLabel:
    'Vue logiciel du boîtier volet et clim : le téléphone appelle la Freebox (WireGuard) puis le serveur web de l’ESP32 ; son module volets (Somfy RTS, code tournant en flash) pilote le CC1101 par le bus SPI, qui émet en 433 MHz vers les moteurs ; son module clim (IRremoteESP8266, protocole Mitsubishi) pilote la LED infrarouge par la broche G26 vers la pompe à chaleur',
  viewBox: '0 0 1000 435',
  panels: [
    { id: 'client', x: 20, y: 20, w: 180, h: 200, tone: 'panel', title: 'Téléphone' },
    { id: 'net', x: 240, y: 20, w: 170, h: 200, tone: 'panel', title: 'Accès' },
    { id: 'esp', x: 450, y: 20, w: 370, h: 400, tone: 'warm', title: 'ESP32 · firmware maison' },
    { id: 'out', x: 860, y: 20, w: 120, h: 400, tone: 'panel', title: 'Sorties' },
  ],
  boxes: [
    { id: 'phone', x: 35, y: 80, w: 150, h: 90, tone: 'green', title: 'Navigateur', lines: ['page HTML + JS', 'volets · clim'] },
    { id: 'freebox', x: 255, y: 80, w: 140, h: 90, tone: 'plain', title: 'Freebox', lines: ['Wi-Fi', 'WireGuard'] },
    { id: 'web', x: 465, y: 70, w: 340, h: 70, tone: 'plain', title: 'Serveur web', lines: ['page HTML + JS embarquée', 'API JSON : /shutter · /ac'] },
    { id: 'shutters', x: 465, y: 160, w: 160, h: 100, tone: 'plain', title: 'Module volets', lines: ['Somfy RTS', 'code tournant en flash', 'haut · bas · stop · prog'] },
    { id: 'aircon', x: 645, y: 160, w: 160, h: 100, tone: 'plain', title: 'Module clim', lines: ['IRremoteESP8266', 'mode · consigne', 'ventilateur · ailettes'] },
    { id: 'system', x: 465, y: 305, w: 340, h: 95, tone: 'plain', title: 'Système', lines: ['Wi-Fi réglé au premier démarrage', 'mise à jour sans fil (OTA)', 'mémoire flash : codes et état'] },
    { id: 'cc1101', x: 870, y: 60, w: 100, h: 70, tone: 'plain', title: 'CC1101', lines: ['433,42 MHz'] },
    { id: 'motors', x: 870, y: 150, w: 100, h: 60, tone: 'plain', title: 'Volets', lines: ['moteurs RTS'] },
    { id: 'led', x: 870, y: 240, w: 100, h: 70, tone: 'plain', title: 'LED IR', lines: ['940 nm', 'transistor'] },
    { id: 'unit', x: 870, y: 330, w: 100, h: 60, tone: 'plain', title: 'Clim', lines: ['Mitsubishi'] },
  ],
  arrows: [
    { id: 'http', d: 'M187 125 H253', both: true },
    { id: 'wifi', d: 'M397 125 H463', both: true },
    { id: 'toshutters', d: 'M545 142 V158' },
    { id: 'toaircon', d: 'M725 142 V158' },
    { id: 'spi', d: 'M545 262 V272 H846 V95 H868' },
    { id: 'gpio', d: 'M725 262 V288 H852 V275 H868' },
    { id: 'air', d: 'M920 132 V148', dashed: true },
    { id: 'ir', d: 'M920 312 V328', dashed: true },
  ],
  labels: [
    { id: 'http', x: 220, y: 117, text: 'HTTP', anchor: 'middle' },
    { id: 'wifi', x: 430, y: 117, text: 'Wi-Fi', anchor: 'middle' },
    { id: 'spi', x: 560, y: 268, text: 'SPI' },
    { id: 'gpio', x: 740, y: 283, text: 'GPIO 26' },
    { id: 'air', x: 926, y: 143, text: '433 MHz' },
    { id: 'ir', x: 926, y: 323, text: 'infrarouge' },
    { id: 'note1', x: 20, y: 250, text: 'Sans retour d’état : ni le volet ni la clim ne répondent.', note: true },
    { id: 'note2', x: 20, y: 270, text: 'Appairage : bouton PROG de la télécommande Somfy, volet par volet.', note: true },
    { id: 'note3', x: 20, y: 290, text: 'Protocole de la clim : à confirmer avec le modèle exact.', note: true },
  ],
}

export const VIEWS: Record<ShutterViewId, ArchView> = { hardware: HARDWARE, software: SOFTWARE }

export const VIEW_OPTIONS: { id: ShutterViewId; label: string }[] = [
  { id: 'hardware', label: HARDWARE.label },
  { id: 'software', label: SOFTWARE.label },
]
