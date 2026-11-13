import { createContext, useContext } from 'react'

/** Fonction qui ouvre le bloc de définition d'un terme du glossaire. */
export const GlossaryContext = createContext<(termId: string) => void>(() => {})

export const useGlossary = () => useContext(GlossaryContext)
