// Estado do app em memória + gravação no banco.
// As telas leem `estado` e chamam as funções salvar*(); nunca falam com o Dexie direto.
import { db, carimbar } from './db.js';
import { CONFIG_PADRAO } from '../logica/constantes.js';
import { criarCalculadora } from '../logica/progresso.js';
import { hojeISO } from '../logica/datas.js';

export const estado = {
  config: { ...CONFIG_PADRAO },
  concurso: null,
  cargos: [],
  disciplinas: [],
  topicos: [],
  eventos: [],
  progresso: new Map(),
};

const ouvintes = new Set();
/** Avisa as telas quando algo muda. */
export function aoMudar(fn) { ouvintes.add(fn); return () => ouvintes.delete(fn); }
function avisar(o) { for (const fn of ouvintes) fn(o); }

export async function carregar() {
  const [config, concurso, cargos, disciplinas, topicos, eventos, progresso] = await Promise.all([
    db.configuracao.get('principal'),
    db.concurso.toArray(),
    db.cargo.toArray(),
    db.disciplina.orderBy('ordem').toArray(),
    db.topico.orderBy('ordem').toArray(),
    db.eventoEdital.orderBy('dataInicio').toArray(),
    db.progresso.toArray(),
  ]);
  estado.config = { ...CONFIG_PADRAO, ...config, pesosStatus: { ...CONFIG_PADRAO.pesosStatus, ...config?.pesosStatus } };
  estado.concurso = concurso[0] ?? null;
  estado.cargos = cargos;
  estado.disciplinas = disciplinas;
  estado.topicos = topicos;
  estado.eventos = eventos;
  estado.progresso = new Map(progresso.map((p) => [p.id, p]));
}

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
  if (mudancas.status && mudancas.status !== anterior.status && mudancas.status !== 'nao-iniciado' && !('ultimoEstudo' in mudancas)) {
    novo.ultimoEstudo = hojeISO();
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
