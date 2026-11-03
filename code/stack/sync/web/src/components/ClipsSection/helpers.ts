/** Le nom d'un clip dans la liste : <caméra>/<id>, sans le dossier clips/. */
export const clipName = (id: string): string => id.replace(/^clips\//, '')
