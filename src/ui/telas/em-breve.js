// Telas que chegam nas próximas etapas. Ficam no menu desde já, para o menu não mudar de lugar.
import { h } from '../dom.js';
import { tituloTela } from '../componentes.js';

export function criarTelaEmBreve(nome, etapa, descricao) {
  return {
    titulo: nome,
    render: () => h('div', {},
      tituloTela(nome),
      h('p', { class: 'cartao' }, `Esta tela chega na ${etapa}. ${descricao}`),
      h('p', {}, h('a', { href: '#/edital' }, 'Ir para o checklist do edital'))),
  };
}

export const cronograma = criarTelaEmBreve('Cronograma', 'Etapa 3', 'Ela vai montar o plano diário e semanal até a prova, com replanejamento automático.');
export const revisao = criarTelaEmBreve('Revisão', 'Etapa 2', 'Ela vai mostrar a fila de flashcards do dia, com revisão só pelo teclado.');
export const resumos = criarTelaEmBreve('Resumos', 'Etapa 2', 'Ela vai reunir os resumos em Markdown de cada tópico, com busca.');
