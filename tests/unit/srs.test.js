// Testes do FSRS (via ts-fsrs), da fila do dia e das estatísticas.
import { describe, it, expect } from 'vitest';
import { agendar, previsoes, ehNovo, textoIntervalo } from '../../src/logica/srs.js';
import { montarFila, estatisticas, previsao7Dias, novosVistosHoje } from '../../src/logica/fila.js';

const T0 = new Date('2026-11-15T12:00:00-03:00');
const mais = (d, min) => new Date(d.getTime() + min * 60000);

describe('FSRS', () => {
  it('cartão novo: Errei, Difícil e Bom ficam para hoje; Fácil vai para dias depois', () => {
    const p = previsoes(null, T0);
    expect(p[1]).toBe(1);
    expect(p[2]).toBe(6);
    expect(p[3]).toBe(10);
    expect(p[4]).toBeGreaterThanOrEqual(1440 * 2);
  });

  it('agendar devolve estado serializável e intervalos em minutos', () => {
    const r = agendar(null, 3, T0);
    expect(typeof r.estadoSRS.due).toBe('string');
    expect(r.proximaRevisao).toBe(mais(T0, 10).toISOString());
    expect(r.intervaloAnterior).toBe(0);
    expect(r.intervaloNovo).toBe(10);
    expect(ehNovo(null)).toBe(true);
    expect(ehNovo(r.estadoSRS)).toBe(false);
    // Sobrevive a JSON (backup) e continua funcionando.
    const copia = JSON.parse(JSON.stringify(r.estadoSRS));
    const r2 = agendar(copia, 3, mais(T0, 10));
    expect(r2.intervaloNovo).toBeGreaterThanOrEqual(1440);
  });

  it('acertar seguidamente aumenta o intervalo; errar diminui', () => {
    let estado = null;
    let agora = T0;
    const intervalos = [];
    for (let i = 0; i < 5; i++) {
      const r = agendar(estado, 3, agora);
      intervalos.push(r.intervaloNovo);
      estado = r.estadoSRS;
      agora = new Date(r.proximaRevisao);
    }
    for (let i = 2; i < intervalos.length; i++) expect(intervalos[i]).toBeGreaterThan(intervalos[i - 1]);
    const erro = agendar(estado, 1, agora);
    expect(erro.intervaloNovo).toBeLessThan(intervalos.at(-1));
    expect(erro.estadoSRS.lapses).toBe(1);
  });

  it('recusa nota inválida', () => {
    expect(() => agendar(null, 5, T0)).toThrow();
  });

  it('textoIntervalo', () => {
    expect(textoIntervalo(1)).toBe('1 minuto');
    expect(textoIntervalo(10)).toBe('10 minutos');
    expect(textoIntervalo(180)).toBe('3 horas');
    expect(textoIntervalo(1440 * 8)).toBe('8 dias');
    expect(textoIntervalo(1440 * 60)).toBe('2 meses');
  });
});

describe('fila do dia', () => {
  const cartao = (id, extra = {}) => ({ id, topicoId: 'POR-01', criadoEm: `2026-11-0${id.length}T00:00:00Z`, estadoSRS: null, proximaRevisao: null, suspenso: false, ...extra });
  const revisado = (id, dueISO) => cartao(id, { estadoSRS: { state: 2, due: dueISO }, proximaRevisao: dueISO });

  it('mostra só vencidos até o fim de hoje e novos dentro do limite', () => {
    const cartoes = [
      revisado('venc1', '2026-11-14T10:00:00.000Z'), // atrasado
      revisado('venc2', '2026-11-16T02:00:00.000Z'), // 23h de hoje em Brasília
      revisado('futuro', '2026-11-16T03:30:00.000Z'), // 00h30 de amanhã
      cartao('n1'), cartao('n22'), cartao('n333'),
      cartao('susp', { suspenso: true }),
    ];
    const f = montarFila(cartoes, { agora: T0, limiteNovos: 2 });
    expect(f.vencidos.map((c) => c.id)).toEqual(['venc1', 'venc2']);
    expect(f.novos.map((c) => c.id)).toEqual(['n1', 'n22']);
    expect(f.fila).toHaveLength(4);
    expect(f.novosForaDoLimite).toBe(1);
  });

  it('desconta os novos já vistos hoje', () => {
    const logs = [{ data: T0.toISOString(), eraNovo: true, nota: 3 }, { data: '2026-11-14T15:00:00Z', eraNovo: true, nota: 3 }];
    expect(novosVistosHoje(logs, T0)).toBe(1);
    const f = montarFila([cartao('a'), cartao('bb')], { agora: T0, limiteNovos: 2, logs });
    expect(f.novos).toHaveLength(1);
  });

  it('respeita o filtro (ex.: por disciplina)', () => {
    const f = montarFila([cartao('a'), cartao('bb', { topicoId: 'ETI-01' })], { agora: T0, filtro: (c) => c.topicoId.startsWith('ETI') });
    expect(f.fila.map((c) => c.id)).toEqual(['bb']);
  });
});

describe('estatísticas e previsão', () => {
  it('conta revisões de hoje e taxa de acerto (acerto = nota 2 a 4)', () => {
    const logs = [
      { data: T0.toISOString(), nota: 1 }, { data: T0.toISOString(), nota: 3 },
      { data: T0.toISOString(), nota: 2 }, { data: '2026-11-10T12:00:00Z', nota: 4 },
    ];
    const e = estatisticas(logs, T0);
    expect(e.revisadosHoje).toBe(3);
    expect(e.taxaHoje).toBeCloseTo(200 / 3, 10);
    expect(e.taxaTotal).toBe(75);
    expect(estatisticas([], T0).taxaHoje).toBeNull();
  });

  it('previsão de 7 dias põe atrasados em hoje e ignora novos', () => {
    const c = (due) => ({ estadoSRS: { state: 2 }, proximaRevisao: due });
    const p = previsao7Dias([
      c('2026-11-10T12:00:00Z'), c('2026-11-15T20:00:00Z'), c('2026-11-17T12:00:00Z'), c('2026-11-30T12:00:00Z'),
      { estadoSRS: null, proximaRevisao: null },
    ], T0);
    expect(p.map((d) => d.data)).toEqual(['2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21']);
    expect(p.map((d) => d.quantidade)).toEqual([2, 0, 1, 0, 0, 0, 0]);
  });
});
