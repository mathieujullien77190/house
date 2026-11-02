import { CODE_CLASS } from './constants'
import type { CodeBlockProps } from './types'

/** Un bloc de texte à chasse fixe, qui défile quand il est long : un fichier de configuration, par exemple. */
const CodeBlock = ({ code, label }: CodeBlockProps) => {
  return (
    <pre className={CODE_CLASS} aria-label={label} tabIndex={0}>
      <code>{code}</code>
    </pre>
  )
}

export default CodeBlock
