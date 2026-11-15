// Campos de seleção reutilizados: tópico (agrupado por disciplina) e disciplina.
import { h } from './dom.js';
import { estado } from '../dados/repositorio.js';

/**
 * <select> de tópicos, agrupados por disciplina (optgroup).
 * @param {{id: string, valor?: string, opcaoVazia?: string, onchange?: Function, cargos?: string[]}} p
 */
export function seletorTopicos({ id, valor = '', opcaoVazia, onchange, cargos }) {
  const grupos = estado.disciplinas
    .filter((d) => !cargos || d.cargos.some((c) => cargos.includes(c)))
    .map((d) => h('optgroup', { label: d.nome },
      estado.topicos
        .filter((t) => t.disciplinaId === d.id && !t.oculto && (!cargos || t.cargos.some((c) => cargos.includes(c))))
        .map((t) => h('option', { value: t.id, selected: t.id === valor }, `${t.id} ${t.titulo}`))));
  return h('select', { id, onchange },
    opcaoVazia !== undefined ? h('option', { value: '', selected: !valor }, opcaoVazia) : null,
    grupos);
}

export function seletorDisciplinas({ id, valor = '', opcaoVazia = 'Todas', onchange }) {
  return h('select', { id, onchange },
    h('option', { value: '' }, opcaoVazia),
    estado.disciplinas.map((d) => h('option', { value: d.id, selected: d.id === valor }, d.nome)));
}
