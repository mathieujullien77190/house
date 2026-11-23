// Somfy RTS : la télécommande virtuelle. Protocole décrit par Pushstack (« Somfy RTS protocol ») : trame de 7 octets, chiffrée par un
// XOR en chaîne, code tournant de 16 bits, modulation tout ou rien (OOK) en Manchester à 640 µs par symbole.
#pragma once

#include <Arduino.h>

enum class SomfyButton : uint8_t { My = 0x1, Up = 0x2, Down = 0x4, Prog = 0x8 };

namespace somfy {

/** Allume le CC1101 (fréquence en MHz). Faux si le module ne répond pas sur le bus SPI. */
bool begin(float mhz);

/** Change la fréquence (MHz) sans redémarrer. */
void setFrequency(float mhz);

/** Vrai si le module a répondu au démarrage. */
bool radioReady();

/** Envoie un ordre au volet `shutter` (0 à SHUTTER_COUNT - 1) : trame, puis deux répétitions. Le code tournant est avancé et gardé en flash. */
void send(uint8_t shutter, SomfyButton button);

/** Le code tournant courant d'un volet (pour la page). */
uint16_t rollingCode(uint8_t shutter);

/** Remet le code tournant d'un volet à une valeur (après un reflash complet qui l'aurait effacé). */
void setRollingCode(uint8_t shutter, uint16_t code);

}  // namespace somfy
