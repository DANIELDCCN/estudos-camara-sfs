// Tela "Painel (Hoje)": contagem regressiva, próximos prazos e progresso.
import { h } from '../dom.js';
import { secao, barraProgresso, tituloTela } from '../componentes.js';
import { estado, calculadora, cargosDaVisao } from '../../dados/repositorio.js';
import { instante, textoContagem, formatarData, diaDaSemana, formatarHora, proximosEventos, periodo } from '../../logica/datas.js';
import { NOME_CARGO_COMPLETO } from '../../logica/constantes.js';
import { filaAtual } from './revisao.js';
import { descreverBloco, iconeSituacao } from './cronograma.js';
import { blocosDoDia } from '../../dados/repositorio.js';
import { ROTULO_SITUACAO, blocosAtrasados } from '../../logica/cronograma.js';
import { hojeISO } from '../../logica/datas.js';

export const titulo = 'Painel';

export function render() {
  const cargos = cargosDaVisao();
  const dataProva = estado.concurso?.dataProva ?? '2027-01-24';
  const calc = calculadora();

  // Contagem regressiva, ordenada pelo horário da prova (TI de manhã, AA à tarde).
  const itensProva = estado.cargos
    .filter((c) => cargos.includes(c.id))
    .sort((a, b) => a.horarioProva.inicio.localeCompare(b.horarioProva.inicio))
    .map((c) => {
      const hp = c.horarioProva;
      const alvo = instante(dataProva, hp.inicio);
      return h('li', { 'data-alvo': alvo.toISOString() },
        h('strong', {}, NOME_CARGO_COMPLETO[c.id]), ': ',
        h('span', { class: 'contagem' }, textoContagem(alvo)), '. ',
        `Prova em ${diaDaSemana(dataProva)}, ${formatarData(dataProva)}, turno ${c.turnoProva.toLowerCase()}, `,
        `das ${formatarHora(hp.inicio)} às ${formatarHora(hp.fim)}. `,
        `Portões abrem às ${formatarHora(hp.portoesAbrem)} e fecham às ${formatarHora(hp.portoesFecham)}.`);
    });

  const eventos = proximosEventos(estado.eventos, { cargos, limite: 4 });
  const listaEventos = eventos.length
    ? h('ul', { class: 'lista-simples' }, eventos.map((e) => h('li', {},
      h('strong', {}, e.titulo), ` – ${periodo(e)} – ${e.situacao}.`)))
    : h('p', {}, 'Nenhum prazo futuro no cronograma oficial.');

  const geral = calc.resumo({ cargos });
  const barras = [
    barraProgresso({ rotulo: cargos.length > 1 ? 'Geral (os dois cargos, sem contar em dobro)' : `Geral – ${NOME_CARGO_COMPLETO[cargos[0]]}`, r: geral, nivel: 'h3' }),
    ...(cargos.length > 1 ? cargos.map((c) => barraProgresso({ rotulo: NOME_CARGO_COMPLETO[c], r: calc.resumo({ cargos: [c] }), nivel: 'h3' })) : []),
  ];

  const tela = h('div', {},
    tituloTela('Painel – Hoje'),
    h('p', { class: 'visao-atual' }, `Visão: ${cargos.length > 1 ? 'os dois cargos' : NOME_CARGO_COMPLETO[cargos[0]]}. Troque a visão na tela Edital.`),
    secao('Contagem regressiva', h('ul', { class: 'lista-simples' }, itensProva),
      h('p', { class: 'nota' }, 'Horário oficial de Brasília. O edital avisa que as datas podem mudar.')),
    secao('Próximos prazos', listaEventos),
    secao('Progresso', ...barras, h('p', {}, h('a', { href: '#/edital' }, 'Abrir o checklist do edital'))),
    secao('Flashcards de hoje', ...blocoCartoes()),
    secao('Estudo de hoje', ...blocoHoje()),
  );

  // Atualiza a contagem a cada minuto, sem anunciar (seria barulho para o leitor de tela).
  const timer = setInterval(() => {
    if (!document.contains(tela)) return clearInterval(timer);
    for (const li of tela.querySelectorAll('[data-alvo]')) {
      li.querySelector('.contagem').textContent = textoContagem(new Date(li.dataset.alvo));
    }
  }, 60000);

  return tela;
}

/** Resumo dos flashcards do dia, na visão de cargo atual. */
function blocoCartoes() {
  const f = filaAtual({ cargo: null, disciplina: '', topico: '' });
  const total = f.fila.length;
  if (!total) {
    return [h('p', {}, 'Nenhum cartão para revisar agora.'), h('p', {}, h('a', { href: '#/revisao' }, 'Abrir a Revisão'))];
  }
  return [
    h('p', { class: 'destaque-numero' }, `${total} para revisar: ${f.vencidos.length} ${f.vencidos.length === 1 ? 'vencido' : 'vencidos'} e ${f.novos.length} ${f.novos.length === 1 ? 'novo' : 'novos'}.`),
    h('p', {}, h('a', { href: '#/revisao/sessao', class: 'botao botao-primario' }, 'Começar revisão')),
  ];
}

/** Tarefas do dia, vindas do cronograma. */
function blocoHoje() {
  if (!estado.blocos.length) {
    return [h('p', {}, 'Ainda não há cronograma.'), h('p', {}, h('a', { href: '#/cronograma/ajustes', class: 'botao botao-primario' }, 'Criar o cronograma'))];
  }
  const hoje = hojeISO();
  const blocos = blocosDoDia(hoje);
  const feitos = blocos.filter((b) => b.situacao === 'feito').length;
  const atrasados = blocosAtrasados(estado.blocos, hoje).length;
  return [
    blocos.length
      ? h('p', {}, `${blocos.length} ${blocos.length === 1 ? 'bloco' : 'blocos'} hoje, ${feitos} ${feitos === 1 ? 'feito' : 'feitos'}.`)
      : h('p', {}, 'Nenhum bloco planejado para hoje.'),
    blocos.length ? h('ol', { class: 'lista-simples lista-hoje' }, blocos.map((b) => h('li', {},
      h('span', { class: 'selo' }, iconeSituacao(b.situacao), h('span', {}, `${ROTULO_SITUACAO[b.situacao]}:`)), ' ',
      `${descreverBloco(b)} (${b.minutosPlanejados} min).`))) : null,
    atrasados ? h('p', {}, h('strong', {}, 'Atrasos: '), `${atrasados} ${atrasados === 1 ? 'bloco' : 'blocos'} de dias anteriores sem marcação.`) : null,
    h('p', {}, h('a', { href: '#/cronograma', class: 'botao botao-link' }, 'Abrir o cronograma de hoje')),
  ];
}
