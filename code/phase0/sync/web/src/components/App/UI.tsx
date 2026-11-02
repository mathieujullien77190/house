import { Button, Notice, Page, PageHeader, PieChart, SectionTitle, Tabs, Totals } from '@house/ui'
import ClipsSection from '@/components/ClipsSection'
import KeyForm from '@/components/KeyForm'
import MediaPanel from '@/components/MediaPanel'
import TableSection from '@/components/TableSection'
import { buildDiskChart } from '@/lib/disk'
import { buildPowerTotals } from '@/lib/power'
import { buildCpuChart, buildMemoryChart } from '@/lib/system'
import { buildTotals } from '@/lib/totals'
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
  INTRO,
  LOADING_TEXT,
  LOCKED_TEXT,
  POWER_MISSING_TEXT,
  POWER_NOTE,
  POWER_TITLE,
  LOGOUT_LABEL,
  REFRESH_LABEL,
  REFRESH_NOTE,
  TABS,
  TABS_CLASS,
  TABS_LABEL,
  TITLE,
} from './constants'
import type { AppUIProps } from './types'

const AppUI = ({ status, message, overview, power, system, loadedAt, media, refreshTick, tab, onTab, onConnect, onLogout, onRefresh, onOpen, onClose }: AppUIProps) => {
  const ready = status === 'ready'
  const memoryChart = system ? buildMemoryChart(system) : null
  const cpuChart = system ? buildCpuChart(system) : null
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
          <Totals totals={buildTotals(overview)} />
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
              <SectionTitle text={MEMORY_TITLE} />
              {memoryChart ? (
                <PieChart slices={memoryChart.slices} centerValue={memoryChart.centerValue} centerLabel={memoryChart.centerLabel} label={MEMORY_CHART_LABEL} />
              ) : (
                <Notice text={SYSTEM_MISSING_TEXT} />
              )}
              <SectionTitle text={CPU_TITLE} />
              {cpuChart ? (
                <PieChart slices={cpuChart.slices} centerValue={cpuChart.centerValue} centerLabel={cpuChart.centerLabel} label={CPU_CHART_LABEL} />
              ) : (
                <Notice text={SYSTEM_MISSING_TEXT} />
              )}
              <Notice text={SYSTEM_NOTE} />
            </>
          ) : tab === 'power' ? (
            <>
              <SectionTitle text={POWER_TITLE} />
              {power ? <Totals totals={buildPowerTotals(power)} /> : <Notice text={POWER_MISSING_TEXT} />}
              <Notice text={POWER_NOTE} />
            </>
          ) : (
            <>
              {diskChart ? (
                <>
                  <SectionTitle text={DISK_TITLE} detail={overview.backup.path} />
                  <PieChart slices={diskChart.slices} centerValue={diskChart.centerValue} centerLabel={diskChart.centerLabel} label={DISK_CHART_LABEL} />
                </>
              ) : null}
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
