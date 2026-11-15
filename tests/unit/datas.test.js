// Testes das funções de data (horário de Brasília).
import { describe, it, expect } from 'vitest';
import seed from '../../src/dados/seed.json';
import { instante, formatarData, diaDaSemana, hojeISO, textoContagem, proximosEventos, diasEntre } from '../../src/logica/datas.js';

describe('datas', () => {
  it('24/01/2027 é domingo', () => {
    expect(diaDaSemana('2027-01-24')).toBe('domingo');
  });

  it('converte horário de Brasília para UTC', () => {
    expect(instante('2027-01-24', '08:15').toISOString()).toBe('2027-01-24T11:15:00.000Z');
  });

  it('formata datas sem erro de fuso', () => {
    expect(formatarData('2027-01-24')).toBe('24/01/2027');
    expect(hojeISO(new Date('2026-11-15T02:30:00Z'))).toBe('2026-11-14'); // 23h30 em Brasília
  });

  it('conta dias e horas até a prova', () => {
    const agora = new Date('2027-01-22T08:15:00-03:00');
    expect(textoContagem(instante('2027-01-24', '08:15'), agora)).toBe('faltam 2 dias e 0 horas');
    expect(textoContagem(instante('2027-01-24', '08:15'), instante('2027-01-24', '07:00'))).toBe('faltam 1 hora e 15 minutos');
    expect(diasEntre('2026-11-14', '2027-01-24')).toBe(71);
  });

  it('próximos prazos: inscrições em andamento e títulos só para TI', () => {
    const agora = new Date('2026-11-14T23:00:00-03:00');
    const ambos = proximosEventos(seed.eventoEdital, { agora, limite: 10 });
    expect(ambos[0].titulo).toMatch(/^Inscrições/);
    expect(ambos[0].emAndamento).toBe(true);
    expect(ambos.some((e) => /isenção da taxa$/.test(e.titulo))).toBe(false); // terminou em 10/11

    const soAA = proximosEventos(seed.eventoEdital, { agora: new Date('2027-01-14T10:00:00-03:00'), cargos: ['AA'], limite: 10 });
    expect(soAA.some((e) => /Títulos/.test(e.titulo))).toBe(false);
    const soTI = proximosEventos(seed.eventoEdital, { agora: new Date('2027-01-14T10:00:00-03:00'), cargos: ['TI'], limite: 10 });
    expect(soTI.some((e) => /Títulos/.test(e.titulo))).toBe(true);
  });
});
