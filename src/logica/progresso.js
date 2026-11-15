// Cálculo de progresso. Funções puras: recebem dados e devolvem números.
//
// Regras (seção 4.3 do pedido):
// - % simples = tópicos concluídos (Revisado ou Dominado) ÷ total de tópicos.
//   Tópicos compartilhados contam uma vez só.
// - % ponderado = usa o peso da disciplina na prova de cada cargo, dividido
//   igualmente entre os tópicos daquele cargo na disciplina, multiplicado pelo
//   peso do status do tópico. Um tópico compartilhado soma o peso que tem em
//   cada cargo. Por isso, o ponderado geral (Ambos) é a média dos dois cargos.

import { STATUS_CONCLUIDOS, PESOS_STATUS_PADRAO } from './constantes.js';

/**
 * Calcula o peso de cada tópico em cada cargo.
 * @returns {Map<string, Record<string, number>>} id do tópico → { AA: peso, TI: peso }
 */
export function pesosDosTopicos(topicos, disciplinas) {
  const visiveis = topicos.filter((t) => !t.oculto);
  const pesos = new Map(visiveis.map((t) => [t.id, {}]));
  for (const d of disciplinas) {
    for (const [cargo, pesoDisc] of Object.entries(d.pesoPorCargo ?? {})) {
      const lista = visiveis.filter((t) => t.disciplinaId === d.id && t.cargos.includes(cargo));
      if (lista.length === 0) continue;
      const porTopico = pesoDisc / lista.length;
      for (const t of lista) pesos.get(t.id)[cargo] = porTopico;
    }
  }
  return pesos;
}

/** Valor de 0 a 1 de um tópico, pelo status. */
export function valorDoStatus(status, pesosStatus = PESOS_STATUS_PADRAO) {
  return pesosStatus[status ?? 'nao-iniciado'] ?? 0;
}

/**
 * Cria uma calculadora a partir do estado atual.
 * @param {{topicos: any[], disciplinas: any[], progresso: Map<string, any>, pesosStatus?: Record<string, number>}} dados
 */
export function criarCalculadora({ topicos, disciplinas, progresso, pesosStatus = PESOS_STATUS_PADRAO }) {
  const pesos = pesosDosTopicos(topicos, disciplinas);
  const visiveis = topicos.filter((t) => !t.oculto);
  const statusDe = (id) => progresso.get(id)?.status ?? 'nao-iniciado';

  /**
   * Resumo de um conjunto de tópicos.
   * @param {{cargos: string[], disciplinaId?: string}} filtro
   */
  function resumo({ cargos, disciplinaId }) {
    const lista = visiveis.filter(
      (t) => t.cargos.some((c) => cargos.includes(c)) && (!disciplinaId || t.disciplinaId === disciplinaId),
    );
    let concluidos = 0;
    let somaPeso = 0;
    let somaFeito = 0;
    for (const t of lista) {
      const status = statusDe(t.id);
      if (STATUS_CONCLUIDOS.has(status)) concluidos++;
      const valor = valorDoStatus(status, pesosStatus);
      for (const c of cargos) {
        const p = pesos.get(t.id)?.[c] ?? 0;
        somaPeso += p;
        somaFeito += p * valor;
      }
    }
    const total = lista.length;
    return {
      total,
      concluidos,
      pctSimples: total ? (concluidos / total) * 100 : 0,
      pctPonderado: somaPeso ? (somaFeito / somaPeso) * 100 : 0,
      pesoTotal: somaPeso,
    };
  }

  /** Progresso de um tópico (0 a 100), pelo status. */
  function doTopico(id) {
    return valorDoStatus(statusDe(id), pesosStatus) * 100;
  }

  return { resumo, doTopico, pesos };
}

/** Formata um percentual em pt-BR com uma casa decimal quando necessário. */
export function formatarPct(valor) {
  const arred = Math.round(valor * 10) / 10;
  return arred.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
}
