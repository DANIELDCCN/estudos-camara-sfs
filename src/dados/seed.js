// Carga dos dados iniciais (seed.json) sem apagar o que o usuário já fez.
import { carimbar } from './db.js';
import { CONFIG_PADRAO } from '../logica/constantes.js';

const STORES_SEED = ['concurso', 'cargo', 'disciplina', 'topico', 'eventoEdital'];

// Campos que pertencem ao usuário e nunca são sobrescritos por um seed novo.
const CAMPOS_DO_USUARIO = ['oculto', 'linkNorma', 'statusInscricao', 'concluido', 'criadoEm'];

/**
 * Aplica o seed se ele for mais novo que o já aplicado.
 * - Registros novos são inseridos.
 * - Registros existentes de origem "seed" recebem os textos novos, mas mantêm os campos do usuário.
 * - Registros editados pelo usuário (editadoPeloUsuario: true) ou criados por ele não são tocados.
 * - O progresso, os resumos e os cartões nunca são alterados aqui.
 */
export async function aplicarSeed(db, seed, agora = new Date()) {
  return db.transaction('rw', [...STORES_SEED.map((s) => db[s]), db.configuracao], async () => {
    const config = (await db.configuracao.get('principal')) ?? carimbar({ ...CONFIG_PADRAO }, agora);
    if ((config.versaoSeed ?? 0) >= seed.versaoSeed) {
      if (!(await db.configuracao.get('principal'))) await db.configuracao.put(config);
      return false;
    }
    for (const store of STORES_SEED) {
      for (const reg of seed[store] ?? []) {
        const atual = await db[store].get(reg.id);
        if (!atual) {
          await db[store].put(carimbar({ ...reg }, agora));
        } else if (!atual.editadoPeloUsuario && atual.origem !== 'usuario') {
          const preservado = Object.fromEntries(CAMPOS_DO_USUARIO.filter((c) => c in atual).map((c) => [c, atual[c]]));
          await db[store].put(carimbar({ ...reg, ...preservado }, agora));
        }
      }
    }
    await db.configuracao.put(carimbar({ ...CONFIG_PADRAO, ...config, versaoSeed: seed.versaoSeed }, agora));
    return true;
  });
}
