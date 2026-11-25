#include "aircon.h"

#include <IRac.h>
#include <IRremoteESP8266.h>
#include <IRutils.h>
#include <Preferences.h>

#include "config.h"

namespace aircon {

namespace {

IRac ac(IR_PIN);
Preferences prefs;

struct Protocol {
  const char *name;
  decode_type_t type;
};

// Les familles Mitsubishi. Mitsubishi Electric (séries MSZ-…, dont la MSZ-SF35VE) : « mitsubishi_ac » d'abord. Mitsubishi Heavy (SRK-…) : heavy152 ou heavy88. La page permet d'essayer les autres si la première ne répond pas.
const Protocol PROTOCOLS[] = {
    {"mitsubishi_ac", MITSUBISHI_AC},
    {"mitsubishi112", MITSUBISHI112},
    {"heavy152", MITSUBISHI_HEAVY_152},
    {"heavy88", MITSUBISHI_HEAVY_88},
};

stdAc::opmode_t modeOf(const String &mode) {
  if (mode == "cool") return stdAc::opmode_t::kCool;
  if (mode == "heat") return stdAc::opmode_t::kHeat;
  if (mode == "dry") return stdAc::opmode_t::kDry;
  if (mode == "fan") return stdAc::opmode_t::kFan;
  return stdAc::opmode_t::kAuto;
}

stdAc::fanspeed_t fanOf(const String &fan) {
  if (fan == "min") return stdAc::fanspeed_t::kMin;
  if (fan == "low") return stdAc::fanspeed_t::kLow;
  if (fan == "medium") return stdAc::fanspeed_t::kMedium;
  if (fan == "high") return stdAc::fanspeed_t::kHigh;
  if (fan == "max") return stdAc::fanspeed_t::kMax;
  return stdAc::fanspeed_t::kAuto;
}

stdAc::swingv_t vaneOf(const String &vane) {
  if (vane == "highest") return stdAc::swingv_t::kHighest;
  if (vane == "high") return stdAc::swingv_t::kHigh;
  if (vane == "middle") return stdAc::swingv_t::kMiddle;
  if (vane == "low") return stdAc::swingv_t::kLow;
  if (vane == "lowest") return stdAc::swingv_t::kLowest;
  if (vane == "off") return stdAc::swingv_t::kOff;
  return stdAc::swingv_t::kAuto;
}

}  // namespace

void begin() { prefs.begin("aircon", false); }

bool send(const AirconState &state) {
  const Protocol *found = nullptr;
  for (const Protocol &candidate : PROTOCOLS) {
    if (state.protocol == candidate.name) found = &candidate;
  }
  if (found == nullptr || !IRac::isProtocolSupported(found->type)) return false;

  stdAc::state_t desired;
  desired.protocol = found->type;
  desired.model = -1;
  desired.power = state.power;
  desired.mode = modeOf(state.mode);
  desired.celsius = true;
  desired.degrees = state.temperature;
  desired.fanspeed = fanOf(state.fan);
  desired.swingv = vaneOf(state.vane);
  desired.swingh = stdAc::swingh_t::kOff;
  desired.quiet = false;
  desired.turbo = false;
  desired.econo = false;
  desired.light = true;
  desired.filter = false;
  desired.clean = false;
  desired.beep = false;
  desired.sleep = -1;
  desired.clock = -1;
  const bool sent = ac.sendAc(desired, nullptr);
  if (sent) {
    prefs.putBool("power", state.power);
    prefs.putString("mode", state.mode);
    prefs.putFloat("temp", state.temperature);
    prefs.putString("fan", state.fan);
    prefs.putString("vane", state.vane);
    prefs.putString("proto", state.protocol);
  }
  return sent;
}

AirconState last() {
  AirconState state;
  state.power = prefs.getBool("power", false);
  state.mode = prefs.getString("mode", state.mode);
  state.temperature = prefs.getFloat("temp", state.temperature);
  state.fan = prefs.getString("fan", state.fan);
  state.vane = prefs.getString("vane", state.vane);
  state.protocol = prefs.getString("proto", state.protocol);
  return state;
}

String protocols() {
  String names;
  for (const Protocol &candidate : PROTOCOLS) {
    if (!names.isEmpty()) names += ",";
    names += candidate.name;
  }
  return names;
}

}  // namespace aircon
