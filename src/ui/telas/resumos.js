// Tela "Resumos": lista com busca, editor de Markdown com pré-visualização e exportação.
// Endereços:
//   #/resumos                 lista e busca
//   #/resumos/topico/POR-16   abre o resumo do tópico (cria um novo se não houver)
//   #/resumos/<id>            abre um resumo específico
import { zipSync, strToU8 } from 'fflate';
import { h, novoId } from '../dom.js';
import { secao, tituloTela } from '../componentes.js';
import { anunciar, confirmar } from '../a11y.js';
import { renderizarMarkdown } from '../markdown.js';
import { seletorTopicos } from '../seletores.js';
import { abrirDialogoCartao } from '../cartao-dialogo.js';
import { estado, topicoPorId, resumosDoTopico, salvarResumo, excluirResumo } from '../../dados/repositorio.js';
import { baixarArquivo } from '../../dados/backup-arquivo.js';
import { trechoComTermo, alternarMarca, alternarPrefixo, nomeArquivoSeguro, normalizar } from '../../logica/texto.js';
import { hojeISO } from '../../logica/datas.js';
import { NOME_CARGO } from '../../logica/constantes.js';

export const titulo = 'Resumos';

let buscaAtual = '';

export function render(param = '') {
  if (!param) return lista();
  if (param.startsWith('topico/')) {
    const topicoId = param.slice(7).toUpperCase();
    const t = topicoPorId(topicoId);
    if (!t) return naoEncontrado(`O tópico ${topicoId} não existe.`);
    const doTopico = resumosDoTopico(topicoId);
    return editor(doTopico[0] ?? null, t);
  }
  const r = estado.resumos.find((x) => x.id === param);
  if (!r) return naoEncontrado('Este resumo não existe ou foi excluído.');
  return editor(r, topicoPorId(r.topicoId));
}

function naoEncontrado(msg) {
  return h('div', {}, tituloTela('Resumo não encontrado'), h('p', {}, msg), h('p', {}, h('a', { href: '#/resumos' }, 'Voltar para a lista de resumos')));
}

const rotuloTopico = (t) => `${t.id} ${t.titulo}`;
const cargosTexto = (t) => (t.cargos.length > 1 ? 'Ambos os cargos' : `Só ${NOME_CARGO[t.cargos[0]]}`);
const ordemTopico = (id) => topicoPorId(id)?.ordem ?? 9999;
const tituloPadrao = (t) => `Resumo – ${t.titulo}`;

// ---------- Lista e busca ----------
function lista() {
  const idBusca = novoId('busca-resumo');
  const resultado = h('div', {});
  const contagem = h('p', { class: 'contagem-topicos' });

  function desenhar(anunciarContagem) {
    const termo = buscaAtual.trim();
    const todos = [...estado.resumos].sort((a, b) => ordemTopico(a.topicoId) - ordemTopico(b.topicoId) || (a.criadoEm ?? '').localeCompare(b.criadoEm ?? ''));
    const itens = todos
      .map((r) => ({ r, t: topicoPorId(r.topicoId), trecho: termo ? trechoComTermo(`${r.titulo}\n${r.markdown}`, termo) : null }))
      .filter((x) => x.t && (!termo || x.trecho || normalizar(rotuloTopico(x.t)).includes(normalizar(termo))));
    contagem.textContent = termo
      ? `${itens.length} ${itens.length === 1 ? 'resumo encontrado' : 'resumos encontrados'} para "${termo}".`
      : `${itens.length} ${itens.length === 1 ? 'resumo' : 'resumos'} no total.`;
    if (anunciarContagem) anunciar(contagem.textContent);
    resultado.replaceChildren(itens.length
      ? h('ul', { class: 'lista-resumos' }, itens.map(({ r, t, trecho }) => h('li', {},
        h('h3', {}, h('a', { href: `#/resumos/${r.id}` }, r.titulo || tituloPadrao(t))),
        h('p', { class: 'tags' }, `${rotuloTopico(t)} · ${cargosTexto(t)}`),
        trecho ? h('p', {}, trecho.antes, h('mark', { class: 'achado' }, h('span', { class: 'sr-only' }, 'Encontrado: '), trecho.achado), trecho.depois) : null)))
      : h('p', {}, termo ? 'Nenhum resumo contém esse termo.' : 'Nenhum resumo ainda. Escolha um tópico abaixo para começar, ou use o link "Resumo" de um tópico no Edital.'));
  }

  const idNovo = novoId('novo-resumo');
  const seletor = seletorTopicos({ id: idNovo, opcaoVazia: 'Escolha o tópico' });
  const idErroNovo = novoId('erro-novo');
  const erroNovo = h('p', { id: idErroNovo, class: 'erro', hidden: true });

  const tela = h('div', {},
    tituloTela('Resumos'),
    h('form', { class: 'cartao', role: 'search', 'aria-label': 'Buscar nos resumos', onsubmit: (e) => e.preventDefault() },
      h('h2', {}, 'Buscar'),
      h('div', { class: 'campo' },
        h('label', { for: idBusca }, 'Palavra ou trecho (em todos os resumos)'),
        h('input', { id: idBusca, type: 'search', value: buscaAtual, autocomplete: 'off',
          oninput: debounce((e) => { buscaAtual = e.target.value; desenhar(true); }, 400) }))),
    h('section', { 'aria-labelledby': 'h-lista-resumos' }, h('h2', { id: 'h-lista-resumos' }, 'Meus resumos'), contagem, resultado),
    secao('Novo resumo',
      h('form', { onsubmit: (e) => {
        e.preventDefault();
        if (!seletor.value) {
          erroNovo.textContent = 'Erro: escolha um tópico.'; erroNovo.hidden = false;
          seletor.setAttribute('aria-invalid', 'true'); seletor.setAttribute('aria-describedby', idErroNovo); seletor.focus();
          return;
        }
        location.hash = `#/resumos/topico/${seletor.value}`;
      } },
      h('div', { class: 'campo' }, h('label', { for: idNovo }, 'Tópico do resumo'), seletor),
      erroNovo,
      h('button', { type: 'submit', class: 'botao botao-primario' }, 'Abrir ou criar resumo'))),
    secao('Exportar resumos',
      h('p', {}, 'Baixe os resumos em Markdown (.md), que abre em qualquer editor de texto.'),
      h('div', { class: 'linha-botoes' },
        h('button', { type: 'button', class: 'botao', onclick: exportarArquivoUnico }, 'Exportar num arquivo único (.md)'),
        h('button', { type: 'button', class: 'botao', onclick: exportarZip }, 'Exportar um arquivo por tópico (.zip)'))),
  );
  desenhar(false);
  return tela;
}

function resumosOrdenados() {
  return [...estado.resumos].filter((r) => topicoPorId(r.topicoId))
    .sort((a, b) => ordemTopico(a.topicoId) - ordemTopico(b.topicoId) || (a.criadoEm ?? '').localeCompare(b.criadoEm ?? ''));
}

function exportarArquivoUnico() {
  const lista = resumosOrdenados();
  if (!lista.length) return anunciar('Não há resumos para exportar.');
  const partes = lista.map((r) => {
    const t = topicoPorId(r.topicoId);
    return `# ${rotuloTopico(t)}\n\n## ${r.titulo || tituloPadrao(t)}\n\n${r.markdown ?? ''}\n`;
  });
  const texto = `<!-- Estudos Câmara SFS – resumos exportados em ${hojeISO()} -->\n\n${partes.join('\n---\n\n')}`;
  baixarArquivo(new File([texto], `resumos-estudos-camara-sfs-${hojeISO()}.md`, { type: 'text/markdown' }));
  anunciar(`${lista.length} resumos exportados num arquivo .md. Confira a pasta de downloads.`);
}

function exportarZip() {
  const lista = resumosOrdenados();
  if (!lista.length) return anunciar('Não há resumos para exportar.');
  const arquivos = {};
  const usados = new Map();
  for (const r of lista) {
    const t = topicoPorId(r.topicoId);
    const n = (usados.get(t.id) ?? 0) + 1;
    usados.set(t.id, n);
    const nome = `${nomeArquivoSeguro(`${t.id} ${t.titulo}`).replace(/^([a-z]{3}-\d{2})/, (m) => m.toUpperCase())}${n > 1 ? ` (${n})` : ''}.md`;
    arquivos[nome] = strToU8(`# ${r.titulo || tituloPadrao(t)}\n\nTópico: ${rotuloTopico(t)} (${cargosTexto(t)})\n\n${r.markdown ?? ''}\n`);
  }
  const zip = zipSync(arquivos, { level: 6 });
  baixarArquivo(new File([zip], `resumos-estudos-camara-sfs-${hojeISO()}.zip`, { type: 'application/zip' }));
  anunciar(`${lista.length} resumos exportados num arquivo .zip. Confira a pasta de downloads.`);
}

// ---------- Editor ----------
function editor(resumoInicial, t) {
  let resumo = resumoInicial;
  const ids = { titulo: novoId('r-titulo'), texto: novoId('r-texto'), ajuda: novoId('r-ajuda'), previa: novoId('r-previa'), status: novoId('r-status') };
  const status = h('p', { id: ids.status, class: 'nota' }, resumo ? `Salvo. Última alteração: ${new Date(resumo.atualizadoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.` : 'Novo resumo: o texto é salvo automaticamente enquanto você escreve.');
  const campoTitulo = h('input', { id: ids.titulo, type: 'text', maxlength: 120, value: resumo?.titulo ?? tituloPadrao(t) });
  const area = h('textarea', { id: ids.texto, class: 'editor-markdown', rows: 14, 'aria-describedby': ids.ajuda, spellcheck: 'true' }, resumo?.markdown ?? '');
  const previa = h('div', { class: 'previa-markdown' });
  const blocoPrevia = h('section', { id: ids.previa, class: 'cartao', 'aria-labelledby': `${ids.previa}-h`, hidden: true },
    h('h2', { id: `${ids.previa}-h` }, 'Pré-visualização'), previa);

  // Salvamento automático: meio segundo depois de parar de digitar, ao sair do campo e com Ctrl+S.
  let timer = null;
  let salvando = Promise.resolve();
  async function salvar(avisarLeitor = false) {
    clearTimeout(timer);
    timer = null;
    const dados = { topicoId: t.id, titulo: campoTitulo.value.trim() || tituloPadrao(t), markdown: area.value };
    if (!resumo && !area.value.trim()) return; // não cria resumo vazio
    if (resumo && resumo.markdown === dados.markdown && resumo.titulo === dados.titulo) {
      if (avisarLeitor) anunciar('Resumo já está salvo.');
      return;
    }
    salvando = salvando.then(async () => {
      const criado = !resumo;
      resumo = await salvarResumo({ ...(resumo ? { id: resumo.id } : {}), ...dados });
      if (criado) history.replaceState(null, '', `#/resumos/${resumo.id}`);
      status.textContent = `Salvo às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}.`;
      if (avisarLeitor) anunciar('Resumo salvo.');
      botaoExcluir.hidden = false;
    });
    await salvando;
  }
  const agendarSalvar = () => { clearTimeout(timer); status.textContent = 'Alterações não salvas…'; timer = setTimeout(() => salvar(false), 500); };
  // Se a página for fechada com alteração pendente, salva na hora.
  const aoSair = () => { if (timer) salvar(false); };
  window.addEventListener('pagehide', aoSair);
  window.addEventListener('hashchange', function limpar() { aoSair(); window.removeEventListener('pagehide', aoSair); window.removeEventListener('hashchange', limpar); });

  function atualizarPrevia() {
    if (blocoPrevia.hidden) return;
    const frag = renderizarMarkdown(area.value);
    previa.replaceChildren(frag.childNodes.length ? frag : h('p', {}, '(vazio)'));
  }
  const previaAtrasada = debounce(atualizarPrevia, 300);

  area.addEventListener('input', () => { agendarSalvar(); previaAtrasada(); });
  area.addEventListener('blur', () => { if (timer) salvar(false); });
  campoTitulo.addEventListener('input', agendarSalvar);
  campoTitulo.addEventListener('blur', () => { if (timer) salvar(false); });

  // Formatação: aplica no texto e mantém a seleção.
  function aplicar(fn, aviso) {
    const r = fn(area.value, area.selectionStart, area.selectionEnd);
    area.value = r.texto;
    area.focus();
    area.setSelectionRange(r.ini, r.fim);
    anunciar(r.removeu ? `${aviso} removido.` : `${aviso} aplicado.`);
    agendarSalvar();
    previaAtrasada();
  }
  const acoes = {
    negrito: () => aplicar((x, i, f) => alternarMarca(x, i, f, '**'), 'Negrito'),
    lista: () => aplicar((x, i, f) => alternarPrefixo(x, i, f, '- '), 'Item de lista'),
    titulo: () => aplicar((x, i, f) => alternarPrefixo(x, i, f, '## '), 'Título'),
    destaque: () => aplicar((x, i, f) => alternarMarca(x, i, f, '==', 'destaque'), 'Destaque'),
  };
  area.addEventListener('keydown', (e) => {
    if (!e.ctrlKey || e.altKey || e.metaKey) return;
    let acao = null;
    if (!e.shiftKey && e.key.toLowerCase() === 'b') acao = acoes.negrito;
    else if (e.shiftKey && e.code === 'Digit8') acao = acoes.lista;
    else if (e.shiftKey && e.code === 'Digit2') acao = acoes.titulo;
    else if (!e.shiftKey && e.key.toLowerCase() === 's') { e.preventDefault(); salvar(true); return; }
    if (acao) { e.preventDefault(); acao(); }
  });

  // Criar cartão a partir do trecho selecionado no texto.
  const idErroSel = novoId('erro-sel');
  const erroSel = h('p', { id: idErroSel, class: 'erro', hidden: true });
  let selecao = { ini: 0, fim: 0 };
  area.addEventListener('select', () => { selecao = { ini: area.selectionStart, fim: area.selectionEnd }; });
  area.addEventListener('keyup', () => { selecao = { ini: area.selectionStart, fim: area.selectionEnd }; });
  area.addEventListener('mouseup', () => { selecao = { ini: area.selectionStart, fim: area.selectionEnd }; });
  async function cartaoDoTrecho() {
    const trecho = area.value.slice(selecao.ini, selecao.fim).trim();
    if (!trecho) {
      erroSel.textContent = 'Erro: selecione um trecho no texto do resumo primeiro (Shift + setas) e depois use este botão.';
      erroSel.hidden = false;
      area.setAttribute('aria-describedby', `${ids.ajuda} ${idErroSel}`);
      area.focus();
      return;
    }
    erroSel.hidden = true;
    area.setAttribute('aria-describedby', ids.ajuda);
    await abrirDialogoCartao({ topicoId: t.id, verso: trecho, aviso: 'O trecho selecionado foi colocado no verso. Escreva a pergunta na frente.' });
  }

  const botaoPrevia = h('button', { type: 'button', class: 'botao', 'aria-expanded': 'false', 'aria-controls': ids.previa, onclick: () => {
    blocoPrevia.hidden = !blocoPrevia.hidden;
    botaoPrevia.setAttribute('aria-expanded', String(!blocoPrevia.hidden));
    botaoPrevia.textContent = blocoPrevia.hidden ? 'Mostrar pré-visualização' : 'Esconder pré-visualização';
    atualizarPrevia();
  } }, 'Mostrar pré-visualização');

  const botaoExcluir = h('button', { type: 'button', class: 'botao botao-perigo', hidden: !resumo, onclick: async () => {
    const ok = await confirmar({ titulo: 'Excluir este resumo?', texto: 'O texto do resumo será apagado. Os cartões criados a partir dele continuam.', rotuloOk: 'Excluir resumo', perigo: true });
    if (!ok || !resumo) return;
    clearTimeout(timer); timer = null;
    await excluirResumo(resumo.id);
    location.hash = '#/resumos';
    anunciar('Resumo excluído.');
  } }, 'Excluir resumo');

  const outros = resumosDoTopico(t.id).filter((r) => r.id !== resumo?.id);
  const novoNoTopico = async () => {
    await salvar(false);
    const criado = await salvarResumo({ topicoId: t.id, titulo: `${tituloPadrao(t)} (${resumosDoTopico(t.id).length + 1})`, markdown: '' });
    location.hash = `#/resumos/${criado.id}`;
  };

  return h('div', {},
    tituloTela(`Resumo – ${t.id}`),
    h('p', {}, h('strong', {}, 'Tópico: '), rotuloTopico(t), ` (${cargosTexto(t)}). `, h('a', { href: `#/edital/${t.id}` }, 'Ver este tópico no Edital')),
    h('div', { class: 'campo' }, h('label', { for: ids.titulo }, 'Título do resumo'), campoTitulo),
    h('div', { role: 'group', 'aria-label': 'Formatação', class: 'barra-formatacao' },
      h('button', { type: 'button', class: 'botao', onclick: acoes.negrito, 'aria-keyshortcuts': 'Control+B' }, 'Negrito'),
      h('button', { type: 'button', class: 'botao', onclick: acoes.lista, 'aria-keyshortcuts': 'Control+Shift+8' }, 'Lista'),
      h('button', { type: 'button', class: 'botao', onclick: acoes.titulo, 'aria-keyshortcuts': 'Control+Shift+2' }, 'Título'),
      h('button', { type: 'button', class: 'botao', onclick: acoes.destaque }, 'Destaque')),
    h('div', { class: 'campo' },
      h('label', { for: ids.texto }, 'Texto do resumo (Markdown)'),
      h('p', { id: ids.ajuda, class: 'nota' }, 'Salvamento automático. Atalhos: Ctrl+B negrito, Ctrl+Shift+8 lista, Ctrl+Shift+2 título, Ctrl+S salvar agora. Destaque: ==texto==. Tab sai do campo.'),
      area),
    status,
    erroSel,
    h('div', { class: 'linha-botoes' },
      botaoPrevia,
      h('button', { type: 'button', class: 'botao', onclick: cartaoDoTrecho }, 'Criar cartão do trecho selecionado')),
    blocoPrevia,
    secao('Outros resumos deste tópico',
      outros.length
        ? h('ul', { class: 'lista-simples' }, outros.map((r) => h('li', {}, h('a', { href: `#/resumos/${r.id}` }, r.titulo || tituloPadrao(t)))))
        : h('p', {}, 'Este tópico tem só este resumo.'),
      h('button', { type: 'button', class: 'botao', onclick: novoNoTopico }, 'Criar outro resumo neste tópico')),
    h('div', { class: 'linha-botoes' }, h('a', { href: '#/resumos', class: 'botao botao-link' }, 'Voltar para a lista de resumos'), botaoExcluir),
  );
}

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
