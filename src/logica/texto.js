// Utilidades de texto: busca sem acento, trecho de resultado, edição de Markdown e CSV.

// ---------- Busca ----------
/** Minúsculas e sem acentos, mantendo o mesmo número de caracteres (para achar a posição no original). */
export function normalizar(texto) {
  let saida = '';
  for (const c of String(texto ?? '')) {
    const n = c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    saida += n.length === c.length ? n : c.toLowerCase().slice(0, c.length).padEnd(c.length, ' ');
  }
  return saida;
}

/**
 * Trecho em volta da primeira ocorrência do termo (busca sem acento e sem caixa).
 * @returns {{antes: string, achado: string, depois: string} | null}
 */
export function trechoComTermo(texto, termo, raio = 60) {
  const t = normalizar(termo.trim());
  if (!t) return null;
  const i = normalizar(texto).indexOf(t);
  if (i < 0) return null;
  const ini = Math.max(0, i - raio);
  const fim = Math.min(texto.length, i + t.length + raio);
  const limpar = (s) => s.replace(/\s+/g, ' ');
  return {
    antes: (ini > 0 ? '…' : '') + limpar(texto.slice(ini, i)),
    achado: texto.slice(i, i + t.length),
    depois: limpar(texto.slice(i + t.length, fim)) + (fim < texto.length ? '…' : ''),
  };
}

// ---------- Edição de Markdown ----------
/**
 * Põe (ou tira) uma marca em volta da seleção: ** para negrito, == para destaque.
 * Sem seleção, insere a marca com um texto de exemplo selecionado.
 * @returns {{texto: string, ini: number, fim: number, removeu: boolean}}
 */
export function alternarMarca(texto, ini, fim, marca, exemplo = 'texto') {
  const m = marca.length;
  if (ini >= m && texto.slice(ini - m, ini) === marca && texto.slice(fim, fim + m) === marca) {
    return { texto: texto.slice(0, ini - m) + texto.slice(ini, fim) + texto.slice(fim + m), ini: ini - m, fim: fim - m, removeu: true };
  }
  const sel = texto.slice(ini, fim);
  if (sel.length > 2 * m && sel.startsWith(marca) && sel.endsWith(marca)) {
    const miolo = sel.slice(m, -m);
    return { texto: texto.slice(0, ini) + miolo + texto.slice(fim), ini, fim: ini + miolo.length, removeu: true };
  }
  const conteudo = sel || exemplo;
  return {
    texto: texto.slice(0, ini) + marca + conteudo + marca + texto.slice(fim),
    ini: ini + m,
    fim: ini + m + conteudo.length,
    removeu: false,
  };
}

/**
 * Põe (ou tira) um prefixo no começo de cada linha da seleção: "- " para lista, "## " para título.
 * @returns {{texto: string, ini: number, fim: number, removeu: boolean}}
 */
export function alternarPrefixo(texto, ini, fim, prefixo) {
  const comeco = texto.lastIndexOf('\n', ini - 1) + 1;
  let final = texto.indexOf('\n', Math.max(fim - (fim > ini && texto[fim - 1] === '\n' ? 1 : 0), comeco));
  if (final < 0) final = texto.length;
  const linhas = texto.slice(comeco, final).split('\n');
  const todasTem = linhas.every((l) => l.startsWith(prefixo));
  // Ao trocar de tipo (ex.: "# " → "## "), tira os prefixos de título ou lista anteriores.
  const novas = todasTem
    ? linhas.map((l) => l.slice(prefixo.length))
    : linhas.map((l) => prefixo + l.replace(/^(#{1,6} |- |\* )/, ''));
  const bloco = novas.join('\n');
  return { texto: texto.slice(0, comeco) + bloco + texto.slice(final), ini: comeco, fim: comeco + bloco.length, removeu: todasTem };
}

// ---------- CSV de cartões ----------
/** Divide uma linha por ";" respeitando aspas ("texto com ; dentro" e "" para aspas). */
export function dividirLinhaCSV(linha, separador = ';') {
  const campos = [];
  let atual = '';
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (aspas) {
      if (c === '"' && linha[i + 1] === '"') { atual += '"'; i++; } else if (c === '"') aspas = false; else atual += c;
    } else if (c === '"' && atual.trim() === '') { aspas = true; atual = ''; } else if (c === separador) { campos.push(atual.trim()); atual = ''; } else atual += c;
  }
  campos.push(atual.trim());
  return campos;
}

/**
 * Lê cartões em lote. Formato de cada linha: frente;verso;código_do_tópico[;explicação]
 * - Linhas vazias e linhas começando com # são ignoradas; uma primeira linha "frente;verso;..." também.
 * - Se o verso for "Certo" ou "Errado", o cartão vira do tipo "certo ou errado".
 * @param {string} texto
 * @param {Set<string>} codigosValidos
 */
export function lerCartoesCSV(texto, codigosValidos) {
  const cartoes = [];
  const erros = [];
  const linhas = String(texto).replace(/^﻿/, '').split(/\r?\n/);
  linhas.forEach((bruta, i) => {
    const n = i + 1;
    const linha = bruta.trim();
    if (!linha || linha.startsWith('#')) return;
    if (i === 0 && /^frente\s*;/i.test(linha)) return;
    const [frente = '', verso = '', codigoBruto = '', explicacao = ''] = dividirLinhaCSV(linha);
    const codigo = codigoBruto.toUpperCase();
    if (!frente) return erros.push({ linha: n, mensagem: 'a frente está vazia.' });
    if (!verso) return erros.push({ linha: n, mensagem: 'o verso está vazio.' });
    if (!codigo) return erros.push({ linha: n, mensagem: 'falta o código do tópico (ex.: POR-16).' });
    if (!codigosValidos.has(codigo)) return erros.push({ linha: n, mensagem: `o tópico ${codigo} não existe.` });
    const ce = verso.toLowerCase();
    const certoErrado = ce === 'certo' || ce === 'errado';
    cartoes.push({
      topicoId: codigo,
      tipo: certoErrado ? 'certo-errado' : 'frente-verso',
      frente,
      verso: certoErrado ? (ce === 'certo' ? 'Certo' : 'Errado') : verso,
      explicacao,
    });
  });
  return { cartoes, erros };
}

/** Nome de arquivo seguro: "POR-16 - crase emprego do acento grave". */
export function nomeArquivoSeguro(texto, max = 60) {
  return normalizar(texto).replace(/[^a-z0-9 -]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max).trim();
}
