import Card from '@/components/UI/Card'
import { LINK_CLASS, TOTAL_LABEL } from './constants'
import type { DomainUIProps } from './types'

const DomainUI = ({ title, intro, columns }: DomainUIProps) => {
  return (
    <Card as="section">
      <h2 className="m-0 text-[1.15rem] font-semibold">{title}</h2>
      <p className="mb-3 mt-0.5 text-[0.9rem] text-muted">{intro}</p>

      <div className="grid grid-cols-1 gap-4 min-[901px]:grid-cols-2">
        {columns.map((column) => (
          <section key={column.id} aria-label={column.label}>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
              <h3 className="m-0 text-[0.95rem] font-semibold">{column.label}</h3>
              {column.total && (
                <span className="text-[0.85rem] text-muted tabular-nums">
                  {TOTAL_LABEL} : <strong className="text-fg">{column.total}</strong>
                </span>
              )}
            </div>

            {column.items.length === 0 ? (
              <p className="m-0 rounded-lg border border-dashed border-line px-3 py-2 text-[0.9rem] text-muted">{column.empty}</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {column.items.map((item) => (
                  <li key={item.id} className="rounded-lg border border-line bg-bg px-3 py-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <strong className="text-[0.92rem]">
                        {item.url ? (
                          <a href={item.url} target="_blank" rel="noreferrer" className={LINK_CLASS}>
                            {item.title}
                          </a>
                        ) : (
                          item.title
                        )}
                      </strong>
                      {item.price && <span className="whitespace-nowrap text-[0.9rem] tabular-nums">{item.price}</span>}
                    </div>
                    <p className="m-0 mt-0.5 text-[0.85rem] text-muted">{item.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </Card>
  )
}

export default DomainUI
