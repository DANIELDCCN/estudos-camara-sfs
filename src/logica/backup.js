// Formato do backup, migração de esquema e mesclagem. Funções puras (sem banco).

export const APP = 'estudos-camara-sfs';
export const VERSAO_ESQUEMA = 1;

/** Todas as coleções (stores) do IndexedDB. A ordem importa só para leitura humana. */
export const STORES = [
  'concurso', 'cargo', 'disciplina', 'topico', 'progresso', 'resumo',
  'flashcard', 'revisaoLog', 'configuracao', 'cronogramaBloco', 'eventoEdital',
];

/** Monta o objeto de backup a partir dos dados de cada store. */
export function montarBackup(dados, agora = new Date()) {
  const saida = {};
  for (const s of STORES) saida[s] = dados[s] ?? [];
  return { app: APP, versaoEsquema: VERSAO_ESQUEMA, exportadoEm: agora.toISOString(), dados: saida };
}

/**
 * Migrações: cada função recebe os dados da versão N e devolve os da versão N+1.
 * Exemplo para o futuro:
 *   2: (dados) => ({ ...dados, novoStore: [] }),
 */
export const MIGRACOES = {};

/** Confere se o arquivo é um backup válido. Lança Error com mensagem em português. */
export function validarBackup(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('O arquivo não contém um backup válido.');
  if (obj.app !== APP) throw new Error('Este arquivo não é um backup do Estudos Câmara SFS.');
  if (!Number.isInteger(obj.versaoEsquema) || obj.versaoEsquema < 1) throw new Error('Versão do backup desconhecida.');
  if (obj.versaoEsquema > VERSAO_ESQUEMA) {
    throw new Error(`Este backup é de uma versão mais nova do app (esquema ${obj.versaoEsquema}). Atualize o app antes de importar.`);
  }
  if (!obj.dados || typeof obj.dados !== 'object') throw new Error('O backup não tem a seção "dados".');
  for (const [store, lista] of Object.entries(obj.dados)) {
    if (!Array.isArray(lista)) throw new Error(`A coleção "${store}" do backup está corrompida.`);
    if (lista.some((r) => !r || r.id === undefined)) throw new Error(`Há registros sem "id" na coleção "${store}".`);
  }
  return true;
}

/** Leva um backup antigo até a versão atual do esquema. */
export function migrar(backup) {
  let { versaoEsquema, dados } = backup;
  while (versaoEsquema < VERSAO_ESQUEMA) {
    const passo = MIGRACOES[versaoEsquema + 1];
    if (!passo) throw new Error(`Falta a migração para o esquema ${versaoEsquema + 1}.`);
    dados = passo(dados);
    versaoEsquema++;
  }
  return { ...backup, versaoEsquema, dados };
}

/**
 * Mescla registros: vence quem tiver `atualizadoEm` mais recente.
 * Registros com o mesmo `id` nunca são duplicados.
 * @returns {{gravar: any[], novos: number, atualizados: number, mantidos: number}}
 */
export function mesclarRegistros(existentes, recebidos) {
  const porId = new Map(existentes.map((r) => [r.id, r]));
  const gravar = [];
  let novos = 0;
  let atualizados = 0;
  let mantidos = 0;
  for (const r of recebidos) {
    const atual = porId.get(r.id);
    if (!atual) { gravar.push(r); novos++; continue; }
    if ((r.atualizadoEm ?? '') > (atual.atualizadoEm ?? '')) { gravar.push(r); atualizados++; } else mantidos++;
  }
  return { gravar, novos, atualizados, mantidos };
}

/** Nome sugerido para o arquivo: estudos-camara-sfs-backup-2026-11-14.json */
export function nomeArquivoBackup(agora = new Date()) {
  return `${APP}-backup-${agora.toISOString().slice(0, 10)}.json`;
}
