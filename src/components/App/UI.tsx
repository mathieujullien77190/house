import Card from '@/components/UI/Card'
import type { AppUIProps } from './types'

const AppUI = ({ title, subtitle, phaseSwitch, notice, hint, diagram, legend, info, mains, k3s, pricing, sheet }: AppUIProps) => {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-baseline gap-x-4 gap-y-0.5 px-4 py-3">
          <h1 className="m-0 text-xl font-bold">{title}</h1>
          <p className="m-0 text-[0.9rem] text-muted">{subtitle}</p>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-4 pb-28 pt-5">
        <section aria-label="Phases">{phaseSwitch}</section>

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

          <div className="min-[901px]:sticky min-[901px]:top-[4.5rem]">
            <Card as="aside">{info}</Card>
          </div>
        </div>

        <div className="mt-4 grid items-start gap-4 min-[1000px]:grid-cols-2">
          {mains}
          {k3s}
        </div>

        {pricing}
      </main>

      {sheet}
    </>
  )
}

export default AppUI
