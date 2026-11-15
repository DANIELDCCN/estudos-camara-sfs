// Revisão espaçada com FSRS (biblioteca ts-fsrs, licença MIT).
//
// Por que FSRS e não SM-2: o FSRS calcula os intervalos a partir de um modelo de
// memória (estabilidade e dificuldade de cada cartão) e erra menos que o SM-2 no
// mesmo número de revisões. A biblioteca é pequena, madura e roda offline.
//
// O resto do app só usa as funções deste arquivo. Para trocar por SM-2, basta
// reescrever `agendar`, `previsoes` e `ehNovo` mantendo as mesmas assinaturas.
//
// Formato de `estadoSRS` (guardado no flashcard): o objeto Card do ts-fsrs com as
// datas em texto ISO 8601. `null` significa cartão novo, nunca revisado.

import { fsrs, generatorParameters, createEmptyCard, State } from 'ts-fsrs';

/** As quatro avaliações, na ordem das teclas 1 a 4. */
export const NOTAS = [
  { nota: 1, rotulo: 'Errei' },
  { nota: 2, rotulo: 'Difícil' },
  { nota: 3, rotulo: 'Bom' },
  { nota: 4, rotulo: 'Fácil' },
];
export const ROTULO_NOTA = Object.fromEntries(NOTAS.map((n) => [n.nota, n.rotulo]));

// Sem "fuzz" (variação aleatória): o mesmo cartão e a mesma nota sempre dão o mesmo intervalo.
const motor = fsrs(generatorParameters({ enable_fuzz: false, request_retention: 0.9 }));

function paraCard(estado, agora) {
  if (!estado) return createEmptyCard(agora);
  return {
    ...estado,
    due: new Date(estado.due),
    last_review: estado.last_review ? new Date(estado.last_review) : undefined,
  };
}

function paraEstado(card) {
  return {
    ...card,
    due: card.due.toISOString(),
    last_review: card.last_review ? new Date(card.last_review).toISOString() : null,
  };
}

/** O cartão ainda não foi revisado nenhuma vez? */
export function ehNovo(estado) {
  return !estado || estado.state === State.New;
}

/** Intervalo atual do cartão, em minutos (0 para cartão novo). */
function intervaloAtualMin(estado) {
  if (!estado?.last_review) return 0;
  return Math.round((new Date(estado.due) - new Date(estado.last_review)) / 60000);
}

/**
 * Aplica uma avaliação (1 a 4) e devolve o novo estado.
 * Os intervalos vão em minutos, para caber tanto "10 minutos" quanto "3 meses".
 */
export function agendar(estado, nota, agora = new Date()) {
  if (![1, 2, 3, 4].includes(nota)) throw new Error('A nota deve ser 1, 2, 3 ou 4.');
  const { card } = motor.next(paraCard(estado, agora), agora, nota);
  return {
    estadoSRS: paraEstado(card),
    proximaRevisao: card.due.toISOString(),
    intervaloAnterior: intervaloAtualMin(estado),
    intervaloNovo: Math.round((card.due - agora) / 60000),
  };
}

/** Próxima revisão para cada nota possível (para mostrar nos botões antes de avaliar). */
export function previsoes(estado, agora = new Date()) {
  const r = motor.repeat(paraCard(estado, agora), agora);
  return Object.fromEntries(NOTAS.map(({ nota }) => [nota, Math.round((r[nota].card.due - agora) / 60000)]));
}

/** Minutos → texto curto: "1 minuto", "10 minutos", "3 horas", "8 dias", "2 meses", "1,5 ano". */
export function textoIntervalo(min) {
  const p = (n, s, pl) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${n === 1 ? s : pl}`;
  if (min < 60) return p(Math.max(1, Math.round(min)), 'minuto', 'minutos');
  if (min < 60 * 24) return p(Math.round(min / 60), 'hora', 'horas');
  const dias = Math.round(min / 1440);
  if (dias < 31) return p(dias, 'dia', 'dias');
  if (dias < 365) return p(Math.round(dias / 30), 'mês', 'meses');
  return p(Math.round((dias / 365) * 10) / 10, 'ano', 'anos');
}
