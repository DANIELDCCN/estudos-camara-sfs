// Testes do cálculo de progresso, com conferência manual dos números.
import { describe, it, expect } from 'vitest';
import seed from '../../src/dados/seed.json';
import { criarCalculadora, pesosDosTopicos } from '../../src/logica/progresso.js';

const base = (progresso = new Map()) => criarCalculadora({ topicos: seed.topico, disciplinas: seed.disciplina, progresso });
const comStatus = (pares) => new Map(pares.map(([id, status]) => [id, { id, status }]));

describe('seed', () => {
  it('tem 84 tópicos, 52 de AA, 68 de TI e 36 compartilhados', () => {
    const t = seed.topico;
    expect(t).toHaveLength(84);
    expect(t.filter((x) => x.cargos.includes('AA'))).toHaveLength(52);
    expect(t.filter((x) => x.cargos.includes('TI'))).toHaveLength(68);
    expect(t.filter((x) => x.cargos.length === 2)).toHaveLength(36);
    expect(new Set(t.map((x) => x.id)).size).toBe(84);
  });

  it('tem os totais por disciplina da seção 8', () => {
    const conta = (d, c) => seed.topico.filter((t) => t.disciplinaId === d && t.cargos.includes(c)).length;
    expect([conta('POR', 'AA'), conta('POR', 'TI')]).toEqual([20, 27]);
    expect([conta('RLM', 'AA'), conta('RLM', 'TI')]).toEqual([12, 15]);
    expect([conta('LEG', 'AA'), conta('LEG', 'TI')]).toEqual([4, 7]);
    expect(conta('EAA', 'AA')).toBe(16);
    expect(conta('ETI', 'TI')).toBe(19);
  });

  it('os pesos de cada cargo somam 10 (nota máxima da objetiva)', () => {
    const pesos = pesosDosTopicos(seed.topico, seed.disciplina);
    for (const c of ['AA', 'TI']) {
      const soma = [...pesos.values()].reduce((s, p) => s + (p[c] ?? 0), 0);
      expect(soma).toBeCloseTo(10, 10);
    }
  });
});

describe('progresso', () => {
  it('começa em zero', () => {
    const r = base().resumo({ cargos: ['AA', 'TI'] });
    expect(r).toMatchObject({ total: 84, concluidos: 0, pctSimples: 0, pctPonderado: 0 });
  });

  it('POR-16 "Revisado" sobe Português nos dois cargos e conta uma vez no geral', () => {
    const calc = base(comStatus([['POR-16', 'revisado']]));
    const porAA = calc.resumo({ cargos: ['AA'], disciplinaId: 'POR' });
    const porTI = calc.resumo({ cargos: ['TI'], disciplinaId: 'POR' });
    expect(porAA).toMatchObject({ total: 20, concluidos: 1 });
    expect(porTI).toMatchObject({ total: 27, concluidos: 1 });
    expect(porAA.pctSimples).toBeCloseTo(5, 10); // 1/20
    expect(porTI.pctSimples).toBeCloseTo(100 / 27, 10); // 1/27
    // Dentro de uma disciplina e um cargo, o ponderado é a média dos status: 0,9/20 e 0,9/27.
    expect(porAA.pctPonderado).toBeCloseTo(4.5, 10);
    expect(porTI.pctPonderado).toBeCloseTo(90 / 27, 10);

    const geral = calc.resumo({ cargos: ['AA', 'TI'] });
    expect(geral).toMatchObject({ total: 84, concluidos: 1 });
    expect(geral.pctSimples).toBeCloseTo(100 / 84, 10);

    // Conferência manual do ponderado:
    // peso de POR-16 no AA = 1,5/20 = 0,075; no TI = 1,5/27 ≈ 0,05556
    // AA: 0,075 × 0,9 / 10 = 0,675%     TI: 0,05556 × 0,9 / 10 = 0,5%
    // Geral (soma dos dois pesos ÷ 20) = (0,0675 + 0,05) / 20 = 0,5875%
    expect(calc.resumo({ cargos: ['AA'] }).pctPonderado).toBeCloseTo(0.675, 10);
    expect(calc.resumo({ cargos: ['TI'] }).pctPonderado).toBeCloseTo(0.5, 10);
    expect(geral.pctPonderado).toBeCloseTo(0.5875, 10);
  });

  it('o ponderado geral é a média dos dois cargos', () => {
    const calc = base(comStatus([['EAA-01', 'dominado'], ['ETI-04', 'teoria'], ['RLM-12', 'questoes'], ['LEG-01', 'revisado']]));
    const aa = calc.resumo({ cargos: ['AA'] }).pctPonderado;
    const ti = calc.resumo({ cargos: ['TI'] }).pctPonderado;
    expect(calc.resumo({ cargos: ['AA', 'TI'] }).pctPonderado).toBeCloseTo((aa + ti) / 2, 10);
  });

  it('um tópico Dominado em Específicos de AA vale 6,25/16 da nota', () => {
    const calc = base(comStatus([['EAA-01', 'dominado']]));
    expect(calc.resumo({ cargos: ['AA'] }).pctPonderado).toBeCloseTo((6.25 / 16) * 10, 10);
  });

  it('respeita pesos de status configurados', () => {
    const calc = criarCalculadora({
      topicos: seed.topico, disciplinas: seed.disciplina, progresso: comStatus([['POR-01', 'teoria']]),
      pesosStatus: { 'nao-iniciado': 0, teoria: 0.5, questoes: 0.7, revisado: 0.9, dominado: 1 },
    });
    expect(calc.resumo({ cargos: ['AA'], disciplinaId: 'POR' }).pctPonderado).toBeCloseTo(2.5, 10); // 0,5/20
  });

  it('ignora tópicos ocultos e redistribui o peso', () => {
    const topicos = seed.topico.map((t) => (t.id === 'EAA-16' ? { ...t, oculto: true } : t));
    const calc = criarCalculadora({ topicos, disciplinas: seed.disciplina, progresso: comStatus([['EAA-01', 'dominado']]) });
    const r = calc.resumo({ cargos: ['AA'], disciplinaId: 'EAA' });
    expect(r.total).toBe(15);
    expect(calc.resumo({ cargos: ['AA'] }).pctPonderado).toBeCloseTo((6.25 / 15) * 10, 10);
  });
});
