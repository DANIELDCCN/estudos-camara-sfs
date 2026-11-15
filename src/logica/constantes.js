// Constantes do domínio: status dos tópicos, cargos e configuração padrão.
// Este arquivo não depende da interface nem do banco, e é usado nos testes.

/** Status possíveis de um tópico, em ordem. `fracao` desenha o ícone (pizza). */
export const STATUS = [
  { id: 'nao-iniciado', rotulo: 'Não iniciado', fracao: 0 },
  { id: 'teoria', rotulo: 'Teoria estudada', fracao: 0.25 },
  { id: 'questoes', rotulo: 'Questões resolvidas', fracao: 0.5 },
  { id: 'revisado', rotulo: 'Revisado', fracao: 0.75 },
  { id: 'dominado', rotulo: 'Dominado', fracao: 1 },
];

export const STATUS_POR_ID = Object.fromEntries(STATUS.map((s, i) => [s.id, { ...s, indice: i }]));

/** Pesos padrão de cada status no cálculo de progresso (configuráveis). */
export const PESOS_STATUS_PADRAO = {
  'nao-iniciado': 0,
  teoria: 0.4,
  questoes: 0.7,
  revisado: 0.9,
  dominado: 1.0,
};

/** Um tópico conta como "concluído" no % simples quando está Revisado ou Dominado. */
export const STATUS_CONCLUIDOS = new Set(['revisado', 'dominado']);

export const CARGOS = ['AA', 'TI'];
export const NOME_CARGO = { AA: 'Assistente Administrativo', TI: 'Analista de TI' };
export const NOME_CARGO_COMPLETO = { AA: 'Assistente Administrativo', TI: 'Analista de Tecnologia da Informação' };

/** Configuração inicial. Campos de etapas futuras já vêm com valor padrão. */
export const CONFIG_PADRAO = {
  id: 'principal',
  nomeApp: 'Estudos Câmara SFS',
  tema: 'auto', // auto | claro | escuro | alto
  escalaFonte: 1, // 1 = 100% (base de 18px) até 2 = 200%
  espacamento: false, // espaçamento ampliado entre letras e linhas
  atalhos: true, // atalhos de uma tecla (podem ser desligados – WCAG 2.1.4)
  cargoFoco: 'ambos', // ambos | AA | TI
  pesosStatus: { ...PESOS_STATUS_PADRAO },
  // Etapas 2 e 3 (já reservados):
  horasPorDiaSemana: { seg: 2, ter: 2, qua: 2, qui: 2, sex: 2, sab: 3, dom: 1 },
  diasBloqueados: [],
  duracaoBloco: 50,
  percRevisao: 20,
  diasRetaFinal: 7,
  limiteNovosCartoes: 20,
  blocosPorTopico: 3, // blocos de estudo para levar um tópico de Não iniciado a Dominado
  dataInicioPlano: null, // null = hoje
  dataProvaPlano: null, // null = data da prova do concurso
  replanejarAuto: true, // replaneja sozinho, uma vez por dia, se houver blocos atrasados
  ultimoPlano: null, // { geradoEm, avisos, resumo }
  ultimoBackup: null,
  versaoSeed: 0,
};
