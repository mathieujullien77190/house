import { useState } from 'react'
import { Button, SimpleTable, SpecList, StatusDot, StatusFrame } from '@house/ui'
import DeviceIcon from '@/components/DeviceIcon'
import {
  KNOB_OFF_CLASS,
  KNOB_ON_CLASS,
  TOGGLE_OFF_CLASS,
  TOGGLE_ON_CLASS,
  TOGGLE_TEXT_CLASS,
  TOGGLE_WRAP_CLASS,
} from '@/components/AcPanel/constants'
import {
  BLOCK_CLASS,
  BLOCK_TITLE_CLASS,
  DEVICES_TITLE,
  OFFLINE_LABEL,
  ONLINE_LABEL,
  UNKNOWN,
  STATE_TITLE,
  STACK_CLASS,
  WIFI_HELP,
  WIFI_TITLE,
  COLUMNS,
  COMPACT_SCROLL_CLASS,
  SCROLL_CLASS,
  CONFIRM_CLASS,
  CONFIRM_NO,
  CONFIRM_TEXT,
  CONFIRM_YES,
  ERROR_CLASS,
  HEAD_CLASS,
  NO_DEVICE_TEXT,
  SEND_ERROR_TEXT,
  SPEC_LABELS,
  STATE_CLASS,
  UNREACHABLE_TEXT,
  WIFI_BUSY_TEXT,
  WIFI_OFF_STATE,
  WIFI_OFF_TEXT,
  WIFI_ON_STATE,
  WIFI_ON_TEXT,
  WIFI_SWITCH_LABEL,
} from './constants'
import { listedDevices, leaseText, formatRate, formatUptime, lineText } from './helpers'
import type { BoxBlockProps } from './types'

/** Le bloc de la Freebox : nom et interrupteur du WiFi (couper demande une confirmation), état de la ligne, appareils connectés puis hors ligne. Le même dans l'onglet Box et dans l'aperçu de la carte. */
const BoxBlock = ({ box, busy, failed, compact = false, onWifi, wifiExtra }: BoxBlockProps) => {
  const [confirming, setConfirming] = useState(false)
  const wifi = box.wifi
  const listed = listedDevices(box.devices)
  const active = listed
  const table = (devices: typeof active) => (
    <div className={compact ? COMPACT_SCROLL_CLASS : SCROLL_CLASS}>
      <SimpleTable
        columns={COLUMNS}
        rows={devices.map((device) => [
          <StatusDot key="state" state={device.active ? 'on' : 'missing'} label={device.active ? ONLINE_LABEL : OFFLINE_LABEL} />,
          device.name,
          device.ip ?? UNKNOWN,
          leaseText(device.staticLease),
          <DeviceIcon key="type" device={device} />,
        ])}
        keys={devices.map((device) => device.mac || device.name)}
      />
    </div>
  )
  const tone = box.reachable ? 'ok' : 'off'
  return (
    <div className={STACK_CLASS}>
      <StatusFrame tone={tone}>
        <div className={BLOCK_CLASS}>
          <span className={BLOCK_TITLE_CLASS}>{box.model ? `${STATE_TITLE} · ${box.model}` : STATE_TITLE}</span>
          {box.reachable ? (
            <SpecList
              items={[
                {
                  id: 'line',
                  label: SPEC_LABELS.line,
                  value: lineText(box.connection),
                },
                {
                  id: 'address',
                  label: SPEC_LABELS.address,
                  value: box.connection?.ipv4 ?? '–',
                },
                {
                  id: 'down',
                  label: SPEC_LABELS.down,
                  value: formatRate(box.connection?.rateDown ?? null),
                },
                {
                  id: 'up',
                  label: SPEC_LABELS.up,
                  value: formatRate(box.connection?.rateUp ?? null),
                },
                {
                  id: 'uptime',
                  label: SPEC_LABELS.uptime,
                  value: formatUptime(box.uptime),
                },
                ...(compact
                  ? []
                  : [
                      {
                        id: 'firmware',
                        label: SPEC_LABELS.firmware,
                        value: box.firmware ?? '–',
                      },
                    ]),
              ]}
            />
          ) : (
            <span className={ERROR_CLASS}>{UNREACHABLE_TEXT}</span>
          )}
        </div>
      </StatusFrame>
      {box.reachable && wifi ? (
        <StatusFrame tone="ok">
          <div className={BLOCK_CLASS}>
            <div className={HEAD_CLASS}>
              <span className={BLOCK_TITLE_CLASS}>{WIFI_TITLE}</span>
              <div className={TOGGLE_WRAP_CLASS}>
                <span className={TOGGLE_TEXT_CLASS}>{wifi.enabled ? WIFI_ON_TEXT : WIFI_OFF_TEXT}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={wifi.enabled}
                  aria-label={WIFI_SWITCH_LABEL}
                  className={wifi.enabled ? TOGGLE_ON_CLASS : TOGGLE_OFF_CLASS}
                  disabled={busy}
                  onClick={() => (wifi.enabled ? setConfirming(true) : onWifi(true))}
                >
                  <span className={wifi.enabled ? KNOB_ON_CLASS : KNOB_OFF_CLASS} />
                </button>
              </div>
            </div>
            <span className={STATE_CLASS}>{busy ? WIFI_BUSY_TEXT : wifi.enabled ? WIFI_ON_STATE : WIFI_OFF_STATE}</span>
            <span className={STATE_CLASS}>{WIFI_HELP}</span>
            {confirming ? (
              <div className={CONFIRM_CLASS}>
                <span>{CONFIRM_TEXT}</span>
                <Button
                  variant="danger"
                  onClick={() => {
                    setConfirming(false)
                    onWifi(false)
                  }}
                >
                  {CONFIRM_YES}
                </Button>
                <Button onClick={() => setConfirming(false)}>{CONFIRM_NO}</Button>
              </div>
            ) : null}
            {failed ? <span className={ERROR_CLASS}>{SEND_ERROR_TEXT}</span> : null}
            {wifiExtra}
          </div>
        </StatusFrame>
      ) : null}
      {box.reachable ? (
        <StatusFrame tone="ok">
          <div className={BLOCK_CLASS}>
            <span
              className={BLOCK_TITLE_CLASS}
            >{`${DEVICES_TITLE} (${listed.filter((device) => device.active).length} / ${listed.length})`}</span>
            {active.length > 0 ? table(active) : <span className={STATE_CLASS}>{NO_DEVICE_TEXT}</span>}
          </div>
        </StatusFrame>
      ) : null}
    </div>
  )
}

export default BoxBlock
