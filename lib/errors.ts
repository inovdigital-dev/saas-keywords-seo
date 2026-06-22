// Maps HTTP status codes from scraping to user-friendly Portuguese explanations.
export function friendlyHttpError(status: number): string {
  if (status === 403 || status === 401) {
    return 'A página está protegida contra acesso automático (proteção anti-bot). Sites como grandes lojas online costumam bloquear este tipo de análise.'
  }
  if (status === 404 || status === 410) {
    return 'A página não foi encontrada (pode ter sido removida ou o endereço estar incorreto).'
  }
  if (status === 429) {
    return 'O site limitou o número de acessos (demasiados pedidos). Tente novamente mais tarde.'
  }
  if (status >= 500) {
    return 'O servidor da página devolveu um erro temporário. Tente novamente mais tarde.'
  }
  return `Não foi possível aceder à página (código ${status}).`
}

// Normalizes any thrown error message into something a non-technical user understands.
export function humanizeError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('aborted') || m.includes('timeout') || m.includes('timed out')) {
    return 'A página demorou demasiado tempo a responder. Pode estar lenta ou indisponível.'
  }
  if (m.includes('enotfound') || m.includes('getaddrinfo') || m.includes('dns')) {
    return 'O endereço do site não foi encontrado. Verifique se o URL está correto.'
  }
  if (m.includes('certificate') || m.includes('ssl') || m.includes('tls')) {
    return 'O site tem um problema de certificado de segurança (SSL).'
  }
  // Already-friendly messages pass through unchanged.
  return message
}
