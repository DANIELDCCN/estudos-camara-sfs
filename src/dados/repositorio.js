// Estado do app em memória + gravação no banco.
// As telas leem `estado` e chamam as funções salvar*(); nunca falam com o Dexie direto.
import { db, carimbar } from './db.js';
import { CONFIG_PADRAO } from '../logica/constantes.js';
import { criarCalculadora } from '../logica/progresso.js';
import { hojeISO } from '../logica/datas.js';
import { agendar, ehNovo } from '../logica/srs.js';
import { novoIdRegistro } from '../logica/ids.js';
import { gerarPlano, blocosMantidos } from '../logica/cronograma.js';

export const estado = {
  config: { ...CONFIG_PADRAO },
  concurso: null,
  cargos: [],
  disciplinas: [],
  topicos: [],
  eventos: [],
  progresso: new Map(),
  resumos: [],
  cartoes: [],
  logs: [],
  blocos: [],
};

const ouvintes = new Set();
/** Avisa as telas quando algo muda. */
export function aoMudar(fn) { ouvintes.add(fn); return () => ouvintes.delete(fn); }
function avisar(o) { for (const fn of ouvintes) fn(o); }

export async function carregar() {
  const [config, concurso, cargos, disciplinas, topicos, eventos, progresso, resumos, cartoes, logs, blocos] = await Promise.all([
    db.configuracao.get('principal'),
    db.concurso.toArray(),
    db.cargo.toArray(),
    db.disciplina.orderBy('ordem').toArray(),
    db.topico.orderBy('ordem').toArray(),
    db.eventoEdital.orderBy('dataInicio').toArray(),
    db.progresso.toArray(),
    db.resumo.toArray(),
    db.flashcard.toArray(),
    db.revisaoLog.toArray(),
    db.cronogramaBloco.toArray(),
  ]);
  estado.config = { ...CONFIG_PADRAO, ...config, pesosStatus: { ...CONFIG_PADRAO.pesosStatus, ...config?.pesosStatus } };
  estado.concurso = concurso[0] ?? null;
  estado.cargos = cargos;
  estado.disciplinas = disciplinas;
  estado.topicos = topicos;
  estado.eventos = eventos;
  estado.progresso = new Map(progresso.map((p) => [p.id, p]));
  estado.resumos = resumos;
  estado.cartoes = cartoes;
  estado.logs = logs;
  estado.blocos = blocos.sort(ordenarBlocos);
}

const ordenarBlocos = (a, b) => a.data.localeCompare(b.data) || a.ordem - b.ordem;

/** Progresso de um tópico (cria um registro vazio se ainda não houver). */
export function progressoDe(topicoId) {
  return estado.progresso.get(topicoId) ?? {
    id: topicoId, topicoId, status: 'nao-iniciado', confianca: null, minutosEstudados: 0,
    questoesFeitas: 0, questoesCertas: 0, ultimoEstudo: null, nota: '',
  };
}

export async function salvarProgresso(topicoId, mudancas) {
  const anterior = progressoDe(topicoId);
  const novo = carimbar({ ...anterior, ...mudancas });
  // Ao mudar o status para algo diferente de "Não iniciado", registra a data do estudo.
  if (mudancas.status && mudancas.status !== anterior.status) {
    // Usado pelo cronograma: blocos feitos antes desta data já estão refletidos no status.
    novo.statusAlteradoEm = novo.atualizadoEm;
    if (mudancas.status !== 'nao-iniciado' && !('ultimoEstudo' in mudancas)) novo.ultimoEstudo = hojeISO();
  }
  await db.progresso.put(novo);
  estado.progresso.set(topicoId, novo);
  avisar({ tipo: 'progresso', topicoId });
  return novo;
}

export async function salvarTopico(id, mudancas) {
  const atual = estado.topicos.find((t) => t.id === id);
  const novo = carimbar({ ...atual, ...mudancas });
  await db.topico.put(novo);
  Object.assign(atual, novo);
  avisar({ tipo: 'topico', id });
}

export async function salvarConfig(mudancas) {
  const nova = carimbar({ ...estado.config, ...mudancas });
  await db.configuracao.put(nova);
  estado.config = nova;
  avisar({ tipo: 'config', mudancas });
  return nova;
}

/** Cargos da visão atual: ['AA','TI'] para "Ambos". */
export function cargosDaVisao(foco = estado.config.cargoFoco) {
  return foco === 'ambos' ? ['AA', 'TI'] : [foco];
}

export function calculadora() {
  return criarCalculadora({
    topicos: estado.topicos,
    disciplinas: estado.disciplinas,
    progresso: estado.progresso,
    pesosStatus: estado.config.pesosStatus,
  });
}

export function topicoPorId(id) {
  return estado.topicos.find((t) => t.id === id);
}

// ---------- Resumos ----------
export function resumosDoTopico(topicoId) {
  return estado.resumos.filter((r) => r.topicoId === topicoId).sort((a, b) => (a.criadoEm ?? '').localeCompare(b.criadoEm ?? ''));
}

/** Cria (sem id) ou atualiza (com id) um resumo. Devolve o registro gravado. */
export async function salvarResumo(dados) {
  const atual = dados.id ? estado.resumos.find((r) => r.id === dados.id) : null;
  const base = atual ?? { id: novoIdRegistro('resumo') };
  const novo = carimbar({ ...base, ...dados, id: base.id });
  await db.resumo.put(novo);
  if (atual) Object.assign(atual, novo); else estado.resumos.push(novo);
  avisar({ tipo: 'resumo', id: novo.id });
  return atual ?? novo;
}

export async function excluirResumo(id) {
  await db.resumo.delete(id);
  estado.resumos = estado.resumos.filter((r) => r.id !== id);
  avisar({ tipo: 'resumo', id });
}

// ---------- Flashcards ----------
export function cartoesDoTopico(topicoId) {
  return estado.cartoes.filter((c) => c.topicoId === topicoId);
}

/** Cria (sem id) ou atualiza (com id) um cartão. */
export async function salvarCartao(dados) {
  const atual = dados.id ? estado.cartoes.find((c) => c.id === dados.id) : null;
  const base = atual ?? { id: novoIdRegistro('cartao'), estadoSRS: null, proximaRevisao: null, suspenso: false, explicacao: '' };
  const novo = carimbar({ ...base, ...dados, id: base.id });
  await db.flashcard.put(novo);
  if (atual) Object.assign(atual, novo); else estado.cartoes.push(novo);
  avisar({ tipo: 'cartao', id: novo.id });
  return atual ?? novo;
}

/** Grava vários cartões de uma vez (importação em lote). */
export async function criarCartoes(lista) {
  const agora = new Date();
  // Cada cartão ganha um milissegundo de diferença, para a ordem de criação ser a ordem do arquivo.
  const novos = lista.map((d, i) => carimbar({
    id: novoIdRegistro('cartao'), estadoSRS: null, proximaRevisao: null, suspenso: false, explicacao: '', ...d,
  }, new Date(agora.getTime() + i)));
  await db.flashcard.bulkPut(novos);
  estado.cartoes.push(...novos);
  avisar({ tipo: 'cartao' });
  return novos;
}

/** Exclui o cartão e o histórico de revisões dele. */
export async function excluirCartao(id) {
  await db.transaction('rw', db.flashcard, db.revisaoLog, async () => {
    await db.flashcard.delete(id);
    await db.revisaoLog.where('flashcardId').equals(id).delete();
  });
  estado.cartoes = estado.cartoes.filter((c) => c.id !== id);
  estado.logs = estado.logs.filter((l) => l.flashcardId !== id);
  avisar({ tipo: 'cartao', id });
}

/** Registra uma avaliação (1 a 4): calcula a próxima revisão e grava o histórico. */
export async function avaliarCartao(id, nota, agora = new Date()) {
  const cartao = estado.cartoes.find((c) => c.id === id);
  const r = agendar(cartao.estadoSRS, nota, agora);
  const atualizado = carimbar({ ...cartao, estadoSRS: r.estadoSRS, proximaRevisao: r.proximaRevisao }, agora);
  const log = carimbar({
    id: novoIdRegistro('rev'), flashcardId: id, topicoId: cartao.topicoId, data: agora.toISOString(), nota,
    intervaloAnterior: r.intervaloAnterior, intervaloNovo: r.intervaloNovo, eraNovo: ehNovo(cartao.estadoSRS),
  }, agora);
  await db.transaction('rw', db.flashcard, db.revisaoLog, async () => {
    await db.flashcard.put(atualizado);
    await db.revisaoLog.put(log);
  });
  Object.assign(cartao, atualizado);
  estado.logs.push(log);
  avisar({ tipo: 'revisao', id });
  return { cartao, log };
}

// ---------- Cronograma ----------
export function blocosDoDia(data) {
  return estado.blocos.filter((b) => b.data === data);
}

/** Data da prova usada pelo plano (configurável; padrão = data do concurso). */
export function dataProvaDoPlano() {
  return estado.config.dataProvaPlano || estado.concurso?.dataProva || '2027-01-24';
}

/** Atualiza um bloco (situação, minutos reais). */
export async function salvarBloco(id, mudancas) {
  const atual = estado.blocos.find((b) => b.id === id);
  const novo = carimbar({ ...atual, ...mudancas });
  await db.cronogramaBloco.put(novo);
  Object.assign(atual, novo);
  avisar({ tipo: 'bloco', id });
  return atual;
}

/**
 * Gera (ou refaz) o plano a partir de hoje, ou da data de início configurada se for depois.
 * Mantém os blocos de dias anteriores e os de hoje já marcados. Devolve { avisos, resumo }.
 */
export async function replanejar(agora = new Date()) {
  const c = estado.config;
  const hoje = hojeISO(agora);
  const inicio = c.dataInicioPlano && c.dataInicioPlano > hoje ? c.dataInicioPlano : hoje;
  const mantidos = blocosMantidos(estado.blocos, hoje);
  const plano = gerarPlano({
    inicio, dataProva: dataProvaDoPlano(), horas: c.horasPorDiaSemana, bloqueados: c.diasBloqueados,
    duracao: c.duracaoBloco, percRevisao: c.percRevisao, diasRetaFinal: c.diasRetaFinal, blocosPorTopico: c.blocosPorTopico,
    topicos: estado.topicos, disciplinas: estado.disciplinas, progresso: estado.progresso, pesosStatus: c.pesosStatus,
    cargos: cargosDaVisao(), blocosExistentes: mantidos,
  });
  const novos = plano.blocos.map((b) => carimbar({ id: novoIdRegistro('bloco'), ...b }, agora));
  const idsMantidos = new Set(mantidos.map((b) => b.id));
  const remover = estado.blocos.filter((b) => !idsMantidos.has(b.id)).map((b) => b.id);
  await db.transaction('rw', db.cronogramaBloco, async () => {
    await db.cronogramaBloco.bulkDelete(remover);
    await db.cronogramaBloco.bulkPut(novos);
  });
  estado.blocos = [...mantidos, ...novos].sort(ordenarBlocos);
  await salvarConfig({ ultimoPlano: { geradoEm: agora.toISOString(), avisos: plano.avisos, resumo: plano.resumo, cargos: cargosDaVisao() } });
  avisar({ tipo: 'plano' });
  return plano;
}
