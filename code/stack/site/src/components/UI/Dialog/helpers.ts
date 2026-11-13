/** Vrai si le clic vient du fond de la boîte (le `<dialog>` lui-même) et non de son contenu. */
export const isBackdropClick = (target: EventTarget, dialog: HTMLDialogElement): boolean => target === dialog
