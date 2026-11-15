// Testes do formato de backup, validação, migração e mesclagem.
import { describe, it, expect } from 'vitest';
import { montarBackup, validarBackup, migrar, mesclarRegistros, STORES, APP, VERSAO_ESQUEMA } from '../../src/logica/backup.js';

describe('backup', () => {
  it('monta o arquivo com app, versão, data e todos os stores', () => {
    const b = montarBackup({ topico: [{ id: 'POR-01' }] }, new Date('2026-11-14T12:00:00Z'));
    expect(b.app).toBe(APP);
    expect(b.versaoEsquema).toBe(VERSAO_ESQUEMA);
    expect(b.exportadoEm).toBe('2026-11-14T12:00:00.000Z');
    expect(Object.keys(b.dados)).toEqual(STORES);
    expect(validarBackup(b)).toBe(true);
  });

  it('recusa arquivos que não são backup do app', () => {
    expect(() => validarBackup(null)).toThrow();
    expect(() => validarBackup({ app: 'outro', versaoEsquema: 1, dados: {} })).toThrow(/não é um backup/);
    expect(() => validarBackup({ app: APP, versaoEsquema: 99, dados: {} })).toThrow(/versão mais nova/);
    expect(() => validarBackup({ app: APP, versaoEsquema: 1, dados: { topico: [{}] } })).toThrow(/sem "id"/);
  });

  it('migrar mantém um backup já na versão atual', () => {
    const b = montarBackup({});
    expect(migrar(b)).toEqual(b);
  });
});

describe('mesclar', () => {
  const r = (id, atualizadoEm, extra = {}) => ({ id, atualizadoEm, ...extra });

  it('vence o registro alterado por último e não duplica', () => {
    const existentes = [r('A', '2026-11-10T00:00:00Z', { status: 'teoria' }), r('B', '2026-11-12T00:00:00Z', { status: 'dominado' })];
    const recebidos = [r('A', '2026-11-11T00:00:00Z', { status: 'revisado' }), r('B', '2026-11-01T00:00:00Z', { status: 'teoria' }), r('C', '2026-11-01T00:00:00Z')];
    const m = mesclarRegistros(existentes, recebidos);
    expect(m.gravar.map((x) => x.id).sort()).toEqual(['A', 'C']);
    expect(m.gravar.find((x) => x.id === 'A').status).toBe('revisado');
    expect(m).toMatchObject({ novos: 1, atualizados: 1, mantidos: 1 });
  });

  it('importar o mesmo backup duas vezes não muda nada', () => {
    const dados = [r('A', '2026-11-10T00:00:00Z'), r('B', '2026-11-10T00:00:00Z')];
    const m = mesclarRegistros(dados, dados);
    expect(m.gravar).toHaveLength(0);
    expect(m.mantidos).toBe(2);
  });
});
