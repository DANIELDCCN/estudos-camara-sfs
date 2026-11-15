// Tela "Edital (checklist)": Disciplina → Tópico, com status, filtros e progresso.
// O filtro de cargo (Ambos / AA / TI) é o primeiro nível da árvore e fica salvo.
import { h, novoId } from '../dom.js';
import { barraProgresso, iconeStatus, tituloTela } from '../componentes.js';
import { anunciar, estaDigitando } from '../a11y.js';
import { estado, calculadora, cargosDaVisao, progressoDe, salvarProgresso, salvarTopico, salvarConfig, resumosDoTopico, cartoesDoTopico } from '../../dados/repositorio.js';
import { abrirDialogoCartao } from '../cartao-dialogo.js';
import { filaAtual } from './revisao.js';
import { STATUS, STATUS_POR_ID, NOME_CARGO, NOME_CARGO_COMPLETO } from '../../logica/constantes.js';
import { formatarPct } from '../../logica/progresso.js';

export const titulo = 'Edital';

// Filtros que valem enquanto o app está aberto (o cargo fica salvo na configuração).
const filtros = { disciplina: 'todas', status: 'todos', busca: '' };
const recolhidas = new Set();

/** Remove acentos e caixa, para a busca achar "regencia" em "Regência". */
const normalizar = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function rotuloCargos(t) {
  if (t.cargos.length > 1) return 'Ambos os cargos';
  return `Só ${NOME_CARGO[t.cargos[0]]}`;
}

function topicosFiltrados() {
  const cargos = cargosDaVisao();
  const termo = normalizar(filtros.busca.trim());
  return estado.topicos.filter((t) => {
    if (t.oculto) return false;
    if (!t.cargos.some((c) => cargos.includes(c))) return false;
    if (filtros.disciplina !== 'todas' && t.disciplinaId !== filtros.disciplina) return false;
    if (filtros.status !== 'todos' && progressoDe(t.id).status !== filtros.status) return false;
    if (termo) {
      const texto = normalizar([t.id, t.titulo, ...t.subitens].join(' '));
      if (!texto.includes(termo)) return false;
    }
    return true;
  });
}

export function render(param = '') {
  // #/edital/POR-16: abre o checklist já no tópico (vindo de um resumo, por exemplo).
  const alvo = param ? estado.topicos.find((t) => t.id === param.toUpperCase()) : null;
  if (alvo) {
    recolhidas.delete(alvo.disciplinaId);
    const cargos = cargosDaVisao();
    const visivel = alvo.cargos.some((c) => cargos.includes(c));
    if (!visivel) estado.config.cargoFoco = 'ambos';
    Object.assign(filtros, { disciplina: 'todas', status: 'todos', busca: '' });
  }
  const refs = { cartoes: new Map(), barrasDisc: new Map() };
  const topo = h('div', { class: 'cartao' });
  const contagem = h('p', { class: 'contagem-topicos' });
  const lista = h('div', { class: 'lista-disciplinas' });

  // ---------- Progresso no topo ----------
  function desenharTopo() {
    const cargos = cargosDaVisao();
    const calc = calculadora();
    topo.replaceChildren(
      h('h2', {}, 'Progresso nesta visão'),
      barraProgresso({ rotulo: cargos.length > 1 ? 'Geral (sem contar em dobro)' : NOME_CARGO_COMPLETO[cargos[0]], r: calc.resumo({ cargos }), nivel: 'h3' }),
      ...(cargos.length > 1 ? cargos.map((c) => barraProgresso({ rotulo: NOME_CARGO_COMPLETO[c], r: calc.resumo({ cargos: [c] }), nivel: 'h3' })) : []),
    );
  }

  function desenharBarrasDisciplina(d, alvo) {
    const calc = calculadora();
    const cargos = cargosDaVisao().filter((c) => d.cargos.includes(c));
    alvo.replaceChildren(...cargos.map((c) => barraProgresso({
      rotulo: `${d.nome} – ${NOME_CARGO[c]}`, r: calc.resumo({ cargos: [c], disciplinaId: d.id }),
    })));
  }

  // ---------- Filtros ----------
  const idBusca = novoId('busca');
  const idDisc = novoId('disc');
  const idStatus = novoId('status');
  const nomeRadio = novoId('cargo');
  const opcoesCargo = [['ambos', 'Os dois cargos'], ['AA', NOME_CARGO_COMPLETO.AA], ['TI', NOME_CARGO_COMPLETO.TI]];

  const formFiltros = h('form', { class: 'cartao filtros', role: 'search', 'aria-label': 'Filtros do checklist', onsubmit: (e) => e.preventDefault() },
    h('h2', {}, 'Filtros'),
    h('fieldset', {},
      h('legend', {}, 'Ver tópicos de'),
      opcoesCargo.map(([valor, texto]) => h('label', { class: 'opcao' },
        h('input', {
          type: 'radio', name: nomeRadio, value: valor, checked: estado.config.cargoFoco === valor,
          onchange: async () => { await salvarConfig({ cargoFoco: valor }); redesenhar(true); },
        }), ' ', texto))),
    h('div', { class: 'grade-campos' },
      h('div', { class: 'campo' },
        h('label', { for: idDisc }, 'Disciplina'),
        h('select', { id: idDisc, onchange: (e) => { filtros.disciplina = e.target.value; redesenhar(true); } },
          h('option', { value: 'todas' }, 'Todas'),
          estado.disciplinas.map((d) => h('option', { value: d.id, selected: filtros.disciplina === d.id }, d.nome)))),
      h('div', { class: 'campo' },
        h('label', { for: idStatus }, 'Status'),
        h('select', { id: idStatus, onchange: (e) => { filtros.status = e.target.value; redesenhar(true); } },
          h('option', { value: 'todos' }, 'Todos'),
          STATUS.map((s) => h('option', { value: s.id, selected: filtros.status === s.id }, s.rotulo)))),
      h('div', { class: 'campo' },
        h('label', { for: idBusca }, 'Buscar (código, título ou subitem)'),
        h('input', {
          id: idBusca, type: 'search', value: filtros.busca, autocomplete: 'off',
          oninput: debounce((e) => { filtros.busca = e.target.value; redesenhar(true); }, 400),
        }))),
  );

  // ---------- Lista ----------
  function redesenhar(anunciarContagem = false) {
    refs.cartoes.clear();
    refs.barrasDisc.clear();
    const visiveis = topicosFiltrados();
    const cargos = cargosDaVisao();
    contagem.textContent = `${visiveis.length} ${visiveis.length === 1 ? 'tópico exibido' : 'tópicos exibidos'}.`;
    if (anunciarContagem) anunciar(contagem.textContent);

    const secoes = estado.disciplinas
      .filter((d) => d.cargos.some((c) => cargos.includes(c)))
      .map((d) => {
        const doGrupo = visiveis.filter((t) => t.disciplinaId === d.id);
        if (doGrupo.length === 0) return null;
        const idLista = `lista-${d.id}`;
        const idTitulo = `h-${d.id}`;
        const aberta = !recolhidas.has(d.id);
        const barras = h('div', { class: 'barras-disciplina' });
        refs.barrasDisc.set(d.id, { d, barras });
        desenharBarrasDisciplina(d, barras);
        const ul = h('ul', { id: idLista, class: 'lista-topicos', hidden: !aberta }, doGrupo.map((t) => cartaoTopico(t, refs, atualizarDepoisDoStatus)));
        const botao = h('button', {
          type: 'button', class: 'botao-disclosure', 'aria-expanded': String(aberta), 'aria-controls': idLista,
          onclick: () => {
            const abrir = ul.hidden;
            ul.hidden = !abrir;
            botao.setAttribute('aria-expanded', String(abrir));
            if (abrir) recolhidas.delete(d.id); else recolhidas.add(d.id);
          },
        }, h('span', { class: 'seta', 'aria-hidden': 'true' }), `${d.nome} (${doGrupo.length})`);
        const textos = cargos.filter((c) => d.textoOficialEdital?.[c]).map((c) => h('details', { class: 'texto-oficial' },
          h('summary', {}, `Texto oficial do edital – ${NOME_CARGO[c]}`),
          String(d.textoOficialEdital[c]).split('\n').map((p) => h('p', {}, p))));
        return h('section', { class: 'disciplina', 'aria-labelledby': idTitulo },
          h('h2', { id: idTitulo }, botao), barras, textos, ul);
      })
      .filter(Boolean);

    lista.replaceChildren(...(secoes.length ? secoes : [h('p', { class: 'cartao' }, 'Nenhum tópico corresponde aos filtros.')]));
    desenharTopo();
  }

  function atualizarDepoisDoStatus(t) {
    desenharTopo();
    const ref = refs.barrasDisc.get(t.disciplinaId);
    if (ref) desenharBarrasDisciplina(ref.d, ref.barras);
    const calc = calculadora();
    const partes = t.cargos.filter((c) => cargosDaVisao().includes(c)).map((c) => {
      const r = calc.resumo({ cargos: [c], disciplinaId: t.disciplinaId });
      return `${NOME_CARGO[c]}: ${r.concluidos} de ${r.total}, ponderado ${formatarPct(r.pctPonderado)}`;
    });
    const disc = estado.disciplinas.find((d) => d.id === t.disciplinaId);
    anunciar(`${t.id} marcado como ${STATUS_POR_ID[progressoDe(t.id).status].rotulo}. ${disc.nome}: ${partes.join('; ')}.`);
  }

  const raiz = h('div', {},
    tituloTela('Edital – checklist'),
    h('p', {}, 'Cada tópico existe uma vez só. Tópicos marcados "Ambos os cargos" contam nos dois. Com o foco num tópico, as teclas 0 a 4 definem o status.'),
    formFiltros, topo, contagem, lista);
  redesenhar(false);
  if (alvo) {
    const h3 = raiz.querySelector(`#tt-${alvo.id}`);
    if (h3) { h3.setAttribute('tabindex', '-1'); h3.dataset.focoInicial = 'sim'; }
  }
  return raiz;
}

// ---------- Cartão de um tópico ----------
function cartaoTopico(t, refs, aoMudarStatus) {
  const p = progressoDe(t.id);
  const idTitulo = `tt-${t.id}`;
  const idSelect = `st-${t.id}`;
  const idDetalhes = `det-${t.id}`;
  const sr = (txt) => h('span', { class: 'sr-only' }, txt);

  const selo = h('p', { class: `selo selo-${p.status}`, 'aria-hidden': 'true' });
  const select = h('select', { id: idSelect, onchange: (e) => mudarStatus(e.target.value) },
    STATUS.map((s) => h('option', { value: s.id, selected: s.id === p.status }, s.rotulo)));
  const botaoProx = h('button', { type: 'button', class: 'botao', onclick: () => mudarStatus(proximo(progressoDe(t.id).status)) });

  function proximo(atual) {
    const i = STATUS_POR_ID[atual].indice;
    return STATUS[(i + 1) % STATUS.length].id;
  }

  function pintar(status) {
    selo.className = `selo selo-${status}`;
    selo.replaceChildren(iconeStatus(status), h('span', {}, STATUS_POR_ID[status].rotulo));
    select.value = status;
    const prox = STATUS_POR_ID[proximo(status)];
    botaoProx.replaceChildren(status === 'dominado' ? 'Recomeçar: ' : 'Próximo: ', prox.rotulo, sr(` (${t.id})`));
  }

  async function mudarStatus(status) {
    await salvarProgresso(t.id, { status });
    pintar(status);
    aoMudarStatus(t);
  }

  pintar(p.status);
  refs.cartoes.set(t.id, { pintar });

  const detalhes = h('div', { id: idDetalhes, class: 'detalhes', hidden: true });
  let detalhesMontados = false;
  const botaoDet = h('button', {
    type: 'button', class: 'botao', 'aria-expanded': 'false', 'aria-controls': idDetalhes,
    onclick: () => {
      if (!detalhesMontados) { detalhes.append(...camposDetalhes(t)); detalhesMontados = true; }
      detalhes.hidden = !detalhes.hidden;
      botaoDet.setAttribute('aria-expanded', String(!detalhes.hidden));
    },
  }, 'Detalhes', sr(` de ${t.id}`));

  const li = h('li', {
    class: 'topico', id: `t-${t.id}`,
    onkeydown: (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || estaDigitando(e.target)) return;
      if (/^[0-4]$/.test(e.key)) { e.preventDefault(); mudarStatus(STATUS[Number(e.key)].id); }
    },
  },
  h('h3', { id: idTitulo }, h('span', { class: 'codigo' }, t.id), ' ', t.titulo),
  h('p', { class: 'tags' }, rotuloCargos(t)),
  selo,
  h('div', { class: 'acoes' },
    h('div', { class: 'campo campo-linha' }, h('label', { for: idSelect }, 'Status', sr(` de ${t.id}`)), select),
    botaoProx, botaoDet,
    h('a', { class: 'botao botao-link', href: `#/resumos/topico/${t.id}` }, 'Resumo', sr(` de ${t.id}`), resumosDoTopico(t.id).length ? h('span', { class: 'sr-only' }, ' (já existe)') : '')),
  detalhes);
  return li;
}

function camposDetalhes(t) {
  const p = progressoDe(t.id);
  const sr = (txt) => h('span', { class: 'sr-only' }, txt);
  const id = (nome) => `${nome}-${t.id}`;
  const salvar = async (mudancas, rotulo) => { await salvarProgresso(t.id, mudancas); anunciar(`${rotulo} de ${t.id} salvo.`); };

  const subitens = t.subitens.length
    ? h('ul', { class: 'subitens' }, t.subitens.map((s) => {
      const soTI = s.startsWith('(TI) ');
      return h('li', {}, soTI ? s.slice(5) : s, soTI ? h('span', { class: 'so-ti' }, ' (só Analista)') : null);
    }))
    : h('p', {}, 'O edital não detalha subitens para este tópico.');

  // Questões: acertos não podem passar do total feito.
  const idErro = id('erro-q');
  const erro = h('p', { id: idErro, class: 'erro', hidden: true });
  const feitas = h('input', { id: id('qf'), type: 'number', min: 0, step: 1, inputmode: 'numeric', value: p.questoesFeitas ?? 0 });
  const certas = h('input', { id: id('qc'), type: 'number', min: 0, step: 1, inputmode: 'numeric', value: p.questoesCertas ?? 0 });
  async function salvarQuestoes() {
    const f = Math.max(0, Number(feitas.value) || 0);
    const c = Math.max(0, Number(certas.value) || 0);
    if (c > f) {
      erro.textContent = 'Erro: as questões acertadas não podem ser mais que as questões feitas.';
      erro.hidden = false;
      certas.setAttribute('aria-invalid', 'true');
      certas.setAttribute('aria-describedby', idErro);
      return;
    }
    erro.hidden = true;
    certas.removeAttribute('aria-invalid');
    certas.removeAttribute('aria-describedby');
    await salvar({ questoesFeitas: f, questoesCertas: c }, 'Contagem de questões');
  }
  feitas.addEventListener('change', salvarQuestoes);
  certas.addEventListener('change', salvarQuestoes);

  const campos = [
    h('h4', {}, 'Subitens do edital'), subitens,
    h('h4', {}, 'Meu estudo'),
    h('div', { class: 'grade-campos' },
      h('div', { class: 'campo' },
        h('label', { for: id('conf') }, 'Confiança', sr(` em ${t.id}`)),
        h('select', { id: id('conf'), onchange: (e) => salvar({ confianca: e.target.value ? Number(e.target.value) : null }, 'Confiança') },
          h('option', { value: '' }, 'Sem avaliação'),
          [[1, 'muito baixa'], [2, 'baixa'], [3, 'média'], [4, 'alta'], [5, 'muito alta']].map(([v, r]) =>
            h('option', { value: v, selected: p.confianca === v }, `${v} – ${r}`)))),
      h('div', { class: 'campo' },
        h('label', { for: id('data') }, 'Último estudo', sr(` de ${t.id}`)),
        h('input', { id: id('data'), type: 'date', value: p.ultimoEstudo ?? '', onchange: (e) => salvar({ ultimoEstudo: e.target.value || null }, 'Data do último estudo') })),
      h('div', { class: 'campo' },
        h('label', { for: id('min') }, 'Minutos estudados', sr(` em ${t.id}`)),
        h('input', { id: id('min'), type: 'number', min: 0, step: 5, inputmode: 'numeric', value: p.minutosEstudados ?? 0,
          onchange: (e) => salvar({ minutosEstudados: Math.max(0, Number(e.target.value) || 0) }, 'Minutos estudados') })),
      h('div', { class: 'campo' }, h('label', { for: id('qf') }, 'Questões feitas', sr(` em ${t.id}`)), feitas),
      h('div', { class: 'campo' }, h('label', { for: id('qc') }, 'Questões acertadas', sr(` em ${t.id}`)), certas),
    ),
    erro,
    h('div', { class: 'campo' },
      h('label', { for: id('nota') }, 'Nota curta', sr(` sobre ${t.id}`)),
      h('textarea', { id: id('nota'), rows: 3, maxlength: 500, onchange: (e) => salvar({ nota: e.target.value }, 'Nota') }, p.nota ?? '')),
  ];

  // Flashcards do tópico (valem para os dois cargos se o tópico for compartilhado).
  const infoCartoes = h('p', {});
  const pintarCartoes = () => {
    const todos = cartoesDoTopico(t.id).length;
    const hoje = filaAtual({ cargo: 'ambos', disciplina: '', topico: t.id }).fila.length;
    infoCartoes.textContent = `${todos} ${todos === 1 ? 'cartão' : 'cartões'} neste tópico; ${hoje} para revisar hoje.`;
  };
  pintarCartoes();
  campos.push(h('h4', {}, 'Flashcards'), infoCartoes, h('div', { class: 'linha-botoes' },
    h('button', { type: 'button', class: 'botao', onclick: async () => { if (await abrirDialogoCartao({ topicoId: t.id })) pintarCartoes(); } }, 'Novo cartão', sr(` em ${t.id}`)),
    h('a', { class: 'botao botao-link', href: `#/revisao/cartoes/${t.id}` }, 'Ver cartões', sr(` de ${t.id}`))));

  // Legislação: link da versão atualizada da norma ("e suas alterações").
  if ('linkNorma' in t) {
    const idLink = id('link');
    const idAjuda = id('ajuda-link');
    const idErroLink = id('erro-link');
    const erroLink = h('p', { id: idErroLink, class: 'erro', hidden: true });
    const abrir = h('p', {});
    const pintarAbrir = (url) => abrir.replaceChildren(url
      ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, 'Abrir a versão atualizada da norma', sr(' (abre em nova aba, precisa de internet)'))
      : '');
    pintarAbrir(t.linkNorma);
    const entrada = h('input', {
      id: idLink, type: 'url', inputmode: 'url', value: t.linkNorma ?? '', 'aria-describedby': idAjuda,
      onchange: async (e) => {
        const v = e.target.value.trim();
        if (v && !/^https?:\/\//i.test(v)) {
          erroLink.textContent = 'Erro: o link precisa começar com http:// ou https://.';
          erroLink.hidden = false;
          entrada.setAttribute('aria-invalid', 'true');
          entrada.setAttribute('aria-describedby', `${idAjuda} ${idErroLink}`);
          return;
        }
        erroLink.hidden = true;
        entrada.removeAttribute('aria-invalid');
        entrada.setAttribute('aria-describedby', idAjuda);
        await salvarTopico(t.id, { linkNorma: v });
        pintarAbrir(v);
        anunciar(`Link da norma de ${t.id} salvo.`);
      },
    });
    campos.push(h('div', { class: 'campo' },
      h('label', { for: idLink }, 'Link da versão atualizada da norma', sr(` (${t.id})`)),
      h('p', { id: idAjuda, class: 'nota' }, 'O edital cobra a norma "e suas alterações". Cole aqui o endereço da versão compilada.'),
      entrada, erroLink, abrir));
  }
  return campos;
}

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
