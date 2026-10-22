import {
  CODE_BLOCK_CLASS,
  DEPTH_CLASS,
  EMPTY_TEXT,
  EXPLANATION_CLASS,
  FILE_ACTIVE_CLASS,
  FILE_IDLE_CLASS,
  FOLDER_CLASS,
  LAYOUT_CLASS,
  PATH_CLASS,
  TREE_CLASS,
  TOKEN_CLASS,
  TREE_LABEL,
} from './constants'
import type { CodeBrowserUIProps } from './types'

const CodeBrowserUI = ({ nodes, selected, onSelect, tokens, explanation }: CodeBrowserUIProps) => {
  if (nodes.length === 0) return <p className="m-0 text-muted">{EMPTY_TEXT}</p>
  return (
    <div className={LAYOUT_CLASS}>
      <nav aria-label={TREE_LABEL} className={TREE_CLASS}>
        <ul className="m-0 list-none p-0">
          {nodes.map((node) => (
            <li key={node.path} className={DEPTH_CLASS[Math.min(node.depth, DEPTH_CLASS.length - 1)]}>
              {node.isFolder ? (
                <span className={FOLDER_CLASS}>{node.name}/</span>
              ) : (
                <button
                  type="button"
                  aria-current={node.path === selected ? 'true' : undefined}
                  className={node.path === selected ? FILE_ACTIVE_CLASS : FILE_IDLE_CLASS}
                  onClick={() => onSelect(node.path)}
                >
                  {node.name}
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0">
        <p className={PATH_CLASS}>code/phase0/{selected}</p>
        {explanation && <p className={EXPLANATION_CLASS}>{explanation}</p>}
        <pre className={CODE_BLOCK_CLASS}>
          <code>
            {tokens.map((token, i) =>
              token.kind === 'plain' ? (
                token.text
              ) : (
                <span key={i} className={TOKEN_CLASS[token.kind]}>
                  {token.text}
                </span>
              ),
            )}
          </code>
        </pre>
      </div>
    </div>
  )
}

export default CodeBrowserUI
