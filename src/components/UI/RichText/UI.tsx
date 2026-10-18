import { Fragment } from 'react'
import { TERM_CLASS } from './constants'
import type { RichTextUIProps } from './types'

const RichTextUI = ({ segments, onTerm }: RichTextUIProps) => {
  return (
    <>
      {segments.map((s, i) => {
        const id = s.termId
        return id ? (
          <button key={i} type="button" className={TERM_CLASS} onClick={() => onTerm(id)}>
            {s.text}
          </button>
        ) : (
          <Fragment key={i}>{s.text}</Fragment>
        )
      })}
    </>
  )
}

export default RichTextUI
