// Datas no horário oficial de Brasília (UTC−3; o Brasil não tem horário de verão desde 2019).

export const FUSO = '-03:00';
const ZONA = 'America/Sao_Paulo';

/** Converte 'AAAA-MM-DD' + 'HH:MM' (Brasília) em Date. */
export function instante(data, hora = '00:00') {
  return new Date(`${data}T${hora}:00${FUSO}`);
}

/** 'AAAA-MM-DD' → 'DD/MM/AAAA', sem passar por Date (evita erro de fuso). */
export function formatarData(iso) {
  if (!iso) return '';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

/** Dia da semana por extenso de uma data 'AAAA-MM-DD'. */
export function diaDaSemana(iso) {
  return DIAS_SEMANA[instante(iso, '12:00').getUTCDay()];
}

/** Data de hoje em Brasília, no formato 'AAAA-MM-DD'. */
export function hojeISO(agora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora);
}

/** Diferença em dias de calendário entre duas datas 'AAAA-MM-DD'. */
export function diasEntre(deISO, ateISO) {
  return Math.round((instante(ateISO, '12:00') - instante(deISO, '12:00')) / 86400000);
}

/** Hora 'HH:MM' → '8h15' ou '15h'. */
export function formatarHora(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

/** Texto da contagem regressiva até um instante. */
export function textoContagem(alvo, agora = new Date()) {
  const ms = alvo - agora;
  if (ms <= 0) return 'a prova já começou ou já passou';
  const totalMin = Math.floor(ms / 60000);
  const dias = Math.floor(totalMin / 1440);
  const horas = Math.floor((totalMin % 1440) / 60);
  const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
  if (dias >= 1) return `faltam ${plural(dias, 'dia', 'dias')} e ${plural(horas, 'hora', 'horas')}`;
  const min = totalMin % 60;
  return `faltam ${plural(horas, 'hora', 'horas')} e ${plural(min, 'minuto', 'minutos')}`;
}

/**
 * Próximos prazos do cronograma oficial.
 * Considera um evento "em aberto" até 23h59 do dia final (ou até horaFim).
 */
export function proximosEventos(eventos, { agora = new Date(), cargos = ['AA', 'TI'], limite = 4 } = {}) {
  return eventos
    .filter((e) => e.relevantePara?.some((c) => cargos.includes(c)))
    .filter((e) => instante(e.dataFim, e.horaFim ?? '23:59') >= agora)
    .sort((a, b) => a.dataInicio.localeCompare(b.dataInicio) || a.dataFim.localeCompare(b.dataFim))
    .slice(0, limite)
    .map((e) => {
      const inicio = instante(e.dataInicio, e.horaInicio ?? '00:00');
      const hoje = hojeISO(agora);
      const emAndamento = inicio <= agora;
      const situacao = emAndamento
        ? (e.dataInicio === e.dataFim ? 'é hoje' : `em andamento, termina em ${formatarDiasRestantes(diasEntre(hoje, e.dataFim))}`)
        : `começa em ${formatarDiasRestantes(diasEntre(hoje, e.dataInicio))}`;
      return { ...e, emAndamento, situacao };
    });
}

function formatarDiasRestantes(n) {
  if (n <= 0) return 'hoje';
  if (n === 1) return '1 dia (amanhã)';
  return `${n} dias`;
}

/** Período de um evento por extenso: '06/11/2026 a 07/12/2026' ou '24/01/2027'. */
export function periodo(e) {
  return e.dataInicio === e.dataFim ? formatarData(e.dataInicio) : `${formatarData(e.dataInicio)} a ${formatarData(e.dataFim)}`;
}
