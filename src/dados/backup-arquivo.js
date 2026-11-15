// Exportar, importar e apagar dados (lado do banco e do navegador).
import { db } from './db.js';
import { STORES, montarBackup, validarBackup, migrar, mesclarRegistros, nomeArquivoBackup } from '../logica/backup.js';

export async function exportarTudo(agora = new Date()) {
  const dados = {};
  for (const s of STORES) dados[s] = await db[s].toArray();
  // Grava a data do backup dentro do próprio backup, para ficar coerente após importar.
  const config = dados.configuracao.find((c) => c.id === 'principal');
  if (config) config.ultimoBackup = agora.toISOString();
  return montarBackup(dados, agora);
}

/** Cria o arquivo .json do backup. */
export function arquivoDoBackup(backup) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  return new File([blob], nomeArquivoBackup(new Date(backup.exportadoEm)), { type: 'application/json' });
}

/** Baixa o arquivo pelo navegador. */
export function baixarArquivo(arquivo) {
  const url = URL.createObjectURL(arquivo);
  const a = document.createElement('a');
  a.href = url;
  a.download = arquivo.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** O navegador permite compartilhar arquivos (Web Share API)? Normalmente só no celular. */
export function podeCompartilharArquivo() {
  try {
    const teste = new File(['{}'], 'teste.json', { type: 'application/json' });
    return !!navigator.canShare?.({ files: [teste] });
  } catch { return false; }
}

export async function compartilharArquivo(arquivo) {
  await navigator.share({ files: [arquivo], title: 'Backup – Estudos Câmara SFS' });
}

/** Lê o arquivo escolhido e devolve o backup já validado e migrado. */
export async function lerArquivoBackup(arquivo) {
  let obj;
  try { obj = JSON.parse(await arquivo.text()); } catch { throw new Error('O arquivo não é um JSON válido.'); }
  validarBackup(obj);
  return migrar(obj);
}

/**
 * Importa um backup.
 * @param {'substituir'|'mesclar'} modo
 */
export async function importarBackup(backup, modo) {
  const stores = STORES.filter((s) => db[s]);
  const total = { novos: 0, atualizados: 0, mantidos: 0 };
  await db.transaction('rw', stores.map((s) => db[s]), async () => {
    for (const s of stores) {
      const recebidos = backup.dados[s] ?? [];
      if (modo === 'substituir') {
        await db[s].clear();
        await db[s].bulkPut(recebidos);
        total.novos += recebidos.length;
      } else {
        const r = mesclarRegistros(await db[s].toArray(), recebidos);
        await db[s].bulkPut(r.gravar);
        total.novos += r.novos; total.atualizados += r.atualizados; total.mantidos += r.mantidos;
      }
    }
  });
  return total;
}

/** Apaga todos os dados deste aparelho. */
export async function apagarTudo() {
  await db.transaction('rw', STORES.map((s) => db[s]), async () => {
    for (const s of STORES) await db[s].clear();
  });
}
