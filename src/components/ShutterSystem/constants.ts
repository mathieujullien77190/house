import type { ArchView } from '@/components/ArchDiagram'
import type { ShutterViewId } from './types'

export const TITLE = 'Matériel et logiciel'
export const VIEW_GROUP_LABEL = 'Vue du schéma des volets'
export const DEFAULT_VIEW: ShutterViewId = 'hardware'

const HARDWARE: ArchView = {
  id: 'shutters-hardware',
  label: 'Matériel',
  intro: [
    'Ce qui se branche : une prise de 230 V alimente un chargeur USB, dont le câble USB-C alimente l’ESP32 (5 V). L’ESP32 donne le 3,3 V au module radio CC1101, relié par 8 fils. Le CC1101 parle en radio 433 MHz aux moteurs Somfy RTS, comme la télécommande qu’on a déjà.',
    'L’ESP32 se pose près des volets et rejoint la box en Wi-Fi 2,4 GHz. Le mini PC, branché à la box, lui envoie les ordres par le réseau de la maison. La télécommande WW001C est en pointillés : son code n’est pas encore identifié.',
  ],
  ariaLabel:
    'Vue matériel des volets : une prise murale alimente un chargeur USB, relié en USB-C à une carte ESP32 qui alimente en 3,3 V un module radio CC1101 par 8 fils ; le CC1101 parle en radio 433 MHz aux moteurs Somfy RTS des volets, comme la télécommande Somfy ; l’ESP32 rejoint la box en Wi-Fi et le mini PC est relié à la box en RJ45',
  viewBox: '0 0 1000 435',
  panels: [
    { id: 'power', x: 20, y: 20, w: 190, h: 250, tone: 'panel', title: 'Alimentation' },
    { id: 'radio', x: 250, y: 20, w: 330, h: 250, tone: 'panel', title: 'Module radio' },
    { id: 'shutters', x: 620, y: 20, w: 360, h: 250, tone: 'panel', title: 'Volets' },
    { id: 'network', x: 20, y: 295, w: 960, h: 125, tone: 'panel', title: 'Réseau de la maison' },
  ],
  boxes: [
    { id: 'outlet', x: 35, y: 75, w: 160, h: 60, tone: 'plain', title: 'Prise murale', lines: ['230 V'] },
    { id: 'charger', x: 35, y: 170, w: 160, h: 80, tone: 'plain', title: 'Chargeur USB', lines: ['5 V · 1 A', 'chargeur de téléphone'] },
    { id: 'esp32', x: 270, y: 75, w: 140, h: 110, tone: 'green', title: 'ESP32 WROOM-32', lines: ['Wi-Fi 2,4 GHz', 'ESPSomfy-RTS', 'USB-C · 5 V'] },
    { id: 'cc1101', x: 450, y: 75, w: 110, h: 110, tone: 'green', title: 'CC1101', lines: ['433 MHz', 'antenne SMA', '3,3 V (ESP32)'] },
    { id: 'motor', x: 640, y: 75, w: 150, h: 80, tone: 'plain', title: 'Moteur du volet', lines: ['Somfy RTS', '433,42 MHz'] },
    { id: 'remote', x: 810, y: 75, w: 150, h: 80, tone: 'plain', title: 'Télécommande', lines: ['Somfy RTS', 'déjà là'] },
    { id: 'ww001c', x: 640, y: 180, w: 320, h: 60, tone: 'dashed', title: 'Télécommande WW001C', lines: ['433,92 MHz · code à identifier'] },
    { id: 'mini', x: 60, y: 335, w: 190, h: 70, tone: 'plain', title: 'Mini PC', lines: ['House API', 'service « volets » à écrire'] },
    { id: 'box', x: 420, y: 335, w: 160, h: 70, tone: 'plain', title: 'Box', lines: ['Wi-Fi 2,4 GHz', 'internet'] },
  ],
  arrows: [
    { id: 'outlet-charger', d: 'M115 137 V168' },
    { id: 'usb', d: 'M197 210 H232 V130 H268' },
    { id: 'wires', d: 'M412 130 H448', both: true },
    { id: 'radio', d: 'M562 130 H638', both: true, dashed: true },
    { id: 'remote', d: 'M808 115 H792', dashed: true },
    { id: 'wifi', d: 'M340 187 V310 H500 V333', both: true, dashed: true },
    { id: 'rj45', d: 'M252 370 H418', both: true },
  ],
  labels: [
    { id: 'volts', x: 122, y: 158, text: '230 V' },
    { id: 'usb', x: 228, y: 160, text: 'USB-C', anchor: 'end' },
    { id: 'wires', x: 430, y: 118, text: '8 fils', anchor: 'middle' },
    { id: 'radio', x: 600, y: 122, text: '433 MHz', anchor: 'middle' },
    { id: 'wifi', x: 352, y: 302, text: 'Wi-Fi' },
    { id: 'rj45', x: 335, y: 362, text: 'RJ45', anchor: 'middle' },
  ],
}

const SOFTWARE: ArchView = {
  id: 'shutters-software',
  label: 'Logiciel',
  intro: [
    'L’utilisateur ouvre l’onglet Volet de la WebApp (à écrire) : monter, descendre ou stop. La WebApp appelle House API, qui aura un service « volets » sur le modèle de /hue : il vérifie la clé, puis envoie l’ordre à l’ESP32 par le Wi-Fi.',
    'L’ESP32 fait tourner ESPSomfy-RTS, un firmware tout fait : une page web et une API qui reçoivent l’ordre, un moteur Somfy RTS qui fabrique le signal d’une télécommande (un volet appairé = une télécommande de plus, avec un code tournant gardé en mémoire flash) et un pilote du CC1101 par le bus SPI. Le CC1101 émet en radio 433,42 MHz ; les moteurs écoutent.',
    'Le Somfy RTS est à sens unique : le volet ne répond pas, donc House ne sait pas s’il est ouvert ou fermé, même quand on le commande avec la télécommande.',
  ],
  ariaLabel:
    'Vue logiciel des volets : la WebApp appelle House API, dont le service volets envoie l’ordre en Wi-Fi à l’interface web et API du firmware ESPSomfy-RTS de l’ESP32 ; son moteur Somfy RTS fabrique le signal d’une télécommande, son pilote radio le confie au CC1101 par le bus SPI, et le CC1101 l’émet en radio 433 MHz vers les moteurs des volets',
  viewBox: '0 0 1000 435',
  panels: [
    { id: 'client', x: 20, y: 20, w: 180, h: 200, tone: 'panel', title: 'Navigateur' },
    { id: 'pc', x: 240, y: 20, w: 260, h: 200, tone: 'panel', title: 'Mini PC' },
    { id: 'esp', x: 540, y: 20, w: 280, h: 400, tone: 'warm', title: 'ESP32 · ESPSomfy-RTS' },
    { id: 'radio', x: 860, y: 20, w: 120, h: 400, tone: 'panel', title: 'Radio' },
  ],
  boxes: [
    { id: 'webapp', x: 35, y: 80, w: 150, h: 90, tone: 'green', title: 'WebApp', lines: ['onglet Volet', 'haut · bas · stop'] },
    { id: 'api', x: 255, y: 75, w: 230, h: 110, tone: 'green', title: 'House API', lines: ['service « volets » (à écrire)', 'clé puis cookie de session', 'envoie les ordres à l’ESP32'] },
    { id: 'esp-api', x: 555, y: 70, w: 250, h: 70, tone: 'plain', title: 'Interface web et API', lines: ['reçoit les ordres', 'page de réglage'] },
    { id: 'somfy', x: 555, y: 170, w: 250, h: 100, tone: 'plain', title: 'Moteur Somfy RTS', lines: ['un volet = une télécommande', 'code tournant gardé en flash', 'haut · bas · stop'] },
    { id: 'driver', x: 555, y: 300, w: 250, h: 90, tone: 'plain', title: 'Pilote radio CC1101', lines: ['SPI : G18 · G19 · G23 · G5', 'GDO0 (G13) : émission', 'GDO2 (G12) : réception'] },
    { id: 'cc1101', x: 870, y: 70, w: 100, h: 90, tone: 'plain', title: 'CC1101', lines: ['433,42 MHz', 'antenne'] },
    { id: 'motors', x: 870, y: 250, w: 100, h: 110, tone: 'plain', title: 'Volets', lines: ['moteurs', 'Somfy RTS'] },
  ],
  arrows: [
    { id: 'http', d: 'M187 125 H253' },
    { id: 'wifi', d: 'M487 130 H553' },
    { id: 'order', d: 'M680 142 V168' },
    { id: 'signal', d: 'M680 272 V298' },
    { id: 'spi', d: 'M807 345 H840 V115 H868' },
    { id: 'air', d: 'M920 162 V248', dashed: true },
  ],
  labels: [
    { id: 'http', x: 220, y: 117, text: 'HTTPS', anchor: 'middle' },
    { id: 'wifi', x: 520, y: 122, text: 'Wi-Fi', anchor: 'middle' },
    { id: 'spi', x: 846, y: 230, text: 'SPI' },
    { id: 'air', x: 928, y: 210, text: '433 MHz' },
    { id: 'note1', x: 20, y: 250, text: 'Sans retour d’état : House ne sait pas si le volet est ouvert ou fermé.', note: true },
    { id: 'note2', x: 20, y: 270, text: 'Appairage : bouton PROG de la télécommande Somfy, volet par volet.', note: true },
    { id: 'note3', x: 20, y: 290, text: 'L’alimentation et les 8 fils sont dans le schéma matériel.', note: true },
  ],
}

export const VIEWS: Record<ShutterViewId, ArchView> = { hardware: HARDWARE, software: SOFTWARE }

export const VIEW_OPTIONS: { id: ShutterViewId; label: string }[] = [
  { id: 'hardware', label: HARDWARE.label },
  { id: 'software', label: SOFTWARE.label },
]
