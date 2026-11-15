// Tela "Cronograma": plano de estudos do dia e da semana, resumo do plano e ajustes.
// Endereços:
//   #/cronograma                    hoje
//   #/cronograma/dia/2026-11-20     um dia
//   #/cronograma/semana[/AAAA-MM-DD] semana (de segunda a domingo)
//   #/cronograma/plano              resumo do plano e avisos
//   #/cronograma/ajustes            horas por dia, folgas, duração do bloco etc.
import { h, svg, novoId } from '../dom.js';
import { secao, tituloTela } from '../componentes.js';
import { anunciar } from '../a11y.js';
import {
  estado, blocosDoDia, salvarBloco, replanejar, salvarConfig, dataProvaDoPlano, topicoPorId, cargosDaVisao,
} from '../../dados/repositorio.js';
import { SITUACOES, ROTULO_SITUACAO, NOME_DIA, siglaDia, somarDias, inicioDaSemana, blocosAtrasados } from '../../logica/cronograma.js';
import { hojeISO, formatarData, diaDaSemana } from '../../logica/datas.js';
import { NOME_CARGO_COMPLETO, NOME_CARGO } from '../../logica/constantes.js';

export const titulo = 'Cronograma';

const VISOES = [['', 'Hoje'], ['semana', 'Semana'], ['plano', 'Resumo do plano'], ['ajustes', 'Ajustes']];

export function render(param = '') {
  const [visao, arg] = param.split('/');
  const temPlano = estado.blocos.length > 0;
  let conteudo;
  if (visao === 'ajustes' || (!temPlano && visao !== 'plano')) conteudo = ajustes(!temPlano);
  else if (visao === 'semana') conteudo = semana(arg || hojeISO());
  else if (visao === 'plano') conteudo = resumoPlano();
  else conteudo = dia(visao === 'dia' && /^\d{4}-\d{2}-\d{2}$/.test(arg ?? '') ? arg : hojeISO());
  const atual = !temPlano ? 'ajustes' : (visao === 'dia' ? '' : visao ?? '');
  return h('div', {},
    tituloTela('Cronograma'),
    h('nav', { 'aria-label': 'Visões do cronograma' },
      h('ul', { class: 'menu submenu' }, VISOES.map(([v, r]) => h('li', {},
        h('a', { href: v ? `#/cronograma/${v}` : '#/cronograma', 'aria-current': v === atual ? 'page' : false }, r))))),
    conteudo);
}

// ---------- Textos dos blocos ----------
export function descreverBloco(b) {
  if (b.tipo === 'estudo') {
    const t = topicoPorId(b.topicoId);
    const d = estado.disciplinas.find((x) => x.id === b.disciplinaId);
    return t ? `${d?.nome ?? ''}: ${t.id} ${t.titulo}` : 'Estudo';
  }
  if (b.tipo === 'revisao') return 'Revisão de flashcards';
  if (b.tipo === 'simulado') return 'Simulado (prova completa, cronometrada)';
  return 'Revisão geral (resumos e questões dos tópicos mais fracos)';
}

const TIPO = { estudo: 'Estudo', revisao: 'Flashcards', 'revisao-geral': 'Revisão geral', simulado: 'Simulado' };

const textoMinutos = (min) => {
  const hh = Math.floor(min / 60);
  const mm = min % 60;
  if (!hh) return `${mm} min`;
  return mm ? `${hh} h ${mm} min` : `${hh} h`;
};

/** Ícone da situação: círculo vazio, meio, cheio ou cortado. Decorativo: o texto vem ao lado. */
export function iconeSituacao(sit) {
  const miolo = {
    pendente: '',
    parcial: '<path d="M12 4 A8 8 0 0 1 12 20 Z" fill="currentColor"/>',
    feito: '<circle cx="12" cy="12" r="8" fill="currentColor"/>',
    pulado: '<line x1="5" y1="19" x2="19" y2="5" stroke="currentColor" stroke-width="3"/>',
  }[sit] ?? '';
  return svg(`<svg class="icone-status" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2.5"/>${miolo}</svg>`);
}

/** Um bloco na lista, com situação e minutos reais editáveis. */
export function itemBloco(b, { hoje = hojeISO(), aoMudar = () => {} } = {}) {
  const ids = { sit: novoId('sit'), min: novoId('min'), desc: novoId('desc') };
  const quem = `do bloco ${b.ordem} de ${formatarData(b.data)}`;
  const sr = (txt) => h('span', { class: 'sr-only' }, txt);
  const selo = h('p', { class: 'selo' });
  const pintar = () => {
    const atrasado = b.situacao === 'pendente' && b.data < hoje;
    selo.replaceChildren(iconeSituacao(b.situacao), h('span', {}, ROTULO_SITUACAO[b.situacao] + (atrasado ? ' (atrasado)' : '')),
      b.minutosReais !== null && b.minutosReais !== undefined ? h('span', { class: 'nota' }, ` · ${b.minutosReais} min reais`) : '');
  };
  pintar();
  const minutos = h('input', { id: ids.min, type: 'number', min: 0, max: 600, step: 5, inputmode: 'numeric', value: b.minutosReais ?? '',
    onchange: async (e) => {
      const v = e.target.value === '' ? null : Math.max(0, Math.round(Number(e.target.value)) || 0);
      await salvarBloco(b.id, { minutosReais: v });
      pintar();
      aoMudar();
      anunciar(v === null ? 'Minutos reais apagados.' : `${v} minutos registrados no bloco ${b.ordem}.`);
    } });
  const select = h('select', { id: ids.sit, onchange: async (e) => {
    const situacao = e.target.value;
    const mudancas = { situacao };
    if (situacao === 'feito' && (b.minutosReais === null || b.minutosReais === undefined)) mudancas.minutosReais = b.minutosPlanejados;
    if (situacao === 'pulado') mudancas.minutosReais = 0;
    await salvarBloco(b.id, mudancas);
    minutos.value = b.minutosReais ?? '';
    pintar();
    aoMudar();
    const t = b.topicoId ? topicoPorId(b.topicoId) : null;
    const dica = t && (situacao === 'feito' || situacao === 'parcial') ? ` Se avançou, atualize o status de ${t.id} no Edital.` : '';
    anunciar(`Bloco ${b.ordem} marcado como ${ROTULO_SITUACAO[situacao]}.${dica}`);
  } }, SITUACOES.map((s) => h('option', { value: s.id, selected: s.id === b.situacao }, s.rotulo)));

  const t = b.topicoId ? topicoPorId(b.topicoId) : null;
  const links = t
    ? [h('a', { href: `#/resumos/topico/${t.id}` }, 'Resumo', sr(` de ${t.id}`)), ' · ', h('a', { href: `#/edital/${t.id}` }, 'Ver no Edital', sr(` (${t.id})`))]
    : b.tipo === 'revisao' ? [h('a', { href: '#/revisao' }, 'Abrir a Revisão')]
      : b.tipo === 'revisao-geral' ? [h('a', { href: '#/resumos' }, 'Abrir os Resumos')] : [];

  return h('li', { class: `topico bloco bloco-${b.tipo}` },
    h('p', { class: 'tags' }, `Bloco ${b.ordem} · ${TIPO[b.tipo]} · ${textoMinutos(b.minutosPlanejados)}`),
    h('p', { id: ids.desc, class: 'bloco-descricao' }, descreverBloco(b)),
    selo,
    h('div', { class: 'acoes' },
      h('div', { class: 'campo' }, h('label', { for: ids.sit }, 'Situação', sr(` ${quem}`)), select),
      h('div', { class: 'campo campo-curto' }, h('label', { for: ids.min }, 'Minutos reais', sr(` ${quem}`)), minutos)),
    links.length ? h('p', {}, links) : null);
}

// ---------- Avisos do plano ----------
function avisosDoPlano({ comBotao = true } = {}) {
  const itens = [];
  const atrasados = blocosAtrasados(estado.blocos, hojeISO());
  const plano = estado.config.ultimoPlano;
  for (const a of plano?.avisos ?? []) itens.push(h('p', {}, h('strong', {}, 'Atenção: '), a));
  if (atrasados.length) itens.push(h('p', {}, h('strong', {}, 'Atrasos: '), `${atrasados.length} ${atrasados.length === 1 ? 'bloco de dias anteriores ficou' : 'blocos de dias anteriores ficaram'} sem marcação. Replanejar redistribui esses tópicos a partir de hoje.`));
  const cargosPlano = plano?.cargos?.join('+');
  if (cargosPlano && cargosPlano !== cargosDaVisao().join('+')) {
    itens.push(h('p', {}, h('strong', {}, 'Cargo: '), `o plano foi feito para ${rotuloCargos(plano.cargos)}, e a visão atual é ${rotuloCargos(cargosDaVisao())}. Replaneje para trocar.`));
  }
  if (!itens.length) return null;
  return h('section', { class: 'cartao aviso-plano', 'aria-labelledby': 'h-avisos-plano' },
    h('h2', { id: 'h-avisos-plano' }, 'Avisos do plano'), ...itens,
    comBotao ? botaoReplanejar() : null);
}

const rotuloCargos = (cs) => (cs.length > 1 ? 'os dois cargos' : NOME_CARGO_COMPLETO[cs[0]]);

function botaoReplanejar(rotulo = 'Replanejar a partir de hoje') {
  return h('button', { type: 'button', class: 'botao botao-primario', onclick: async () => {
    const plano = await replanejar();
    sessionStorage.setItem('ecsfs-aviso-cron', mensagemPlano(plano));
    irPara(location.hash); // redesenha a tela atual com o plano novo
  } }, rotulo);
}

function mensagemPlano(plano) {
  const n = plano.blocos.length;
  return `Cronograma replanejado: ${n} ${n === 1 ? 'bloco' : 'blocos'} até a véspera da prova.${plano.avisos.length ? ' Atenção: as horas não bastam para tudo; veja os avisos do plano.' : ' As horas bastam para cobrir todos os tópicos.'}`;
}

/** Mostra (e anuncia) a mensagem deixada pelo último replanejamento. */
function mensagemPendente() {
  const msg = sessionStorage.getItem('ecsfs-aviso-cron');
  if (!msg) return null;
  sessionStorage.removeItem('ecsfs-aviso-cron');
  anunciar(msg);
  return h('p', { class: 'cartao mensagem-plano', role: 'status' }, msg);
}

// ---------- Dia ----------
function dia(data) {
  const hoje = hojeISO();
  // Replanejamento automático, no máximo uma vez por dia, quando há blocos atrasados.
  if (data === hoje && estado.config.replanejarAuto !== false && blocosAtrasados(estado.blocos, hoje).length
    && hojeISO(new Date(estado.config.ultimoPlano?.geradoEm ?? 0)) < hoje) {
    const qtd = blocosAtrasados(estado.blocos, hoje).length;
    replanejar().then((plano) => {
      sessionStorage.setItem('ecsfs-aviso-cron', `Havia ${qtd} ${qtd === 1 ? 'bloco atrasado' : 'blocos atrasados'}: o cronograma foi replanejado sozinho a partir de hoje. ${mensagemPlano(plano)}`);
      irPara(location.hash);
    });
  }
  const blocos = blocosDoDia(data);
  const totais = h('p', {});
  const pintarTotais = () => {
    const planejado = blocos.reduce((s, b) => s + b.minutosPlanejados, 0);
    const real = blocos.reduce((s, b) => s + (b.minutosReais ?? 0), 0);
    const feitos = blocos.filter((b) => b.situacao === 'feito').length;
    totais.textContent = blocos.length ? `Planejado: ${textoMinutos(planejado)}. Registrado: ${textoMinutos(real)}. Blocos feitos: ${feitos} de ${blocos.length}.` : motivoVazio();
  };
  const titulo = `${diaDaSemana(data).replace(/^./, (c) => c.toUpperCase())}, ${formatarData(data)}${data === hoje ? ' (hoje)' : ''}`;
  const motivoVazio = () => {
    if (estado.config.diasBloqueados.includes(data)) return 'Dia de folga (bloqueado nos ajustes).';
    if (data >= dataProvaDoPlano()) return 'Este dia é depois da véspera da prova: fora do plano.';
    if (!(Number(estado.config.horasPorDiaSemana[siglaDia(data)]) > 0)) return `Sem horas de estudo às ${NOME_DIA[siglaDia(data)].toLowerCase()}s (ajustável).`;
    return 'Nenhum bloco planejado para este dia.';
  };
  pintarTotais();
  return h('div', {},
    mensagemPendente(),
    data === hoje ? avisosDoPlano() : null,
    h('section', { 'aria-labelledby': 'h-dia' },
      h('h2', { id: 'h-dia' }, titulo),
      totais,
      data >= estado.config.ultimoPlano?.resumo?.inicioReta && data < dataProvaDoPlano()
        ? h('p', { class: 'nota' }, 'Reta final: só revisão e simulados.') : null,
      blocos.length ? h('ol', { class: 'lista-topicos' }, blocos.map((b) => itemBloco(b, { hoje, aoMudar: pintarTotais }))) : null,
      h('nav', { 'aria-label': 'Outros dias', class: 'linha-botoes' },
        h('a', { class: 'botao botao-link', href: `#/cronograma/dia/${somarDias(data, -1)}` }, 'Dia anterior'),
        data !== hoje ? h('a', { class: 'botao botao-link', href: '#/cronograma' }, 'Hoje') : null,
        h('a', { class: 'botao botao-link', href: `#/cronograma/dia/${somarDias(data, 1)}` }, 'Próximo dia'))));
}

// ---------- Semana ----------
function semana(dataRef) {
  const ini = inicioDaSemana(/^\d{4}-\d{2}-\d{2}$/.test(dataRef) ? dataRef : hojeISO());
  const fim = somarDias(ini, 6);
  const hoje = hojeISO();
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(ini, i));
  const total = dias.reduce((s, d) => s + blocosDoDia(d).reduce((x, b) => x + b.minutosPlanejados, 0), 0);
  const feitos = dias.reduce((s, d) => s + blocosDoDia(d).filter((b) => b.situacao === 'feito').length, 0);
  const qtd = dias.reduce((s, d) => s + blocosDoDia(d).length, 0);
  return h('div', {},
    mensagemPendente(),
    h('section', { 'aria-labelledby': 'h-semana' },
      h('h2', { id: 'h-semana' }, `Semana de ${formatarData(ini)} a ${formatarData(fim)}`),
      h('p', {}, `${qtd} ${qtd === 1 ? 'bloco' : 'blocos'}, ${textoMinutos(total)} planejados, ${feitos} ${feitos === 1 ? 'feito' : 'feitos'}.`),
      h('nav', { 'aria-label': 'Outras semanas', class: 'linha-botoes' },
        h('a', { class: 'botao botao-link', href: `#/cronograma/semana/${somarDias(ini, -7)}` }, 'Semana anterior'),
        h('a', { class: 'botao botao-link', href: `#/cronograma/semana/${somarDias(ini, 7)}` }, 'Próxima semana')),
      dias.map((d) => {
        const bs = blocosDoDia(d);
        const idH = novoId('h-dia');
        const min = bs.reduce((s, b) => s + b.minutosPlanejados, 0);
        return h('section', { class: 'dia-semana', 'aria-labelledby': idH },
          h('h3', { id: idH }, `${NOME_DIA[siglaDia(d)]}, ${formatarData(d)}${d === hoje ? ' (hoje)' : ''}${bs.length ? ` – ${textoMinutos(min)}` : ''}`),
          bs.length ? h('ol', { class: 'lista-topicos' }, bs.map((b) => itemBloco(b, { hoje })))
            : h('p', {}, estado.config.diasBloqueados.includes(d) ? 'Folga.' : 'Sem blocos.'));
      })));
}

// ---------- Resumo do plano ----------
function resumoPlano() {
  const plano = estado.config.ultimoPlano;
  if (!plano) return h('p', {}, 'Ainda não há plano. Vá em Ajustes para gerar.');
  const r = plano.resumo;
  const estudo = estado.blocos.filter((b) => b.tipo === 'estudo');
  const linhas = estado.disciplinas
    .filter((d) => d.cargos.some((c) => (plano.cargos ?? ['AA', 'TI']).includes(c)))
    .map((d) => {
      const bs = estudo.filter((b) => b.disciplinaId === d.id);
      return { d, n: bs.length, min: bs.reduce((s, b) => s + b.minutosPlanejados, 0), feitos: bs.filter((b) => b.situacao === 'feito').length };
    });
  const semCobertura = (r.topicosSemCobertura ?? []).map((id) => topicoPorId(id)).filter(Boolean);
  return h('div', {},
    mensagemPendente(),
    avisosDoPlano({ comBotao: false }),
    secao('Resumo do plano',
      h('ul', { class: 'lista-simples' },
        h('li', {}, `Gerado em ${new Date(plano.geradoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}, para ${rotuloCargos(plano.cargos ?? ['AA', 'TI'])}.`),
        h('li', {}, `Prova em ${formatarData(dataProvaDoPlano())}. Reta final (só revisão e simulados) a partir de ${formatarData(r.inicioReta)}.`),
        h('li', {}, `Horas por semana nos ajustes: ${r.horasSemanaAtuais.toLocaleString('pt-BR')}.`),
        h('li', {}, `Tópicos pendentes: ${r.topicosPendentes}. Blocos de estudo necessários: ${r.demandaTotal}. Blocos de estudo no plano: ${r.blocosEstudo}.`),
        h('li', {}, r.faltam
          ? `Faltam ${r.faltam} blocos. Seriam necessárias cerca de ${r.horasSemanaNecessarias?.toLocaleString('pt-BR')} horas por semana.`
          : 'As horas bastam para cobrir todos os tópicos pendentes.')),
      botaoReplanejar()),
    h('section', { class: 'cartao', 'aria-labelledby': 'h-tab-disc' },
      h('h2', { id: 'h-tab-disc' }, 'Blocos de estudo por disciplina'),
      h('table', { class: 'tabela' },
        h('caption', { class: 'sr-only' }, 'Blocos de estudo por disciplina: quantidade, horas planejadas e blocos feitos'),
        h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Disciplina'), h('th', { scope: 'col' }, 'Blocos'), h('th', { scope: 'col' }, 'Horas'), h('th', { scope: 'col' }, 'Feitos'))),
        h('tbody', {}, linhas.map(({ d, n, min, feitos }) => h('tr', {},
          h('th', { scope: 'row' }, d.nome), h('td', {}, String(n)), h('td', {}, textoMinutos(min)), h('td', {}, String(feitos))))))),
    semCobertura.length ? secao('Tópicos sem todos os blocos necessários',
      h('p', {}, 'São os de menor prioridade (menor peso na prova, mais avançados ou com mais confiança).'),
      h('ul', { class: 'lista-simples' }, semCobertura.map((t) => h('li', {}, `${t.id} ${t.titulo} (${t.cargos.map((c) => NOME_CARGO[c]).join(' e ')})`)))) : null,
    secao('Como a prioridade é calculada',
      h('p', {}, 'Prioridade = peso do tópico na prova × (1 − progresso) × fator de confiança baixa. Tópicos compartilhados somam o peso nos dois cargos. Fator: 1 + (5 − confiança) × 0,25; sem avaliação, 1,5.'),
      h('p', {}, 'Cada tópico precisa de alguns blocos (padrão: 3 para ir de Não iniciado a Dominado), menos os já feitos depois da última mudança de status. Os blocos vão primeiro para os tópicos de maior prioridade, intercalando as disciplinas.')));
}

// ---------- Ajustes ----------
function ajustes(primeiraVez) {
  const c = estado.config;
  const ids = Object.fromEntries(['ini', 'prova', 'dur', 'rev', 'reta', 'bpt', 'folga', 'erro'].map((k) => [k, novoId(`aj-${k}`)]));
  const nomeCargo = novoId('aj-cargo');
  const erro = h('p', { id: ids.erro, class: 'erro', role: 'alert', hidden: true });
  const horas = Object.keys(NOME_DIA).map((sigla) => {
    const id = novoId(`aj-${sigla}`);
    return { sigla, id, input: h('input', { id, type: 'number', min: 0, max: 16, step: 0.5, inputmode: 'decimal', value: c.horasPorDiaSemana[sigla] ?? 0 }) };
  });
  const campo = (id, rotulo, input, ajuda) => h('div', { class: 'campo' },
    h('label', { for: id }, rotulo), ajuda ? h('p', { id: `${id}-ajuda`, class: 'nota' }, ajuda) : null, input);
  const num = (id, valor, min, max, step = 1) => h('input', { id, type: 'number', min, max, step, inputmode: 'numeric', value: valor, 'aria-describedby': `${id}-ajuda` });

  const inicio = h('input', { id: ids.ini, type: 'date', value: c.dataInicioPlano ?? '', 'aria-describedby': `${ids.ini}-ajuda` });
  const prova = h('input', { id: ids.prova, type: 'date', value: dataProvaDoPlano(), 'aria-describedby': `${ids.prova}-ajuda` });
  const duracao = num(ids.dur, c.duracaoBloco, 15, 180, 5);
  const revisao = num(ids.rev, c.percRevisao, 0, 60);
  const reta = num(ids.reta, c.diasRetaFinal, 0, 30);
  const bpt = num(ids.bpt, c.blocosPorTopico, 1, 10);
  const auto = h('input', { type: 'checkbox', checked: c.replanejarAuto !== false });
  for (const el of [inicio, prova, duracao, revisao, reta, bpt]) el.dataset.ajuda = el.getAttribute('aria-describedby');

  // Dias de folga
  let folgas = [...c.diasBloqueados].sort();
  const listaFolgas = h('ul', { class: 'lista-simples' });
  const novaFolga = h('input', { id: ids.folga, type: 'date' });
  const pintarFolgas = () => listaFolgas.replaceChildren(...(folgas.length ? folgas.map((d) => h('li', {},
    `${diaDaSemana(d)}, ${formatarData(d)} `,
    h('button', { type: 'button', class: 'botao', onclick: () => { folgas = folgas.filter((x) => x !== d); pintarFolgas(); anunciar(`Folga de ${formatarData(d)} removida. Salve para aplicar.`); novaFolga.focus(); } },
      'Remover', h('span', { class: 'sr-only' }, ` folga de ${formatarData(d)}`)))) : [h('li', {}, 'Nenhuma folga.')]));
  pintarFolgas();

  const validar = () => {
    const todos = [inicio, prova, duracao, revisao, reta, bpt, ...horas.map((x) => x.input)];
    for (const el of todos) {
      el.removeAttribute('aria-invalid');
      if (el.dataset.ajuda) el.setAttribute('aria-describedby', el.dataset.ajuda); else el.removeAttribute('aria-describedby');
    }
    const falha = (el, msg) => {
      erro.textContent = `Erro: ${msg}`;
      erro.hidden = false;
      el.setAttribute('aria-invalid', 'true');
      el.setAttribute('aria-describedby', [el.dataset.ajuda, ids.erro].filter(Boolean).join(' '));
      el.focus();
      return false;
    };
    for (const { sigla, input } of horas) {
      const v = Number(String(input.value).replace(',', '.'));
      if (!Number.isFinite(v) || v < 0 || v > 16) return falha(input, `as horas de ${NOME_DIA[sigla].toLowerCase()} devem ficar entre 0 e 16.`);
    }
    if (!prova.value) return falha(prova, 'informe a data da prova.');
    if (inicio.value && inicio.value >= prova.value) return falha(inicio, 'a data de início precisa ser antes da prova.');
    const faixa = [[duracao, 15, 180, 'a duração do bloco deve ficar entre 15 e 180 minutos.'], [revisao, 0, 60, 'a revisão deve ficar entre 0% e 60%.'],
      [reta, 0, 30, 'a reta final deve ter de 0 a 30 dias.'], [bpt, 1, 10, 'os blocos por tópico devem ficar entre 1 e 10.']];
    for (const [el, min, max, msg] of faixa) {
      const v = Number(el.value);
      if (!Number.isFinite(v) || v < min || v > max) return falha(el, msg);
    }
    erro.hidden = true;
    return true;
  };

  // novalidate: a validação é a do app, com mensagens em português ligadas ao campo.
  const form = h('form', { novalidate: true, onsubmit: async (e) => {
    e.preventDefault();
    if (!validar()) return;
    const cargo = form.querySelector(`input[name="${nomeCargo}"]:checked`).value;
    await salvarConfig({
      horasPorDiaSemana: Object.fromEntries(horas.map(({ sigla, input }) => [sigla, Number(String(input.value).replace(',', '.'))])),
      diasBloqueados: folgas,
      dataInicioPlano: inicio.value || null,
      dataProvaPlano: prova.value === estado.concurso?.dataProva ? null : prova.value,
      duracaoBloco: Number(duracao.value), percRevisao: Number(revisao.value), diasRetaFinal: Number(reta.value), blocosPorTopico: Number(bpt.value),
      cargoFoco: cargo, replanejarAuto: auto.checked,
    });
    const plano = await replanejar();
    sessionStorage.setItem('ecsfs-aviso-cron', mensagemPlano(plano));
    irPara('#/cronograma');
  } },
  h('fieldset', {}, h('legend', {}, 'Horas disponíveis por dia da semana'),
    h('div', { class: 'grade-campos' }, horas.map(({ sigla, id, input }) => h('div', { class: 'campo' }, h('label', { for: id }, NOME_DIA[sigla]), input)))),
  h('fieldset', {}, h('legend', {}, 'Cargo em foco'),
    [['ambos', 'Os dois cargos'], ['AA', NOME_CARGO_COMPLETO.AA], ['TI', NOME_CARGO_COMPLETO.TI]].map(([v, r]) => h('label', { class: 'opcao' },
      h('input', { type: 'radio', name: nomeCargo, value: v, checked: c.cargoFoco === v }), ` ${r}`))),
  h('div', { class: 'grade-campos' },
    campo(ids.ini, 'Data de início', inicio, 'Em branco = hoje.'),
    campo(ids.prova, 'Data da prova', prova, `Do edital: ${formatarData(estado.concurso?.dataProva ?? '2027-01-24')}. O plano vai até a véspera.`),
    campo(ids.dur, 'Duração do bloco (minutos)', duracao, 'Padrão: 50.'),
    campo(ids.rev, 'Tempo para flashcards (% de cada dia)', revisao, 'Padrão: 20%.'),
    campo(ids.reta, 'Reta final (dias antes da prova)', reta, 'Só revisão e simulados. Padrão: 7.'),
    campo(ids.bpt, 'Blocos por tópico', bpt, 'Para levar um tópico de Não iniciado a Dominado. Padrão: 3.')),
  h('fieldset', {}, h('legend', {}, 'Dias de folga'),
    listaFolgas,
    h('div', { class: 'campo' }, h('label', { for: ids.folga }, 'Nova folga'), novaFolga),
    h('button', { type: 'button', class: 'botao', onclick: () => {
      const d = novaFolga.value;
      if (!d) { anunciar('Escolha uma data primeiro.'); novaFolga.focus(); return; }
      if (!folgas.includes(d)) folgas = [...folgas, d].sort();
      novaFolga.value = '';
      pintarFolgas();
      anunciar(`Folga em ${formatarData(d)} adicionada. Salve para aplicar.`);
    } }, 'Adicionar folga')),
  h('label', { class: 'opcao' }, auto, ' Replanejar sozinho quando houver blocos atrasados (uma vez por dia, ao abrir o cronograma)'),
  erro,
  h('button', { type: 'submit', class: 'botao botao-primario botao-grande' }, primeiraVez ? 'Gerar cronograma' : 'Salvar e replanejar'));

  return h('div', {},
    primeiraVez ? h('section', { class: 'cartao', 'aria-labelledby': 'h-intro' },
      h('h2', { id: 'h-intro' }, 'Primeiro plano'),
      h('p', {}, 'Preencha quantas horas você pode estudar em cada dia da semana e use "Gerar cronograma". O plano vai de hoje até a véspera da prova, com a última semana só para revisão e simulados.')) : null,
    h('section', { class: 'cartao', 'aria-labelledby': 'h-ajustes' }, h('h2', { id: 'h-ajustes' }, 'Ajustes do plano'), form));
}

/** Vai para um endereço; se já estiver nele, redesenha a tela. */
function irPara(hash) {
  if (location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = hash;
}
