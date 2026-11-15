// Testes do cronograma automático (critério de aceite 5 e regras da seção 4.4).
import { describe, it, expect } from 'vitest';
import seed from '../../src/dados/seed.json';
import { PESOS_STATUS_PADRAO } from '../../src/logica/constantes.js';
import {
  gerarPlano, topicosPendentes, fatorConfianca, somarDias, siglaDia, inicioDaSemana, blocosMantidos, blocosAtrasados,
} from '../../src/logica/cronograma.js';

const HORAS_PADRAO = { seg: 2, ter: 2, qua: 2, qui: 2, sex: 2, sab: 3, dom: 1 };
const base = (extra = {}) => ({
  inicio: '2026-11-15', dataProva: '2027-01-24', horas: HORAS_PADRAO, bloqueados: [], duracao: 50, percRevisao: 20,
  diasRetaFinal: 7, blocosPorTopico: 3, topicos: seed.topico, disciplinas: seed.disciplina, progresso: new Map(),
  pesosStatus: PESOS_STATUS_PADRAO, cargos: ['AA', 'TI'], ...extra,
});
const prog = (pares) => new Map(pares.map(([id, status, confianca = null, statusAlteradoEm]) => [id, { id, status, confianca, statusAlteradoEm }]));

describe('datas do cronograma', () => {
  it('soma dias, dia da semana e início da semana', () => {
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(siglaDia('2027-01-24')).toBe('dom');
    expect(inicioDaSemana('2026-11-15')).toBe('2026-11-09'); // domingo → segunda anterior
    expect(inicioDaSemana('2026-11-16')).toBe('2026-11-16');
  });

  it('fator de confiança', () => {
    expect(fatorConfianca(5)).toBe(1);
    expect(fatorConfianca(1)).toBe(2);
    expect(fatorConfianca(null)).toBe(1.5);
  });
});

describe('prioridade e demanda', () => {
  it('tópico compartilhado soma o peso nos dois cargos; Dominado sai da lista', () => {
    const lista = topicosPendentes(base({ progresso: prog([['POR-02', 'dominado']]) }));
    const por16 = lista.find((t) => t.id === 'POR-16');
    expect(por16.peso).toBeCloseTo(1.5 / 20 + 1.5 / 27, 10);
    expect(lista.find((t) => t.id === 'POR-02')).toBeUndefined();
    expect(lista).toHaveLength(83);
    // Só AA: 52 tópicos e peso de um cargo.
    const aa = topicosPendentes(base({ cargos: ['AA'] }));
    expect(aa).toHaveLength(52);
    expect(aa.find((t) => t.id === 'POR-16').peso).toBeCloseTo(0.075, 10);
  });

  it('prioridade = peso × (1 − progresso) × fator; demanda pelo progresso', () => {
    const lista = topicosPendentes(base({ cargos: ['AA'], progresso: prog([['EAA-01', 'questoes', 1]]) }));
    const t = lista.find((x) => x.id === 'EAA-01');
    expect(t.prioridade).toBeCloseTo((6.25 / 16) * 0.3 * 2, 10);
    expect(t.demanda).toBe(1); // 3 × 0,3 = 0,9 → 1
    expect(lista.find((x) => x.id === 'EAA-02').demanda).toBe(3);
  });

  it('blocos feitos depois da última mudança de status reduzem a demanda (mínimo 1)', () => {
    const feitos = [
      { topicoId: 'POR-01', data: '2026-11-10', situacao: 'feito' },
      { topicoId: 'POR-01', data: '2026-11-11', situacao: 'parcial' },
      { topicoId: 'POR-01', data: '2026-11-12', situacao: 'parcial' },
      { topicoId: 'POR-01', data: '2026-11-13', situacao: 'pulado' },
    ];
    const t = topicosPendentes(base({ blocosExistentes: feitos })).find((x) => x.id === 'POR-01');
    expect(t.demanda).toBe(1); // 3 − 2
    const depois = topicosPendentes(base({ blocosExistentes: feitos, progresso: prog([['POR-01', 'nao-iniciado', null, '2026-11-12T10:00:00Z']]) }))
      .find((x) => x.id === 'POR-01');
    expect(depois.demanda).toBe(3); // só o parcial do dia 12 conta (0,5 → 0)
  });
});

describe('gerarPlano', () => {
  const plano = gerarPlano(base());
  const datas = [...new Set(plano.blocos.map((b) => b.data))].sort();

  it('gera blocos de hoje até 23/01/2027 (véspera), nada no dia da prova', () => {
    expect(datas[0]).toBe('2026-11-15');
    expect(datas.at(-1)).toBe('2027-01-23');
    expect(plano.blocos.some((b) => b.data >= '2027-01-24')).toBe(false);
  });

  it('a última semana (17 a 23/01) só tem revisão e simulados', () => {
    const reta = plano.blocos.filter((b) => b.data >= '2027-01-17');
    expect(reta.length).toBeGreaterThan(0);
    expect(reta.every((b) => ['revisao', 'revisao-geral', 'simulado'].includes(b.tipo))).toBe(true);
    expect(reta.some((b) => b.tipo === 'simulado')).toBe(true);
    expect(reta.filter((b) => b.data === '2027-01-23').every((b) => b.tipo !== 'simulado')).toBe(true);
    expect(plano.blocos.filter((b) => b.data < '2027-01-17').some((b) => b.tipo === 'simulado')).toBe(false);
    expect(plano.resumo.inicioReta).toBe('2027-01-17');
  });

  it('cada dia: minutos somam as horas disponíveis; revisão de flashcards ≈ 20%', () => {
    const dia = (d) => plano.blocos.filter((b) => b.data === d);
    const seg = dia('2026-11-16'); // segunda, 2 h
    expect(seg.reduce((s, b) => s + b.minutosPlanejados, 0)).toBe(120);
    // 120 min: 24 de revisão, 96 de estudo → 1 bloco de 50 + um bloco menor de 46.
    expect(seg.map((b) => [b.tipo, b.minutosPlanejados])).toEqual([['revisao', 24], ['estudo', 50], ['estudo', 46]]);
    const dom = dia('2026-11-15'); // domingo, 1 h: 12 + 48 (48 ≥ 25 → bloco curto)
    expect(dom.map((b) => [b.tipo, b.minutosPlanejados])).toEqual([['revisao', 12], ['estudo', 48]]);
  });

  it('nunca mais de 2 blocos seguidos da mesma disciplina no mesmo dia', () => {
    const p = gerarPlano(base({ horas: { seg: 6, ter: 6, qua: 6, qui: 6, sex: 6, sab: 8, dom: 4 } }));
    const porDia = new Map();
    for (const b of p.blocos.filter((x) => x.tipo === 'estudo')) {
      if (!porDia.has(b.data)) porDia.set(b.data, []);
      porDia.get(b.data).push(b.disciplinaId);
    }
    for (const seq of porDia.values()) {
      for (let i = 2; i < seq.length; i++) expect(seq[i] === seq[i - 1] && seq[i] === seq[i - 2]).toBe(false);
    }
  });

  it('dias bloqueados ficam vazios', () => {
    const p = gerarPlano(base({ bloqueados: ['2026-12-24', '2026-12-25'] }));
    expect(p.blocos.some((b) => b.data === '2026-12-24' || b.data === '2026-12-25')).toBe(false);
  });

  it('com 2 h por dia o tempo não basta: avisa e sugere horas por semana', () => {
    expect(plano.resumo.demandaTotal).toBe(84 * 3);
    expect(plano.resumo.faltam).toBeGreaterThan(0);
    expect(plano.avisos[0]).toMatch(/não bastam: faltam \d+ blocos/);
    expect(plano.resumo.horasSemanaNecessarias).toBeGreaterThan(plano.resumo.horasSemanaAtuais);
    // Os tópicos de maior peso recebem blocos antes: todos os de Específicos estão no plano.
    const cobertos = new Set(plano.blocos.filter((b) => b.topicoId).map((b) => b.topicoId));
    for (const t of seed.topico.filter((x) => x.disciplinaId === 'EAA' || x.disciplinaId === 'ETI')) expect(cobertos.has(t.id)).toBe(true);
  });

  it('com as horas sugeridas, cobre tudo e não avisa', () => {
    const h = plano.resumo.horasSemanaNecessarias / 7 + 0.5;
    const p = gerarPlano(base({ horas: { seg: h, ter: h, qua: h, qui: h, sex: h, sab: h, dom: h } }));
    expect(p.resumo.faltam).toBe(0);
    expect(p.avisos).toEqual([]);
    const porTopico = new Map();
    for (const b of p.blocos.filter((x) => x.topicoId)) porTopico.set(b.topicoId, (porTopico.get(b.topicoId) ?? 0) + 1);
    expect(porTopico.size).toBe(84);
    expect([...porTopico.values()].every((n) => n === 3)).toBe(true);
    // Sobra vira revisão geral, não estudo sem tópico.
    expect(p.blocos.some((b) => b.tipo === 'estudo' && !b.topicoId)).toBe(false);
  });

  it('início depois da prova: sem blocos e com aviso', () => {
    const p = gerarPlano(base({ inicio: '2027-01-24' }));
    expect(p.blocos).toEqual([]);
    expect(p.avisos[0]).toMatch(/Não há dias/);
  });
});

describe('replanejar', () => {
  it('mantém o histórico e os blocos marcados hoje; 3 pulados voltam a ser distribuídos', () => {
    const hoje = '2026-11-20';
    const original = gerarPlano(base({ inicio: '2026-11-16' })).blocos.map((b, i) => ({ ...b, id: `b${i}` }));
    // Dias 16 a 19: tudo feito. Hoje (20): 3 blocos pulados.
    for (const b of original) if (b.data < hoje) b.situacao = 'feito';
    const deHoje = original.filter((b) => b.data === hoje);
    const pulados = deHoje.slice(0, 3);
    for (const b of pulados) b.situacao = 'pulado';
    const topicosPulados = pulados.filter((b) => b.topicoId).map((b) => b.topicoId);

    const mantidos = blocosMantidos(original, hoje);
    expect(mantidos.every((b) => b.data < hoje || b.situacao === 'pulado')).toBe(true);
    expect(blocosAtrasados(original, hoje)).toEqual([]);

    const novo = gerarPlano(base({ inicio: hoje, blocosExistentes: mantidos }));
    // Hoje não ganha mais minutos que o disponível (os pulados já ocuparam o horário).
    const minutosHoje = [...mantidos, ...novo.blocos].filter((b) => b.data === hoje).reduce((s, b) => s + b.minutosPlanejados, 0);
    expect(minutosHoje).toBeLessThanOrEqual(120);
    // Os tópicos dos blocos pulados aparecem de novo no plano.
    for (const id of topicosPulados) expect(novo.blocos.some((b) => b.topicoId === id)).toBe(true);
    // A numeração dos blocos de hoje continua depois dos mantidos.
    const ordensHoje = novo.blocos.filter((b) => b.data === hoje).map((b) => b.ordem);
    if (ordensHoje.length) expect(Math.min(...ordensHoje)).toBeGreaterThan(Math.max(...pulados.map((b) => b.ordem)));
    expect(novo.avisos[0]).toMatch(/não bastam/);
  });
});
