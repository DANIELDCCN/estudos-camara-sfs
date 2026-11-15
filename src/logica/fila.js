// Fila do dia, estatísticas e previsão de revisões. Funções puras.
import { ehNovo } from './srs.js';
import { hojeISO, instante, diasEntre } from './datas.js';

/** Último instante do dia de hoje em Brasília. */
export function fimDoDia(agora = new Date()) {
  return new Date(instante(hojeISO(agora), '23:59').getTime() + 59999);
}

/** Quantos cartões novos já foram vistos hoje (para respeitar o limite diário). */
export function novosVistosHoje(logs, agora = new Date()) {
  const hoje = hojeISO(agora);
  return logs.filter((l) => l.eraNovo && hojeISO(new Date(l.data)) === hoje).length;
}

/**
 * Monta a fila do dia: cartões vencidos até o fim de hoje + novos dentro do limite.
 * @param {any[]} cartoes
 * @param {{agora?: Date, limiteNovos?: number, logs?: any[], filtro?: (c:any)=>boolean}} opcoes
 */
export function montarFila(cartoes, { agora = new Date(), limiteNovos = 20, logs = [], filtro = () => true } = {}) {
  const fim = fimDoDia(agora).toISOString();
  const ativos = cartoes.filter((c) => !c.suspenso && filtro(c));
  const vencidos = ativos
    .filter((c) => !ehNovo(c.estadoSRS) && c.proximaRevisao <= fim)
    .sort((a, b) => a.proximaRevisao.localeCompare(b.proximaRevisao));
  const novosRestantes = Math.max(0, limiteNovos - novosVistosHoje(logs, agora));
  const todosNovos = ativos.filter((c) => ehNovo(c.estadoSRS)).sort((a, b) => (a.criadoEm ?? '').localeCompare(b.criadoEm ?? ''));
  const novos = todosNovos.slice(0, novosRestantes);
  return { vencidos, novos, fila: [...vencidos, ...novos], novosRestantes, novosForaDoLimite: todosNovos.length - novos.length };
}

/** Acerto = qualquer nota diferente de "Errei" (1). */
const acertou = (l) => l.nota >= 2;

export function estatisticas(logs, agora = new Date()) {
  const hoje = hojeISO(agora);
  const deHoje = logs.filter((l) => hojeISO(new Date(l.data)) === hoje);
  const taxa = (lista) => (lista.length ? (lista.filter(acertou).length / lista.length) * 100 : null);
  return {
    revisadosHoje: deHoje.length,
    acertosHoje: deHoje.filter(acertou).length,
    taxaHoje: taxa(deHoje),
    totalRevisoes: logs.length,
    taxaTotal: taxa(logs),
  };
}

/**
 * Revisões previstas para hoje e os próximos 6 dias.
 * Cartões atrasados entram em "hoje". Cartões novos não entram (aparecem à parte).
 */
export function previsao7Dias(cartoes, agora = new Date()) {
  const hoje = hojeISO(agora);
  const dias = Array.from({ length: 7 }, (_, i) => ({
    data: hojeISO(new Date(instante(hoje, '12:00').getTime() + i * 86400000)),
    quantidade: 0,
  }));
  for (const c of cartoes) {
    if (c.suspenso || ehNovo(c.estadoSRS) || !c.proximaRevisao) continue;
    const d = Math.max(0, diasEntre(hoje, hojeISO(new Date(c.proximaRevisao))));
    if (d < 7) dias[d].quantidade++;
  }
  return dias;
}
