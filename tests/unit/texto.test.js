// Testes de busca, edição de Markdown e leitura de CSV.
import { describe, it, expect } from 'vitest';
import { normalizar, trechoComTermo, alternarMarca, alternarPrefixo, lerCartoesCSV, dividirLinhaCSV, nomeArquivoSeguro } from '../../src/logica/texto.js';

describe('busca', () => {
  it('ignora acentos e caixa e mantém o tamanho', () => {
    expect(normalizar('Regência VERBAL')).toBe('regencia verbal');
    expect(normalizar('ação').length).toBe('ação'.length);
  });

  it('acha o trecho no texto original', () => {
    const t = trechoComTermo('A crase ocorre antes de palavra feminina. Exceção: antes de verbo.', 'EXCECAO', 10);
    expect(t.achado).toBe('Exceção');
    expect(t.antes).toBe('…feminina. ');
    expect(trechoComTermo('nada aqui', 'crase')).toBeNull();
  });
});

describe('edição de Markdown', () => {
  it('negrito na seleção e de volta', () => {
    const a = alternarMarca('a crase b', 2, 7, '**');
    expect(a.texto).toBe('a **crase** b');
    expect(a.texto.slice(a.ini, a.fim)).toBe('crase');
    const b = alternarMarca(a.texto, a.ini, a.fim, '**');
    expect(b.texto).toBe('a crase b');
    expect(b.removeu).toBe(true);
  });

  it('sem seleção insere exemplo selecionado', () => {
    const r = alternarMarca('ab', 1, 1, '==', 'destaque');
    expect(r.texto).toBe('a==destaque==b');
    expect(r.texto.slice(r.ini, r.fim)).toBe('destaque');
  });

  it('lista em várias linhas, e título troca o prefixo', () => {
    const r = alternarPrefixo('x\num\ndois\ny', 2, 8, '- ');
    expect(r.texto).toBe('x\n- um\n- dois\ny');
    expect(alternarPrefixo(r.texto, 4, 4, '- ').texto).toBe('x\num\n- dois\ny');
    expect(alternarPrefixo('# Crase', 0, 0, '## ').texto).toBe('## Crase');
  });
});

describe('CSV de cartões', () => {
  const validos = new Set(['POR-16', 'LEG-01']);

  it('lê linhas, aspas, certo/errado e aponta erros por linha', () => {
    const texto = [
      'frente;verso;codigo',
      'O que é crase?;Fusão de a + a;por-16',
      '"Usa-se crase antes de verbo; certo?";Errado;POR-16;Nunca antes de verbo',
      '',
      '# comentário',
      'Sem tópico;resposta;',
      'Tópico errado;resposta;XYZ-99',
    ].join('\n');
    const { cartoes, erros } = lerCartoesCSV(texto, validos);
    expect(cartoes).toHaveLength(2);
    expect(cartoes[0]).toMatchObject({ topicoId: 'POR-16', tipo: 'frente-verso', verso: 'Fusão de a + a' });
    expect(cartoes[1]).toMatchObject({ tipo: 'certo-errado', verso: 'Errado', frente: 'Usa-se crase antes de verbo; certo?', explicacao: 'Nunca antes de verbo' });
    expect(erros).toEqual([
      { linha: 6, mensagem: 'falta o código do tópico (ex.: POR-16).' },
      { linha: 7, mensagem: 'o tópico XYZ-99 não existe.' },
    ]);
  });

  it('aspas duplicadas viram aspas', () => {
    expect(dividirLinhaCSV('"diga ""oi"" a";b')).toEqual(['diga "oi" a', 'b']);
  });

  it('nome de arquivo seguro', () => {
    expect(nomeArquivoSeguro('POR-16 Crase (emprego do acento grave)')).toBe('por-16 crase emprego do acento grave');
  });
});
