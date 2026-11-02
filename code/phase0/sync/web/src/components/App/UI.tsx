import { Button, CodeBlock, Collapsible, Notice, Page, LineChart, PageHeader, PieChart, SectionTitle, SpecList, Tabs, Totals } from '@house/ui'
import ClipsSection from '@/components/ClipsSection'
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
import { buildPowerTotals } from '@/lib/power'
import { buildSpecItems } from '@/lib/specs'
import { buildCpuChart, buildMemoryChart } from '@/lib/system'
import {
  BACKUP_TITLE,
  CPU_CHART_LABEL,
  CPU_TITLE,
  MEMORY_CHART_LABEL,
  MEMORY_TITLE,
  SYSTEM_MISSING_TEXT,
  SYSTEM_NOTE,
  DISK_CHART_LABEL,
  DISK_TITLE,
  CHECKING_TEXT,
  DATABASE_TITLE,
  LIVE_CAPACITY,
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
  INTRO,
  LOADING_TEXT,
  LOCKED_TEXT,
  POWER_MISSING_TEXT,
  POWER_NOTE,
  POWER_TITLE,
  SPECS_MISSING_TEXT,
  SPECS_TITLE,
  LOGOUT_LABEL,
  REFRESH_LABEL,
  REFRESH_NOTE,
  TABS,
  TABS_CLASS,
  TABS_LABEL,
  TITLE,
} from './constants'
import type { AppUIProps } from './types'

const AppUI = ({ status, message, overview, power, system, specs, docker, history, loadedAt, media, refreshTick, tab, onTab, onConnect, onLogout, onRefresh, onOpen, onClose }: AppUIProps) => {
  const ready = status === 'ready'
  const memoryChart = system ? buildMemoryChart(system) : null
  const cpuChart = system ? buildCpuChart(system) : null
  const cpuNow = system?.cpu?.percent ?? null
  const memoryNow = system ? memoryPercent(system) : null
  const specItems = specs ? buildSpecItems(specs) : []
  const diskChart = overview ? buildDiskChart(overview) : null
  const statusText = status === 'checking' ? CHECKING_TEXT : status === 'locked' ? LOCKED_TEXT : `${loadedAt ? `mis à jour ${loadedAt} · ` : ''}${REFRESH_NOTE}`
  return (
    <Page>
      <PageHeader
        title={TITLE}
        status={message || statusText}
        tone={message ? 'error' : 'muted'}
        actions={
          ready ? (
            <>
              <Button onClick={onRefresh}>{REFRESH_LABEL}</Button>
              <Button onClick={onLogout}>{LOGOUT_LABEL}</Button>
            </>
          ) : null
        }
      />
      <Notice text={INTRO} />

      {!ready ? <KeyForm busy={status === 'checking'} onSubmit={onConnect} /> : null}
      {ready && !overview ? <Notice text={LOADING_TEXT} /> : null}

      {ready && overview ? (
        <>
          <div className={TABS_CLASS}>
            <Tabs label={TABS_LABEL} options={TABS} value={tab} onChange={onTab} />
          </div>
          {media ? <MediaPanel media={media} onClose={onClose} /> : null}
          {tab === 'db' ? (
            <>
              <SectionTitle text={DATABASE_TITLE} detail={overview.database.path} />
              {overview.database.tables.map((table) => (
                <TableSection key={table.name} table={table} refreshTick={refreshTick} onOpen={onOpen} />
              ))}
            </>
          ) : tab === 'system' ? (
            <>
              <div className={GRID_CLASS}>
                <section>
                  <SectionTitle text={SPECS_TITLE} />
                  {specItems.length ? <SpecList items={specItems} /> : <Notice text={SPECS_MISSING_TEXT} />}
                </section>
                {diskChart ? (
                  <section>
                    <SectionTitle text={DISK_TITLE} detail={overview.backup.path} />
                    <PieChart slices={diskChart.slices} centerValue={diskChart.centerValue} centerLabel={diskChart.centerLabel} label={DISK_CHART_LABEL} />
                  </section>
                ) : null}
              </div>
              <SectionTitle text={LIVE_TITLE} />
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
              <div className={GRID_CLASS}>
                <section>
                  <SectionTitle text={CPU_TITLE} />
                  {cpuChart ? (
                    <PieChart slices={cpuChart.slices} centerValue={cpuChart.centerValue} centerLabel={cpuChart.centerLabel} label={CPU_CHART_LABEL} />
                  ) : (
                    <Notice text={SYSTEM_MISSING_TEXT} />
                  )}
                </section>
                <section>
                  <SectionTitle text={MEMORY_TITLE} />
                  {memoryChart ? (
                    <PieChart slices={memoryChart.slices} centerValue={memoryChart.centerValue} centerLabel={memoryChart.centerLabel} label={MEMORY_CHART_LABEL} />
                  ) : (
                    <Notice text={SYSTEM_MISSING_TEXT} />
                  )}
                </section>
              </div>
              <SectionTitle text={POWER_TITLE} />
              {power ? <Totals totals={buildPowerTotals(power)} /> : <Notice text={POWER_MISSING_TEXT} />}
              <Notice text={SYSTEM_NOTE} />
              <Notice text={POWER_NOTE} />
            </>
          ) : tab === 'docker' ? (
            <>
              {docker && !docker.serviceAvailable ? <Notice text={DOCKER_MISSING_TEXT} /> : null}
              {docker?.global ? (
                <Collapsible title={DOCKER_GLOBAL_TITLE}>
                  <SpecList items={buildEngineItems(docker.global)} />
                  <div className={GRID_CLASS}>
                    <section>
                      <SectionTitle text={DOCKER_IMAGES_TITLE} />
                      <SpecList items={buildImageItems(docker.global)} />
                    </section>
                    <section>
                      <SectionTitle text={DOCKER_NETWORKS_TITLE} />
                      <SpecList items={buildNetworkItems(docker.global)} />
                    </section>
                    <section>
                      <SectionTitle text={DOCKER_DISK_TITLE} />
                      <SpecList items={buildDiskItems(docker.global)} />
                    </section>
                  </div>
                  <SectionTitle text={DOCKER_ENV_TITLE} detail=".env" />
                  <SpecList items={buildEnvItems(docker.global)} />
                  <Notice text={DOCKER_ENV_NOTE} />
                </Collapsible>
              ) : null}
              {docker?.compose ? (
                <Collapsible title={DOCKER_COMPOSE_TITLE}>
                  <CodeBlock code={docker.compose} label={DOCKER_COMPOSE_TITLE} />
                </Collapsible>
              ) : null}
              {docker?.serviceAvailable ? (
                <>
                  <SectionTitle text={DOCKER_CONTAINERS_TITLE} />
                  {docker.containers.map((container) => (
                    <section key={container.name}>
                      <SectionTitle text={container.name} detail={containerDetail(container)} />
                      <SpecList items={buildContainerItems(container)} />
                    </section>
                  ))}
                </>
              ) : null}
              <Notice text={DOCKER_NOTE} />
            </>
          ) : (
            <>
              <SectionTitle text={BACKUP_TITLE} detail={overview.backup.path} />
              <ClipsSection refreshTick={refreshTick} onOpen={onOpen} />
            </>
          )}
        </>
      ) : null}
    </Page>
  )
}

export default AppUI
