import { Button, CodeBlock, Collapsible, Notice, Page, LineChart, PieChart, SimpleTable, SpecList, Totals, TopBar } from '@house/ui'
import ClipsSection from '@/components/ClipsSection'
import SettingsSection from '@/components/SettingsSection'
import KeyForm from '@/components/KeyForm'
import MediaPanel from '@/components/MediaPanel'
import TableSection from '@/components/TableSection'
import { buildDiskChart } from '@/lib/disk'
import {
  buildContainerItems,
  buildDiskItems,
  buildEngineItems,
  buildEnvItems,
  buildImageItems,
  buildNetworkItems,
  containerDetail,
} from '@/lib/docker'
import { memoryPercent } from '@/lib/live'
import { buildCameraEnergyTotals, cameraEnergyNote } from '@/lib/cameraEnergy'
import { buildPowerTotals } from '@/lib/power'
import { buildBridgeItems, bridgeSummary } from '@/lib/hue'
import { buildLinkItems, linkSummary } from '@/lib/network'
import { buildSpecItems } from '@/lib/specs'
import { buildCpuChart, buildMemoryChart } from '@/lib/system'
import {
  BACKUP_TITLE,
  CAMERA_ENERGY_MISSING_TEXT,
  CAMERA_ENERGY_TITLE,
  CPU_CHART_LABEL,
  CPU_MEMORY_TITLE,
  MEMORY_CHART_LABEL,
  SYSTEM_MISSING_TEXT,
  DISK_CHART_LABEL,
  DISK_TITLE,
  CHECKING_TEXT,
  DATABASE_TITLE,
  LIVE_CAPACITY,
  THREAD_WORD,
  THREADS_GRID_CLASS,
  THREADS_TITLE,
  LIVE_END_LABEL,
  LIVE_START_LABEL,
  LIVE_UNIT,
  LIVE_CPU_LABEL,
  LIVE_CPU_TITLE,
  LIVE_MEMORY_LABEL,
  LIVE_MEMORY_TITLE,
  LIVE_TITLE,
  DOCKER_COMPOSE_TITLE,
  DOCKER_CONTAINERS_TITLE,
  DOCKER_DISK_TITLE,
  DOCKER_GLOBAL_TITLE,
  DOCKER_ENV_NOTE,
  DOCKER_ENV_TITLE,
  DOCKER_IMAGES_TITLE,
  DOCKER_MISSING_TEXT,
  DOCKER_NETWORKS_TITLE,
  DOCKER_NOTE,
  GRID_CLASS,
  LOADING_TEXT,
  LOCKED_TEXT,
  POWER_MISSING_TEXT,
  POWER_TITLE,
  SPECS_MISSING_TEXT,
  SPECS_TITLE,
  LOGOUT_LABEL,
  ADDRESS_COLUMNS,
  ADDRESS_ROWS,
  ADDRESSES_DETAIL,
  ADDRESSES_TITLE,
  BRIDGE_TITLE,
  NETWORK_MISSING_TEXT,
  NETWORK_TITLE,
  TABS,
  TABS_LABEL,
  TITLE,
} from './constants'
import type { AppUIProps } from './types'

const AppUI = ({ status, message, overview, power, cameraEnergy, system, specs, docker, history, network, bridge, specsOpen, loadedAt, media, refreshTick, tab, onTab, onConnect, onLogout, onOpen, onClose }: AppUIProps) => {
  const ready = status === 'ready'
  const memoryChart = system ? buildMemoryChart(system) : null
  const cpuChart = system ? buildCpuChart(system) : null
  const cpuNow = system?.cpu?.percent ?? null
  const memoryNow = system ? memoryPercent(system) : null
  const specItems = specs ? buildSpecItems(specs) : []
  const linkItems = network ? buildLinkItems(network) : []
  const diskChart = overview ? buildDiskChart(overview) : null
  const statusText = status === 'checking' ? CHECKING_TEXT : status === 'locked' ? LOCKED_TEXT : loadedAt ? `mis à jour ${loadedAt}` : ''
  return (
    <Page>
      <TopBar
        title={TITLE}
        status={message || statusText}
        tone={message ? 'error' : 'muted'}
        tabs={ready ? { label: TABS_LABEL, options: TABS, value: tab, onChange: onTab } : undefined}
        actions={ready ? <Button onClick={onLogout}>{LOGOUT_LABEL}</Button> : undefined}
      />

      {!ready ? <KeyForm busy={status === 'checking'} onSubmit={onConnect} /> : null}
      {ready ? (
        <>
          {media ? <MediaPanel media={media} onClose={onClose} /> : null}
          {tab === 'db' ? (
            overview ? (
              <Collapsible title={DATABASE_TITLE} detail={overview.database.path}>
                {overview.database.tables.map((table) => (
                  <TableSection key={table.name} table={table} refreshTick={refreshTick} onOpen={onOpen} />
                ))}
              </Collapsible>
            ) : (
              <Notice text={LOADING_TEXT} />
            )
          ) : tab === 'system' ? (
            <>
              <div className={GRID_CLASS}>
                <section>
                  <Collapsible title={SPECS_TITLE} defaultOpen={specsOpen}>
                    {specItems.length ? <SpecList items={specItems} /> : <Notice text={SPECS_MISSING_TEXT} />}
                  </Collapsible>
                </section>
                {diskChart ? (
                  <section>
                    <Collapsible title={DISK_TITLE} detail={overview?.backup.path}>
                      <PieChart slices={diskChart.slices} centerValue={diskChart.centerValue} centerLabel={diskChart.centerLabel} label={DISK_CHART_LABEL} />
                    </Collapsible>
                  </section>
                ) : null}
              </div>
              <Collapsible title={NETWORK_TITLE} detail={network ? linkSummary(network) : ''}>
                {linkItems.length ? <SpecList items={linkItems} /> : <Notice text={NETWORK_MISSING_TEXT} />}
              </Collapsible>
              {bridge?.configured ? (
                <Collapsible title={BRIDGE_TITLE} detail={bridgeSummary(bridge)}>
                  <SpecList items={buildBridgeItems(bridge)} />
                </Collapsible>
              ) : null}
              <Collapsible title={ADDRESSES_TITLE} detail={ADDRESSES_DETAIL}>
                <SimpleTable columns={ADDRESS_COLUMNS} rows={ADDRESS_ROWS} keys={ADDRESS_ROWS.map((row) => row[0])} />
              </Collapsible>
              <Collapsible title={LIVE_TITLE}>
                <div className={GRID_CLASS}>
                  <LineChart
                    title={LIVE_CPU_TITLE}
                    valueText={cpuNow === null ? '—' : `${cpuNow.toFixed(0)} %`}
                    label={LIVE_CPU_LABEL}
                    tone="orange"
                    max={100}
                    unit={LIVE_UNIT}
                    startLabel={LIVE_START_LABEL}
                    endLabel={LIVE_END_LABEL}
                    capacity={LIVE_CAPACITY}
                    values={history.cpu}
                  />
                  <LineChart
                    title={LIVE_MEMORY_TITLE}
                    valueText={memoryNow === null ? '—' : `${memoryNow.toFixed(0)} %`}
                    label={LIVE_MEMORY_LABEL}
                    tone="accent"
                    max={100}
                    unit={LIVE_UNIT}
                    startLabel={LIVE_START_LABEL}
                    endLabel={LIVE_END_LABEL}
                    capacity={LIVE_CAPACITY}
                    values={history.memory}
                  />
                </div>
              </Collapsible>
              <Collapsible title={THREADS_TITLE} defaultOpen={false}>
                <div className={THREADS_GRID_CLASS}>
                  {history.threads.map((values, index) => (
                    <LineChart
                      key={index}
                      title={`${THREAD_WORD} ${index}`}
                      valueText={values.length === 0 ? '—' : `${values[values.length - 1].toFixed(0)} %`}
                      label={`${LIVE_CPU_LABEL} · ${THREAD_WORD.toLowerCase()} ${index}`}
                      tone="orange"
                      max={100}
                      unit={LIVE_UNIT}
                      startLabel={LIVE_START_LABEL}
                      endLabel={LIVE_END_LABEL}
                      capacity={LIVE_CAPACITY}
                      values={values}
                    />
                  ))}
                </div>
              </Collapsible>
              <Collapsible title={CPU_MEMORY_TITLE}>
                <div className={GRID_CLASS}>
                  {cpuChart ? (
                    <PieChart slices={cpuChart.slices} centerValue={cpuChart.centerValue} centerLabel={cpuChart.centerLabel} label={CPU_CHART_LABEL} />
                  ) : (
                    <Notice text={SYSTEM_MISSING_TEXT} />
                  )}
                  {memoryChart ? (
                    <PieChart slices={memoryChart.slices} centerValue={memoryChart.centerValue} centerLabel={memoryChart.centerLabel} label={MEMORY_CHART_LABEL} />
                  ) : (
                    <Notice text={SYSTEM_MISSING_TEXT} />
                  )}
                </div>
              </Collapsible>
              <Collapsible title={POWER_TITLE}>
                {power ? <Totals totals={buildPowerTotals(power)} /> : <Notice text={POWER_MISSING_TEXT} />}
              </Collapsible>
              <Collapsible title={CAMERA_ENERGY_TITLE}>
                {cameraEnergy ? (
                  <>
                    <Totals totals={buildCameraEnergyTotals(cameraEnergy)} />
                    <Notice text={cameraEnergyNote(cameraEnergy)} />
                  </>
                ) : (
                  <Notice text={CAMERA_ENERGY_MISSING_TEXT} />
                )}
              </Collapsible>
            </>
          ) : tab === 'docker' ? (
            <>
              {docker && !docker.serviceAvailable ? <Notice text={DOCKER_MISSING_TEXT} /> : null}
              {docker?.global ? (
                <Collapsible title={DOCKER_GLOBAL_TITLE}>
                  <SpecList items={buildEngineItems(docker.global)} />
                  <div className={GRID_CLASS}>
                    <section>
                      <Collapsible title={DOCKER_IMAGES_TITLE}>
                        <SpecList items={buildImageItems(docker.global)} />
                      </Collapsible>
                    </section>
                    <section>
                      <Collapsible title={DOCKER_NETWORKS_TITLE}>
                        <SpecList items={buildNetworkItems(docker.global)} />
                      </Collapsible>
                    </section>
                    <section>
                      <Collapsible title={DOCKER_DISK_TITLE}>
                        <SpecList items={buildDiskItems(docker.global)} />
                      </Collapsible>
                    </section>
                  </div>
                  <Collapsible title={DOCKER_ENV_TITLE} detail=".env">
                    <SpecList items={buildEnvItems(docker.global)} />
                    <Notice text={DOCKER_ENV_NOTE} />
                  </Collapsible>
                </Collapsible>
              ) : null}
              {docker?.compose ? (
                <Collapsible title={DOCKER_COMPOSE_TITLE}>
                  <CodeBlock code={docker.compose} label={DOCKER_COMPOSE_TITLE} />
                </Collapsible>
              ) : null}
              {docker?.serviceAvailable ? (
                <Collapsible title={DOCKER_CONTAINERS_TITLE}>
                  {docker.containers.map((container) => (
                    <Collapsible key={container.name} title={container.name} detail={containerDetail(container)}>
                      <SpecList items={buildContainerItems(container)} />
                    </Collapsible>
                  ))}
                </Collapsible>
              ) : null}
              <Notice text={DOCKER_NOTE} />
            </>
          ) : tab === 'settings' ? (
            <SettingsSection />
          ) : (
            <Collapsible title={BACKUP_TITLE} detail={overview?.backup.path}>
              <ClipsSection refreshTick={refreshTick} onOpen={onOpen} />
            </Collapsible>
          )}
        </>
      ) : null}
    </Page>
  )
}

export default AppUI
