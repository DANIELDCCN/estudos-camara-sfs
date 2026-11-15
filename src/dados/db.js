// Banco local (IndexedDB) via Dexie. Os dados ficam só neste aparelho.
import Dexie from 'dexie';

export const db = new Dexie('estudos-camara-sfs');

// Versão 1 do esquema: todos os stores da seção 6 do pedido.
// Para mudar o esquema no futuro, acrescente db.version(2).stores({...}).upgrade(...)
// e uma migração correspondente em src/logica/backup.js (MIGRACOES).
db.version(1).stores({
  concurso: 'id',
  cargo: 'id',
  disciplina: 'id, ordem',
  topico: 'id, disciplinaId, ordem',
  progresso: 'id', // id = código do tópico; um registro por tópico, independente do cargo
  resumo: 'id, topicoId',
  flashcard: 'id, topicoId, proximaRevisao',
  revisaoLog: 'id, flashcardId, data', // intervaloAnterior e intervaloNovo em minutos
  configuracao: 'id',
  cronogramaBloco: 'id, data',
  eventoEdital: 'id, dataInicio',
});

/** Preenche criadoEm/atualizadoEm (ISO 8601). */
export function carimbar(registro, agora = new Date()) {
  const iso = agora.toISOString();
  return { criadoEm: registro.criadoEm ?? iso, ...registro, atualizadoEm: iso };
}
