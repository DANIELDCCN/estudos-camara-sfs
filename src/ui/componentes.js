// Componentes reutilizáveis: barra de progresso, ícone de status, seções.
import { h, svg, novoId } from './dom.js';
import { formatarPct } from '../logica/progresso.js';
import { STATUS_POR_ID } from '../logica/constantes.js';

/**
 * Ícone de status em forma de "pizza": vazio, 1/4, 1/2, 3/4 e cheio.
 * A forma muda a cada status, então não depende de cor. É decorativo
 * (aria-hidden), porque o texto do status sempre aparece ao lado.
 */
export function iconeStatus(statusId) {
  const f = STATUS_POR_ID[statusId]?.fracao ?? 0;
  let miolo = '';
  if (f >= 1) miolo = '<circle cx="12" cy="12" r="8" fill="currentColor"/>';
  else if (f > 0) {
    const ang = f * 2 * Math.PI;
    const x = 12 + 8 * Math.sin(ang);
    const y = 12 - 8 * Math.cos(ang);
    const grande = f > 0.5 ? 1 : 0;
    miolo = `<path d="M12 12 L12 4 A8 8 0 ${grande} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z" fill="currentColor"/>`;
  }
  return svg(`<svg class="icone-status" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2.5"/>${miolo}</svg>`);
}

/**
 * Barra de progresso acessível, sempre com o número em texto.
 * @param {{rotulo: string, r: {total:number, concluidos:number, pctSimples:number, pctPonderado:number}}} p
 */
export function barraProgresso({ rotulo, r, nivel = 'p' }) {
  const id = novoId('pb');
  const simples = formatarPct(r.pctSimples);
  const ponderado = formatarPct(r.pctPonderado);
  const texto = `${r.concluidos} de ${r.total} tópicos concluídos, ${simples}. Ponderado pelo peso na prova: ${ponderado}.`;
  return h('div', { class: 'progresso' },
    h(nivel, { class: 'progresso-rotulo', id }, rotulo),
    h('div', {
      class: 'progresso-trilho', role: 'progressbar', 'aria-labelledby': id,
      'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(r.pctPonderado),
      'aria-valuetext': texto,
    }, h('div', { class: 'progresso-preenchido', style: `width: ${Math.min(100, r.pctPonderado).toFixed(2)}%` })),
    h('p', { class: 'progresso-texto', 'aria-hidden': 'true' },
      h('span', {}, `${r.concluidos} de ${r.total} concluídos (${simples})`),
      ' · ',
      h('span', {}, `ponderado ${ponderado}`)),
  );
}

/** Seção com título h2 ligado por aria-labelledby. */
export function secao(titulo, ...conteudo) {
  const id = novoId('sec');
  return h('section', { class: 'cartao', 'aria-labelledby': id }, h('h2', { id }, titulo), ...conteudo);
}

/** Título da tela (h1) que recebe o foco quando a tela muda. */
export function tituloTela(texto) {
  return h('h1', { tabindex: '-1', id: 'titulo-tela' }, texto);
}
