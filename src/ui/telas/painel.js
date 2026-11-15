// Tela "Painel (Hoje)": contagem regressiva, próximos prazos e progresso.
import { h } from '../dom.js';
import { secao, barraProgresso, tituloTela } from '../componentes.js';
import { estado, calculadora, cargosDaVisao } from '../../dados/repositorio.js';
import { instante, textoContagem, formatarData, diaDaSemana, formatarHora, proximosEventos, periodo } from '../../logica/datas.js';
import { NOME_CARGO_COMPLETO } from '../../logica/constantes.js';

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
    secao('Estudo de hoje',
      h('p', {}, 'As tarefas do dia aparecem aqui quando o cronograma automático estiver pronto (Etapa 3).'),
      h('p', {}, 'Os flashcards para revisar hoje aparecem aqui na Etapa 2.')),
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
