// Les broches et les réglages fixes du boîtier. Le câblage est celui de l'onglet « Volet + clim » du site de la maison.
#pragma once

#include <Arduino.h>

// Module radio CC1101 (volets Somfy RTS) : bus SPI de l'ESP32 et deux broches de signal.
constexpr uint8_t CC_SCK = 18;
constexpr uint8_t CC_MISO = 19;
constexpr uint8_t CC_MOSI = 23;
constexpr uint8_t CC_CSN = 5;
constexpr uint8_t CC_GDO0 = 13;  // émission : le signal radio entre ici
constexpr uint8_t CC_GDO2 = 12;  // réception (pas utilisée ici)

// LED infrarouge (pompe à chaleur), par un transistor.
constexpr uint8_t IR_PIN = 26;

// Les volets Somfy RTS : un « bouton » de télécommande virtuelle par volet.
constexpr uint8_t SHUTTER_COUNT = 4;
constexpr uint32_t SHUTTER_ADDRESS_BASE = 0x5A1100;  // adresse RTS du volet n = base + n (24 bits, unique par télécommande)
constexpr float DEFAULT_MHZ = 433.42f;               // fréquence Somfy RTS (433,36 chez certains boîtiers : réglable dans la page)

// Réseau.
constexpr char HOSTNAME[] = "volet-clim";         // http://volet-clim.local
constexpr char SETUP_AP[] = "volet-clim-reglage";  // Wi-Fi temporaire du premier démarrage
constexpr char OTA_PASSWORD[] = "volet-clim";      // mise à jour sans fil : à changer
