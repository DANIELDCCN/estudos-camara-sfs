// Tela "Revisão": fila do dia, sessão de revisão (teclado), estatísticas e gerenciamento de cartões.
// Endereços:
//   #/revisao                  fila do dia, filtros e estatísticas
//   #/revisao/sessao           sessão de revisão
//   #/revisao/cartoes[/POR-16] gerenciar e importar cartões (opcionalmente de um tópico)
import { h, novoId } from '../dom.js';
import { secao, tituloTela } from '../componentes.js';
import { anunciar, confirmar, estaDigitando } from '../a11y.js';
import { renderizarMarkdown } from '../markdown.js';
import { seletorTopicos, seletorDisciplinas } from '../seletores.js';
import { abrirDialogoCartao } from '../cartao-dialogo.js';
import { estado, topicoPorId, avaliarCartao, salvarCartao, excluirCartao, criarCartoes, salvarConfig } from '../../dados/repositorio.js';
import { montarFila, estatisticas, previsao7Dias, fimDoDia } from '../../logica/fila.js';
import { NOTAS, ROTULO_NOTA, previsoes, textoIntervalo, ehNovo } from '../../logica/srs.js';
import { lerCartoesCSV, normalizar } from '../../logica/texto.js';
import { formatarData, diaDaSemana, hojeISO } from '../../logica/datas.js';
import { formatarPct } from '../../logica/progresso.js';
import { NOME_CARGO_COMPLETO } from '../../logica/constantes.js';

export const titulo = 'Revisão';

// Filtros da fila (valem enquanto o app está aberto).
const filtros = { cargo: null, disciplina: '', topico: '' };

/** Filtro de cartões conforme cargo, disciplina e tópico escolhidos. */
export function filtroCartoes(f = filtros) {
  const cargo = f.cargo ?? estado.config.cargoFoco;
  return (c) => {
    const t = topicoPorId(c.topicoId);
    if (!t || t.oculto) return false;
    if (cargo !== 'ambos' && !t.cargos.includes(cargo)) return false;
    if (f.disciplina && t.disciplinaId !== f.disciplina) return false;
    if (f.topico && t.id !== f.topico) return false;
    return true;
  };
}

/** Fila do dia com os filtros atuais (usada também pelo Painel). */
export function filaAtual(f = filtros, agora = new Date()) {
  return montarFila(estado.cartoes, { agora, limiteNovos: estado.config.limiteNovosCartoes, logs: estado.logs, filtro: filtroCartoes(f) });
}

export function render(param = '') {
  if (param === 'sessao') return sessao();
  if (param.startsWith('cartoes')) return gerenciar(param.split('/')[1]?.toUpperCase() ?? '');
  return inicio();
}

const quando = (iso) => {
  const d = hojeISO(new Date(iso));
  const hoje = hojeISO();
  const hora = new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  return d === hoje ? `hoje às ${hora}` : `${diaDaSemana(d)}, ${formatarData(d)}`;
};

// ---------- Início: fila, filtros e estatísticas ----------
function inicio() {
  const resumoFila = h('div', {});
  const idsF = { disc: novoId('f-disc'), top: novoId('f-top') };
  const nomeCargo = novoId('f-cargo');
  const cargoAtual = filtros.cargo ?? estado.config.cargoFoco;

  function desenharFila(anunciarFila) {
    const f = filaAtual();
    const total = f.fila.length;
    const texto = total
      ? `Para revisar agora: ${f.vencidos.length} ${f.vencidos.length === 1 ? 'cartão vencido' : 'cartões vencidos'} e ${f.novos.length} ${f.novos.length === 1 ? 'novo' : 'novos'}.`
      : 'Nenhum cartão para revisar agora com estes filtros.';
    const extra = f.novosForaDoLimite > 0
      ? `${f.novosForaDoLimite} ${f.novosForaDoLimite === 1 ? 'cartão novo ficou' : 'cartões novos ficaram'} para os próximos dias (limite de ${estado.config.limiteNovosCartoes} novos por dia, ajustável em Configurações).`
      : null;
    resumoFila.replaceChildren(
      h('p', { class: 'destaque-numero' }, texto),
      extra ? h('p', { class: 'nota' }, extra) : null,
      total
        ? h('a', { href: '#/revisao/sessao', class: 'botao botao-primario botao-grande' }, `Começar revisão (${total} ${total === 1 ? 'cartão' : 'cartões'})`)
        : (estado.cartoes.length ? null : h('p', {}, 'Você ainda não tem cartões. Crie um abaixo, importe em lote, ou crie a partir de um resumo.')),
    );
    if (anunciarFila) anunciar(texto);
  }

  const seletorTop = seletorTopicos({ id: idsF.top, valor: filtros.topico, opcaoVazia: 'Todos', onchange: (e) => { filtros.topico = e.target.value; desenharFila(true); } });

  const e = estatisticas(estado.logs);
  const prev = previsao7Dias(estado.cartoes.filter(filtroCartoes({ cargo: 'ambos', disciplina: '', topico: '' })));
  const novosTotal = estado.cartoes.filter((c) => !c.suspenso && ehNovo(c.estadoSRS)).length;

  const tela = h('div', {},
    tituloTela('Revisão'),
    secao('Fila de hoje', resumoFila),
    h('form', { class: 'cartao filtros', 'aria-label': 'Filtros da fila', onsubmit: (ev) => ev.preventDefault() },
      h('h2', {}, 'Filtros da fila'),
      h('fieldset', {}, h('legend', {}, 'Cargo'),
        [['ambos', 'Os dois cargos'], ['AA', NOME_CARGO_COMPLETO.AA], ['TI', NOME_CARGO_COMPLETO.TI]].map(([v, r]) => h('label', { class: 'opcao' },
          h('input', { type: 'radio', name: nomeCargo, value: v, checked: cargoAtual === v, onchange: () => { filtros.cargo = v; desenharFila(true); } }), ` ${r}`))),
      h('div', { class: 'grade-campos' },
        h('div', { class: 'campo' }, h('label', { for: idsF.disc }, 'Disciplina'),
          seletorDisciplinas({ id: idsF.disc, valor: filtros.disciplina, onchange: (ev) => { filtros.disciplina = ev.target.value; desenharFila(true); } })),
        h('div', { class: 'campo' }, h('label', { for: idsF.top }, 'Tópico'), seletorTop))),
    secao('Cartões',
      h('p', {}, `Você tem ${estado.cartoes.length} ${estado.cartoes.length === 1 ? 'cartão' : 'cartões'}.`),
      h('div', { class: 'linha-botoes' },
        h('button', { type: 'button', class: 'botao', onclick: async () => {
          const c = await abrirDialogoCartao({ topicoId: filtros.topico || undefined });
          if (c) desenharFila(false);
        } }, 'Criar cartão'),
        h('a', { href: '#/revisao/cartoes', class: 'botao botao-link' }, 'Gerenciar e importar cartões'))),
    secao('Estatísticas',
      h('ul', { class: 'lista-simples' },
        h('li', {}, `Cartões revisados hoje: ${e.revisadosHoje}.`),
        h('li', {}, `Taxa de acerto hoje: ${e.taxaHoje === null ? 'sem revisões hoje' : `${formatarPct(e.taxaHoje)} (${e.acertosHoje} de ${e.revisadosHoje})`}.`),
        h('li', {}, `Taxa de acerto desde o início: ${e.taxaTotal === null ? 'sem revisões ainda' : `${formatarPct(e.taxaTotal)} em ${e.totalRevisoes} revisões`}.`),
        h('li', {}, `Cartões novos ainda não estudados: ${novosTotal}.`)),
      h('p', { class: 'nota' }, 'Acerto é qualquer avaliação diferente de "Errei".'),
      h('table', { class: 'tabela' },
        h('caption', {}, 'Revisões previstas nos próximos 7 dias (todos os cargos; sem contar cartões novos)'),
        h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Dia'), h('th', { scope: 'col' }, 'Data'), h('th', { scope: 'col' }, 'Revisões'))),
        h('tbody', {}, prev.map((d, i) => h('tr', {},
          h('th', { scope: 'row' }, i === 0 ? 'Hoje (inclui atrasados)' : i === 1 ? 'Amanhã' : diaDaSemana(d.data)),
          h('td', {}, formatarData(d.data)),
          h('td', {}, String(d.quantidade))))))),
  );
  desenharFila(false);
  return tela;
}

// ---------- Sessão de revisão ----------
function sessao() {
  const fila = filaAtual().fila.map((c) => c.id);
  const resultados = [];
  let atual = null;
  let revelado = false;
  let ultimoResultado = '';

  const area = h('div', { class: 'sessao' });
  const raiz = h('div', {},
    tituloTela('Sessão de revisão'),
    h('p', { class: 'nota' }, 'Espaço mostra a resposta. Depois, teclas 1 a 4: 1 Errei, 2 Difícil, 3 Bom, 4 Fácil. Os atalhos funcionam com o foco no cartão.'),
    area,
    h('div', { class: 'linha-botoes' }, h('button', { type: 'button', class: 'botao', id: 'encerrar-sessao', onclick: encerrar }, 'Encerrar sessão')));

  area.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey || estaDigitando(e.target) || !atual) return;
    const emBotao = e.target.closest('button, a');
    if (e.key === ' ' && !revelado && !emBotao) { e.preventDefault(); revelar(); return; }
    if (revelado && /^[1-4]$/.test(e.key)) { e.preventDefault(); avaliar(Number(e.key)); }
  });

  function proximo() {
    revelado = false;
    const id = fila.shift();
    atual = id ? estado.cartoes.find((c) => c.id === id) : null;
    if (!atual) return concluir();
    const t = topicoPorId(atual.topicoId);
    const ce = atual.tipo === 'certo-errado';
    const idsC = { nome: novoId('frente-h'), texto: novoId('frente-t'), anterior: novoId('ant'), info: novoId('info') };
    const frenteSec = h('section', {
      class: 'cartao cartao-revisao', tabindex: '-1', 'aria-labelledby': idsC.nome,
      'aria-describedby': [ultimoResultado ? idsC.anterior : null, idsC.texto].filter(Boolean).join(' '),
    },
    ultimoResultado ? h('p', { id: idsC.anterior, class: 'resultado-anterior' }, ultimoResultado) : null,
    h('p', { id: idsC.info, class: 'tags' }, `${t.id} ${t.titulo} · ${ce ? 'Certo ou errado' : 'Frente e verso'} · ${ehNovo(atual.estadoSRS) ? 'cartão novo' : 'revisão'} · restam ${fila.length + 1}`),
    h('h2', { id: idsC.nome }, ce ? 'Frente: certo ou errado?' : 'Frente'),
    h('div', { id: idsC.texto, class: 'texto-cartao' }, renderizarMarkdown(atual.frente)),
    h('button', { type: 'button', class: 'botao botao-primario botao-grande', onclick: revelar, 'aria-keyshortcuts': 'Space' }, 'Mostrar resposta (Espaço)'));
    area.replaceChildren(frenteSec);
    frenteSec.focus();
  }

  function revelar() {
    if (!atual || revelado) return;
    revelado = true;
    const prev = previsoes(atual.estadoSRS);
    const idsR = { nome: novoId('resp-h'), texto: novoId('resp-t') };
    const ce = atual.tipo === 'certo-errado';
    const resp = h('section', { class: 'cartao cartao-revisao', tabindex: '-1', 'aria-labelledby': idsR.nome, 'aria-describedby': idsR.texto },
      h('h2', { id: idsR.nome }, 'Resposta'),
      h('div', { id: idsR.texto, class: 'texto-cartao' },
        ce ? h('p', { class: 'resposta-ce' }, `A afirmação está ${atual.verso.toUpperCase()}.`) : renderizarMarkdown(atual.verso),
        atual.explicacao ? h('div', { class: 'explicacao' }, h('p', {}, h('strong', {}, 'Explicação ou fonte:')), renderizarMarkdown(atual.explicacao)) : null),
      h('div', { role: 'group', 'aria-label': 'Como foi? Teclas 1 a 4', class: 'botoes-nota' },
        NOTAS.map(({ nota, rotulo }) => h('button', {
          type: 'button', class: `botao botao-grande nota-${nota}`, 'aria-keyshortcuts': String(nota), onclick: () => avaliar(nota),
        }, h('span', { class: 'nota-tecla' }, `${nota}`), h('span', {}, ` ${rotulo}`), h('span', { class: 'nota-intervalo' }, ` – volta em ${textoIntervalo(prev[nota])}`)))));
    // Esconde o botão "Mostrar resposta" e leva o foco para a resposta.
    area.querySelector('.cartao-revisao button')?.remove();
    area.append(resp);
    resp.focus();
  }

  async function avaliar(nota) {
    if (!atual || !revelado) return;
    const cartao = atual;
    atual = null;
    const { log } = await avaliarCartao(cartao.id, nota);
    resultados.push(log);
    const prox = cartao.proximaRevisao;
    ultimoResultado = `Anterior: ${ROTULO_NOTA[nota]}. Próxima revisão em ${textoIntervalo(log.intervaloNovo)} (${quando(prox)}).`;
    // Se voltar ainda hoje (passos de aprendizagem), o cartão entra de novo no fim da fila.
    if (prox <= fimDoDia().toISOString()) fila.push(cartao.id);
    proximo();
  }

  function concluir() {
    const acertos = resultados.filter((l) => l.nota >= 2).length;
    const texto = resultados.length
      ? `Sessão concluída: ${resultados.length} ${resultados.length === 1 ? 'revisão' : 'revisões'}, ${acertos} ${acertos === 1 ? 'acerto' : 'acertos'} (${formatarPct((acertos / resultados.length) * 100)}).`
      : 'Não há cartões para revisar agora com os filtros escolhidos.';
    const fim = h('section', { class: 'cartao', tabindex: '-1', 'aria-labelledby': 'fim-h' },
      h('h2', { id: 'fim-h' }, 'Fim da sessão'),
      ultimoResultado ? h('p', {}, ultimoResultado) : null,
      h('p', {}, texto),
      h('p', {}, h('a', { href: '#/revisao' }, 'Voltar para a Revisão')),
      h('p', {}, h('a', { href: '#/painel' }, 'Ir para o Painel')));
    area.replaceChildren(fim);
    raiz.querySelector('#encerrar-sessao')?.remove();
    fim.focus();
  }

  function encerrar() {
    atual = null;
    fila.length = 0;
    concluir();
  }

  setTimeout(proximo, 0);
  raiz.dataset.focoProprio = 'sim'; // a sessão cuida do foco (vai direto para o cartão)
  return raiz;
}

// ---------- Gerenciar e importar ----------
function gerenciar(topicoInicial) {
  const f = { disciplina: '', topico: topicoInicial && topicoPorId(topicoInicial) ? topicoInicial : '', busca: '' };
  const ids = { disc: novoId('g-disc'), top: novoId('g-top'), busca: novoId('g-busca'), csv: novoId('csv'), arq: novoId('csv-arq'), erro: novoId('csv-erro') };
  const listaEl = h('div', {});
  const contagem = h('p', { class: 'contagem-topicos' });

  function desenhar(anunciarContagem) {
    const termo = normalizar(f.busca.trim());
    const lista = estado.cartoes
      .filter((c) => {
        const t = topicoPorId(c.topicoId);
        if (!t) return false;
        if (f.disciplina && t.disciplinaId !== f.disciplina) return false;
        if (f.topico && t.id !== f.topico) return false;
        if (termo && !normalizar(`${c.frente} ${c.verso} ${c.explicacao ?? ''}`).includes(termo)) return false;
        return true;
      })
      .sort((a, b) => (topicoPorId(a.topicoId).ordem - topicoPorId(b.topicoId).ordem) || (a.criadoEm ?? '').localeCompare(b.criadoEm ?? ''));
    contagem.textContent = `${lista.length} ${lista.length === 1 ? 'cartão exibido' : 'cartões exibidos'}.`;
    if (anunciarContagem) anunciar(contagem.textContent);
    listaEl.replaceChildren(lista.length ? h('ul', { class: 'lista-topicos' }, lista.map(itemCartao)) : h('p', {}, 'Nenhum cartão aqui.'));
  }

  function itemCartao(c) {
    const t = topicoPorId(c.topicoId);
    const idT = novoId('card');
    const situacao = c.suspenso ? 'Suspenso (fora das revisões)' : ehNovo(c.estadoSRS) ? 'Novo (ainda não revisado)' : `Próxima revisão: ${quando(c.proximaRevisao)}`;
    const historico = estado.logs.filter((l) => l.flashcardId === c.id).length;
    return h('li', { class: 'topico' },
      h('h3', { id: idT }, c.frente.length > 120 ? `${c.frente.slice(0, 120)}…` : c.frente),
      h('p', { class: 'tags' }, `${t.id} ${t.titulo} · ${c.tipo === 'certo-errado' ? 'Certo ou errado' : 'Frente e verso'}`),
      h('p', {}, h('strong', {}, 'Verso: '), c.verso),
      h('p', {}, `${situacao}. Revisões feitas: ${historico}.`),
      h('div', { class: 'acoes' },
        h('button', { type: 'button', class: 'botao', 'aria-describedby': idT, onclick: async () => { if (await abrirDialogoCartao({ cartao: c })) desenhar(false); } }, 'Editar'),
        h('button', { type: 'button', class: 'botao', 'aria-describedby': idT, onclick: async () => {
          await salvarCartao({ id: c.id, suspenso: !c.suspenso });
          anunciar(c.suspenso ? 'Cartão suspenso: não aparece nas revisões.' : 'Cartão reativado.');
          desenhar(false);
        } }, c.suspenso ? 'Reativar' : 'Suspender'),
        h('button', { type: 'button', class: 'botao botao-perigo', 'aria-describedby': idT, onclick: async () => {
          const ok = await confirmar({ titulo: 'Excluir este cartão?', texto: `"${c.frente.slice(0, 80)}" e o histórico de revisões dele serão apagados.`, rotuloOk: 'Excluir cartão', perigo: true });
          if (!ok) return;
          await excluirCartao(c.id);
          anunciar('Cartão excluído.');
          desenhar(false);
          document.getElementById('titulo-tela')?.focus();
        } }, 'Excluir')));
  }

  // Importação em lote
  const areaCsv = h('textarea', { id: ids.csv, rows: 6, 'aria-describedby': `${ids.csv}-ajuda` });
  const arquivoCsv = h('input', { id: ids.arq, type: 'file', accept: '.csv,.txt,text/csv,text/plain' });
  const resultadoImp = h('div', {});
  async function importar(e) {
    e.preventDefault();
    let texto = areaCsv.value;
    if (arquivoCsv.files?.[0]) texto = `${texto}\n${await arquivoCsv.files[0].text()}`;
    const { cartoes, erros } = lerCartoesCSV(texto, new Set(estado.topicos.map((t) => t.id)));
    if (!cartoes.length && !erros.length) {
      resultadoImp.replaceChildren(h('p', { class: 'erro', id: ids.erro, role: 'alert' }, 'Erro: cole o texto ou escolha um arquivo primeiro.'));
      areaCsv.focus();
      return;
    }
    if (cartoes.length) await criarCartoes(cartoes);
    const msg = `${cartoes.length} ${cartoes.length === 1 ? 'cartão importado' : 'cartões importados'}${erros.length ? `; ${erros.length} ${erros.length === 1 ? 'linha com erro' : 'linhas com erro'}` : ''}.`;
    resultadoImp.replaceChildren(
      h('p', { role: 'status' }, msg),
      erros.length ? h('ul', { class: 'lista-simples erros-importacao' }, erros.map((er) => h('li', {}, `Linha ${er.linha}: ${er.mensagem}`))) : null);
    if (cartoes.length) { areaCsv.value = ''; arquivoCsv.value = ''; desenhar(false); }
    anunciar(erros.length ? `${msg} Os erros estão listados logo abaixo do botão Importar.` : msg);
  }

  const tela = h('div', {},
    tituloTela('Gerenciar cartões'),
    h('p', {}, h('a', { href: '#/revisao' }, 'Voltar para a Revisão')),
    h('form', { class: 'cartao filtros', role: 'search', 'aria-label': 'Filtrar cartões', onsubmit: (e) => e.preventDefault() },
      h('h2', {}, 'Filtrar'),
      h('div', { class: 'grade-campos' },
        h('div', { class: 'campo' }, h('label', { for: ids.disc }, 'Disciplina'),
          seletorDisciplinas({ id: ids.disc, onchange: (e) => { f.disciplina = e.target.value; desenhar(true); } })),
        h('div', { class: 'campo' }, h('label', { for: ids.top }, 'Tópico'),
          seletorTopicos({ id: ids.top, valor: f.topico, opcaoVazia: 'Todos', onchange: (e) => { f.topico = e.target.value; desenhar(true); } })),
        h('div', { class: 'campo' }, h('label', { for: ids.busca }, 'Buscar no texto dos cartões'),
          h('input', { id: ids.busca, type: 'search', autocomplete: 'off', oninput: debounce((e) => { f.busca = e.target.value; desenhar(true); }, 400) })))),
    h('div', { class: 'linha-botoes' },
      h('button', { type: 'button', class: 'botao botao-primario', onclick: async () => { if (await abrirDialogoCartao({ topicoId: f.topico || undefined })) desenhar(false); } }, 'Criar cartão')),
    h('section', { 'aria-labelledby': 'h-lista-cartoes' }, h('h2', { id: 'h-lista-cartoes' }, 'Cartões'), contagem, listaEl),
    secao('Importar cartões em lote',
      h('p', { id: `${ids.csv}-ajuda` }, 'Uma linha por cartão: frente;verso;código_do_tópico. Uma quarta coluna opcional é a explicação. Se o verso for Certo ou Errado, o cartão vira do tipo certo ou errado. Use aspas quando o texto tiver ponto e vírgula. Exemplo: O que é crase?;Fusão da preposição a com o artigo a;POR-16'),
      h('form', { onsubmit: importar },
        h('div', { class: 'campo' }, h('label', { for: ids.csv }, 'Cole as linhas aqui'), areaCsv),
        h('div', { class: 'campo' }, h('label', { for: ids.arq }, 'Ou escolha um arquivo .csv ou .txt'), arquivoCsv),
        h('button', { type: 'submit', class: 'botao botao-primario' }, 'Importar cartões')),
      resultadoImp),
    secao('Limite de cartões novos',
      campoLimite()),
  );
  desenhar(false);
  return tela;
}

/** Campo do limite diário de novos (também aparece em Configurações). */
export function campoLimite() {
  const id = novoId('limite');
  const idErro = novoId('limite-erro');
  const erro = h('p', { id: idErro, class: 'erro', hidden: true });
  const entrada = h('input', { id, type: 'number', min: 0, max: 999, step: 1, inputmode: 'numeric', value: estado.config.limiteNovosCartoes,
    onchange: async (e) => {
      const v = Number(e.target.value);
      if (!Number.isInteger(v) || v < 0 || v > 999) {
        erro.textContent = 'Erro: use um número inteiro de 0 a 999.'; erro.hidden = false;
        entrada.setAttribute('aria-invalid', 'true'); entrada.setAttribute('aria-describedby', idErro);
        return;
      }
      erro.hidden = true; entrada.removeAttribute('aria-invalid'); entrada.removeAttribute('aria-describedby');
      await salvarConfig({ limiteNovosCartoes: v });
      anunciar(`Limite de cartões novos por dia: ${v}.`);
    } });
  return h('div', { class: 'campo' }, h('label', { for: id }, 'Cartões novos por dia (máximo)'), entrada, erro);
}

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
