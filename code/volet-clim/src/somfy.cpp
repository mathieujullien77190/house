#include "somfy.h"

#include <ELECHOUSE_CC1101_SRC_DRV.h>
#include <Preferences.h>

#include "config.h"

namespace somfy {

namespace {

constexpr uint16_t SYMBOL = 640;  // µs
Preferences prefs;
bool ready = false;

String codeKey(uint8_t shutter) { return "rc" + String(shutter); }

/** La trame de 7 octets : clé, bouton et somme de contrôle, code tournant, adresse ; puis le XOR en chaîne. */
void buildFrame(uint8_t *frame, SomfyButton button, uint16_t code, uint32_t address) {
  frame[0] = 0xA7;
  frame[1] = static_cast<uint8_t>(button) << 4;
  frame[2] = code >> 8;
  frame[3] = code & 0xFF;
  frame[4] = (address >> 16) & 0xFF;
  frame[5] = (address >> 8) & 0xFF;
  frame[6] = address & 0xFF;
  uint8_t checksum = 0;
  for (uint8_t i = 0; i < 7; i++) checksum ^= frame[i] ^ (frame[i] >> 4);
  frame[1] |= checksum & 0x0F;
  for (uint8_t i = 1; i < 7; i++) frame[i] ^= frame[i - 1];
}

inline void level(bool high) { digitalWrite(CC_GDO0, high ? HIGH : LOW); }

/** Une trame sur l'air. `sync` : 2 pour la première (avec réveil), 7 pour les répétitions. */
void sendFrame(const uint8_t *frame, uint8_t sync) {
  if (sync == 2) {
    // Impulsion de réveil.
    level(true);
    delayMicroseconds(9415);
    level(false);
    delayMicroseconds(65535);
    delayMicroseconds(24030);
  }
  // Synchronisation matérielle.
  for (uint8_t i = 0; i < sync; i++) {
    level(true);
    delayMicroseconds(4 * SYMBOL);
    level(false);
    delayMicroseconds(4 * SYMBOL);
  }
  // Synchronisation logicielle.
  level(true);
  delayMicroseconds(4550);
  level(false);
  delayMicroseconds(SYMBOL);
  // Les 56 bits en Manchester : un 1 descend puis monte, un 0 monte puis descend.
  for (uint8_t i = 0; i < 56; i++) {
    const bool bit = (frame[i / 8] >> (7 - (i % 8))) & 1;
    level(!bit);
    delayMicroseconds(SYMBOL);
    level(bit);
    delayMicroseconds(SYMBOL);
  }
  level(false);
  delayMicroseconds(30415);  // silence entre deux trames
}

}  // namespace

bool begin(float mhz) {
  prefs.begin("somfy", false);
  pinMode(CC_GDO0, OUTPUT);
  level(false);
  ELECHOUSE_cc1101.setSpiPin(CC_SCK, CC_MISO, CC_MOSI, CC_CSN);
  ELECHOUSE_cc1101.setGDO(CC_GDO0, CC_GDO2);
  ready = ELECHOUSE_cc1101.getCC1101();
  if (!ready) return false;
  ELECHOUSE_cc1101.setCCMode(0);  // mode « série asynchrone » : le signal radio est celui de la broche GDO0
  ELECHOUSE_cc1101.Init();
  ELECHOUSE_cc1101.setModulation(2);  // tout ou rien (OOK)
  ELECHOUSE_cc1101.setMHZ(mhz);
  ELECHOUSE_cc1101.setPA(10);  // puissance maximale
  ELECHOUSE_cc1101.setSidle();
  return true;
}

void setFrequency(float mhz) {
  if (ready) ELECHOUSE_cc1101.setMHZ(mhz);
}

bool radioReady() { return ready; }

uint16_t rollingCode(uint8_t shutter) { return prefs.getUShort(codeKey(shutter).c_str(), 1); }

void setRollingCode(uint8_t shutter, uint16_t code) { prefs.putUShort(codeKey(shutter).c_str(), code); }

void send(uint8_t shutter, SomfyButton button) {
  if (!ready || shutter >= SHUTTER_COUNT) return;
  // Le code avance avant l'envoi et est gardé tout de suite : un volet qui entend deux fois le même code l'ignore.
  const uint16_t code = rollingCode(shutter) + 1;
  setRollingCode(shutter, code);
  uint8_t frame[7];
  buildFrame(frame, button, code, SHUTTER_ADDRESS_BASE + shutter);
  ELECHOUSE_cc1101.SetTx();
  sendFrame(frame, 2);
  for (uint8_t i = 0; i < 2; i++) sendFrame(frame, 7);
  ELECHOUSE_cc1101.setSidle();
}

}  // namespace somfy
