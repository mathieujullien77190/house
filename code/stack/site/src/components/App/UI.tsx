import Card from '@/components/UI/Card'
import SegmentedControl from '@/components/UI/SegmentedControl'
import { TABS_LABEL } from './constants'
import type { AppUIProps } from './types'

const AppUI = ({ title, subtitle, tabs, tab, onTab, domain, detail, notice, hint, diagram, legend, info, architecture, mains, pricing, sheet }: AppUIProps) => {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-baseline gap-x-4 gap-y-0.5 px-4 pb-1 pt-3">
          <h1 className="m-0 text-xl font-bold">{title}</h1>
          <p className="m-0 text-[0.9rem] text-muted">{subtitle}</p>
        </div>
        <div className="mx-auto max-w-[1280px] overflow-x-auto px-4 pb-3 pt-1">
          <SegmentedControl label={TABS_LABEL} options={tabs} value={tab} onChange={onTab} />
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-4 pb-28 pt-5">
        {domain}

        {detail && <div className="mt-4">{detail}</div>}

        {tab === 'cameras' && (
          <>
            <div className="mt-4 grid grid-cols-1 items-start gap-4 min-[901px]:grid-cols-[1fr_320px]">
              <Card as="section">
                {notice && (
                  <p className="mb-2 mt-0 border-l-[3px] border-camera bg-bg px-2.5 py-1.5 text-[0.85rem]" role="status">
                    {notice}
                  </p>
                )}
                <p className="mb-2 mt-0 min-h-[1.4em] text-[0.85rem] text-muted">{hint}</p>
                {diagram}
                {legend}
              </Card>

              <div className="min-[901px]:sticky min-[901px]:top-[7.5rem]">
                <Card as="aside">{info}</Card>
              </div>
            </div>

            {mains && <div className="mt-4">{mains}</div>}

            {pricing}
          </>
        )}

        {tab === 'architecture' && architecture}
      </main>

      {sheet}
    </>
  )
}

export default AppUI
