// Cronograma automático. Funções puras (sem banco e sem interface), com testes.
//
// Como o plano é montado:
// 1. Dias: de `inicio` até a véspera da prova, sem os dias bloqueados.
// 2. Cada dia vira blocos: um bloco de revisão de flashcards (percRevisao % do tempo)
//    e blocos de estudo de `duracao` minutos. Uma sobra de meio bloco ou mais vira
//    um bloco menor; uma sobra menor vai para a revisão.
// 3. Reta final (últimos `diasRetaFinal` dias): só revisão de flashcards, revisão geral
//    e simulados, em dias alternados. A véspera é sempre de revisão geral.
// 4. Tópicos pendentes (não Dominados, dos cargos em foco):
//      prioridade = peso na prova × (1 − progresso) × fator de confiança
//      blocos necessários = arredonda para cima(blocosPorTopico × (1 − progresso))
//                           − blocos já feitos depois da última mudança de status (mínimo 1)
//    O peso de um tópico compartilhado é a soma dos pesos nos cargos em foco.
// 5. Distribuição: cada bloco de estudo, em ordem de data, vai para o tópico com maior
//    "prioridade ÷ (blocos já recebidos + 1)" (método de D'Hondt). Isso dá mais blocos e
//    mais cedo aos tópicos importantes e intercala os assuntos. Dentro do dia, nunca mais
//    de 2 blocos seguidos da mesma disciplina (a não ser que só reste uma).
// 6. Se os blocos não bastam: aviso com quantos faltam e quantas horas por semana seriam
//    necessárias. Se sobram: viram blocos de revisão geral.

import { pesosDosTopicos, valorDoStatus } from './progresso.js';
import { instante, hojeISO } from './datas.js';

export const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
export const NOME_DIA = { seg: 'Segunda-feira', ter: 'Terça-feira', qua: 'Quarta-feira', qui: 'Quinta-feira', sex: 'Sexta-feira', sab: 'Sábado', dom: 'Domingo' };

export const SITUACOES = [
  { id: 'pendente', rotulo: 'Pendente' },
  { id: 'feito', rotulo: 'Feito' },
  { id: 'parcial', rotulo: 'Parcialmente feito' },
  { id: 'pulado', rotulo: 'Pulado' },
];
export const ROTULO_SITUACAO = Object.fromEntries(SITUACOES.map((s) => [s.id, s.rotulo]));

/** Soma dias a uma data 'AAAA-MM-DD'. */
export function somarDias(iso, n) {
  return hojeISO(new Date(instante(iso, '12:00').getTime() + n * 86400000));
}

/** Sigla do dia da semana ('seg', 'ter'...) de uma data 'AAAA-MM-DD'. */
export function siglaDia(iso) {
  return DIAS_SEMANA[instante(iso, '12:00').getUTCDay()];
}

/** Segunda-feira da semana de uma data. */
export function inicioDaSemana(iso) {
  const dow = instante(iso, '12:00').getUTCDay(); // 0 = domingo
  return somarDias(iso, dow === 0 ? -6 : 1 - dow);
}

/** Fator de confiança baixa: 1 + (5 − confiança) × 0,25. Sem avaliação = 1,5. */
export function fatorConfianca(confianca) {
  if (confianca === null || confianca === undefined || confianca === '') return 1.5;
  const c = Math.min(5, Math.max(1, Number(confianca)));
  return 1 + (5 - c) * 0.25;
}

/** Quanto vale um bloco já marcado como estudo feito: feito = 1, parcial = 0,5. */
const valorFeito = (situacao) => (situacao === 'feito' ? 1 : situacao === 'parcial' ? 0.5 : 0);

/**
 * Lista os tópicos pendentes com prioridade e blocos necessários.
 * @returns {{id, disciplinaId, ordem, peso, progresso, fator, prioridade, demanda}[]}
 */
export function topicosPendentes({ topicos, disciplinas, progresso, pesosStatus, cargos, blocosPorTopico = 3, blocosExistentes = [] }) {
  const pesos = pesosDosTopicos(topicos, disciplinas);
  return topicos
    .filter((t) => !t.oculto && t.cargos.some((c) => cargos.includes(c)))
    .map((t) => {
      const p = progresso.get(t.id) ?? {};
      const prog = valorDoStatus(p.status, pesosStatus);
      const peso = cargos.reduce((s, c) => s + (pesos.get(t.id)?.[c] ?? 0), 0);
      const fator = fatorConfianca(p.confianca);
      const desde = p.statusAlteradoEm ? hojeISO(new Date(p.statusAlteradoEm)) : '';
      const feitos = Math.floor(blocosExistentes
        .filter((b) => b.topicoId === t.id && b.data >= desde)
        .reduce((s, b) => s + valorFeito(b.situacao), 0));
      const demanda = prog >= 1 ? 0 : Math.max(1, Math.ceil(blocosPorTopico * (1 - prog) - 1e-9) - feitos);
      return { id: t.id, disciplinaId: t.disciplinaId, ordem: t.ordem, peso, progresso: prog, fator, prioridade: peso * (1 - prog) * fator, demanda };
    })
    .filter((x) => x.demanda > 0 && x.peso > 0);
}

/**
 * Gera o plano a partir de `inicio`. Não mexe nos blocos que já existem: só devolve os novos.
 * @param {object} p
 * @param {string} p.inicio            'AAAA-MM-DD'
 * @param {string} p.dataProva         'AAAA-MM-DD' (o plano vai até a véspera)
 * @param {Record<string, number>} p.horas   horas por dia da semana { seg, ter, ... }
 * @param {string[]} [p.bloqueados]    dias de folga
 * @param {number} [p.duracao]         minutos por bloco (padrão 50)
 * @param {number} [p.percRevisao]     % do dia para flashcards (padrão 20)
 * @param {number} [p.diasRetaFinal]   padrão 7
 * @param {number} [p.blocosPorTopico] padrão 3
 * @param {object[]} [p.blocosExistentes] blocos mantidos (histórico e os já marcados hoje)
 */
export function gerarPlano(p) {
  const {
    inicio, dataProva, horas, bloqueados = [], duracao = 50, percRevisao = 20, diasRetaFinal = 7,
    blocosPorTopico = 3, blocosExistentes = [],
  } = p;
  const avisos = [];
  const blocos = [];
  const vespera = somarDias(dataProva, -1);
  if (inicio > vespera) {
    return { blocos, avisos: ['A data de início é igual ou posterior à data da prova. Não há dias para planejar.'], resumo: resumoVazio() };
  }
  const inicioReta = somarDias(dataProva, -Math.max(0, diasRetaFinal));
  const bloqueadosSet = new Set(bloqueados);

  // Minutos já ocupados no dia de início por blocos mantidos (ex.: marcados hoje antes de replanejar).
  const ocupados = {};
  const ordemMax = {};
  for (const b of blocosExistentes) {
    if (b.data >= inicio) {
      ocupados[b.data] = (ocupados[b.data] ?? 0) + (b.minutosPlanejados ?? 0);
      ordemMax[b.data] = Math.max(ordemMax[b.data] ?? 0, b.ordem ?? 0);
    }
  }

  // ---------- 1 a 3: dias e blocos vazios ----------
  const slotsEstudo = [];
  let diasEstudo = 0;
  let indiceReta = 0;
  for (let d = inicio; d <= vespera; d = somarDias(d, 1)) {
    if (bloqueadosSet.has(d)) continue;
    const total = Math.round((Number(horas[siglaDia(d)]) || 0) * 60) - (ocupados[d] ?? 0);
    const naReta = d >= inicioReta;
    if (!naReta) diasEstudo++;
    if (total <= 0) { if (naReta) indiceReta++; continue; }
    let ordem = ordemMax[d] ?? 0;
    const novo = (tipo, minutos, extra = {}) => blocos.push({ data: d, ordem: ++ordem, tipo, topicoId: null, disciplinaId: null, minutosPlanejados: minutos, minutosReais: null, situacao: 'pendente', ...extra });

    let revisao = Math.round((total * percRevisao) / 100);
    const resto = total - revisao;
    const n = Math.floor(resto / duracao);
    let sobra = resto - n * duracao;
    const curto = sobra >= duracao / 2 ? sobra : 0;
    if (!curto) revisao += sobra;
    sobra = curto;
    if (revisao > 0) novo('revisao', revisao);

    if (naReta) {
      const ehVespera = d === vespera;
      const simulado = !ehVespera && indiceReta % 2 === 0;
      indiceReta++;
      if (simulado) {
        // Um simulado é contínuo e tem no máximo 4 horas (duração da prova).
        const minSim = Math.min(240, resto);
        novo('simulado', minSim);
        let rest = resto - minSim;
        while (rest >= duracao) { novo('revisao-geral', duracao); rest -= duracao; }
        if (rest >= duracao / 2) novo('revisao-geral', rest);
      } else {
        for (let i = 0; i < n; i++) novo('revisao-geral', duracao);
        if (sobra) novo('revisao-geral', sobra);
      }
      continue;
    }
    for (let i = 0; i < n; i++) { novo('estudo', duracao); slotsEstudo.push(blocos.at(-1)); }
    if (sobra) { novo('estudo', sobra); slotsEstudo.push(blocos.at(-1)); }
  }

  // ---------- 4 e 5: tópicos nos blocos de estudo ----------
  const pendentes = topicosPendentes({ ...p, blocosExistentes })
    .map((t) => ({ ...t, recebidos: 0 }));
  const demandaTotal = pendentes.reduce((s, t) => s + t.demanda, 0);
  let diaAtual = null;
  let ultimas = [];
  for (const slot of slotsEstudo) {
    if (slot.data !== diaAtual) { diaAtual = slot.data; ultimas = []; }
    const abertos = pendentes.filter((t) => t.recebidos < t.demanda);
    if (!abertos.length) { slot.tipo = 'revisao-geral'; continue; }
    const repetida = ultimas.length >= 2 && ultimas.at(-1) === ultimas.at(-2) ? ultimas.at(-1) : null;
    const permitidos = abertos.filter((t) => t.disciplinaId !== repetida);
    const candidatos = permitidos.length ? permitidos : abertos;
    let melhor = candidatos[0];
    let melhorScore = -1;
    for (const t of candidatos) {
      const score = t.prioridade / (t.recebidos + 1);
      if (score > melhorScore + 1e-12 || (Math.abs(score - melhorScore) <= 1e-12 && t.ordem < melhor.ordem)) { melhor = t; melhorScore = score; }
    }
    melhor.recebidos++;
    slot.topicoId = melhor.id;
    slot.disciplinaId = melhor.disciplinaId;
    ultimas.push(melhor.disciplinaId);
  }

  // ---------- 6: avisos e resumo ----------
  const faltam = pendentes.reduce((s, t) => s + Math.max(0, t.demanda - t.recebidos), 0);
  const semCobertura = pendentes.filter((t) => t.recebidos < t.demanda);
  const horasSemanaAtuais = Object.values(horas).reduce((s, x) => s + (Number(x) || 0), 0);
  const semanas = diasEstudo / 7;
  const fracaoEstudo = Math.max(0.01, 1 - percRevisao / 100);
  const horasSemanaNecessarias = semanas > 0
    ? Math.ceil(((demandaTotal * duracao) / fracaoEstudo / 60 / semanas) * 2) / 2
    : null;
  if (faltam > 0) {
    const h = Math.round(((faltam * duracao) / 60) * 10) / 10;
    avisos.push(
      `As horas disponíveis não bastam: faltam ${faltam} ${faltam === 1 ? 'bloco' : 'blocos'} de estudo (cerca de ${h.toLocaleString('pt-BR')} horas) `
      + `e ${semCobertura.length} ${semCobertura.length === 1 ? 'tópico ficou' : 'tópicos ficaram'} sem todos os blocos.`
      + (horasSemanaNecessarias ? ` Para cobrir tudo antes da reta final, seriam necessárias cerca de ${horasSemanaNecessarias.toLocaleString('pt-BR')} horas por semana (hoje: ${horasSemanaAtuais.toLocaleString('pt-BR')}).` : ''),
    );
  }
  if (!slotsEstudo.length && pendentes.length && inicio < inicioReta) avisos.push('Não há horas de estudo antes da reta final. Preencha as horas por dia da semana.');

  return {
    blocos,
    avisos,
    resumo: {
      dias: diasEstudo,
      blocosEstudo: slotsEstudo.filter((s) => s.tipo === 'estudo').length,
      demandaTotal,
      faltam,
      topicosPendentes: pendentes.length,
      topicosSemCobertura: semCobertura.map((t) => t.id),
      horasSemanaAtuais,
      horasSemanaNecessarias,
      inicioReta,
    },
  };
}

function resumoVazio() {
  return { dias: 0, blocosEstudo: 0, demandaTotal: 0, faltam: 0, topicosPendentes: 0, topicosSemCobertura: [], horasSemanaAtuais: 0, horasSemanaNecessarias: null, inicioReta: null };
}

/**
 * Separa os blocos que ficam num replanejamento: os de dias anteriores e os de hoje
 * já marcados (feito, parcial ou pulado). Os pendentes de hoje em diante são refeitos.
 */
export function blocosMantidos(blocos, hoje) {
  return blocos.filter((b) => b.data < hoje || (b.data === hoje && b.situacao !== 'pendente'));
}

/** Blocos atrasados: de dias anteriores e ainda pendentes. */
export function blocosAtrasados(blocos, hoje) {
  return blocos.filter((b) => b.data < hoje && b.situacao === 'pendente');
}
