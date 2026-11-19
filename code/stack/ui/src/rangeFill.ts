/** Les curseurs (input range) : la part choisie (de 0 à 1) est posée en variable CSS `--p` sur chaque curseur, pour colorer la barre jusqu'à la poignée (`tokens.css`). */
const update = (input: HTMLInputElement): void => {
  const min = Number(input.min || 0)
  const max = Number(input.max || 100)
  const share = max > min ? (Number(input.value) - min) / (max - min) : 0
  input.style.setProperty('--p', String(Math.min(1, Math.max(0, share))))
}

const updateAll = (root: ParentNode): void => root.querySelectorAll<HTMLInputElement>("input[type='range']").forEach(update)

/** À appeler une fois au démarrage de l'app : suit les curseurs déjà là, ceux qui arrivent, et leurs changements (au doigt comme par le code). */
export const watchRangeFill = (): void => {
  updateAll(document)
  document.addEventListener('input', (event) => {
    if (event.target instanceof HTMLInputElement && event.target.type === 'range') update(event.target)
  })
  new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'attributes' && record.target instanceof HTMLInputElement && record.target.type === 'range') update(record.target)
      record.addedNodes.forEach((node) => {
        if (node instanceof HTMLInputElement && node.type === 'range') update(node)
        else if (node instanceof Element) updateAll(node)
      })
    }
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['value', 'min', 'max'] })
}
