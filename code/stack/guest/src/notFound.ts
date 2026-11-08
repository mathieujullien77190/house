// La réponse à tout ce qui n'a pas la bonne clé (ou qui n'existe pas) : la page 404 banale d'un serveur web qui n'a rien à cet endroit,
// pour que rien ne laisse deviner qu'une page existe derrière (les robots qui frappent le nom public n'apprennent rien).
export const NOT_FOUND_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>404 Not Found</title>
</head>
<body>
<h1>Not Found</h1>
<p>The requested URL was not found on this server.</p>
</body>
</html>
`
