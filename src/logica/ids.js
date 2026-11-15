// Identificadores únicos para resumos, cartões e registros de revisão.
export function novoIdRegistro(prefixo) {
  const aleatorio = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefixo}-${aleatorio}`;
}
