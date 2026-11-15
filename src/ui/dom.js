// Criação de elementos sem innerHTML (evita injeção de HTML com texto do usuário).

/**
 * h('button', { type: 'button', onclick: fn, 'aria-expanded': 'false' }, 'Texto', outroElemento)
 * - Atributos `on*` viram event listeners.
 * - `false`, `null` e `undefined` removem o atributo; `true` vira atributo vazio.
 */
export function h(tag, atributos = {}, ...filhos) {
  const el = document.createElement(tag);
  for (const [nome, valor] of Object.entries(atributos ?? {})) {
    if (valor === false || valor === null || valor === undefined) continue;
    if (nome.startsWith('on') && typeof valor === 'function') el.addEventListener(nome.slice(2), valor);
    else if (nome === 'class') el.className = valor;
    else if (nome === 'value') el.value = valor;
    else if (nome === 'checked') el.checked = !!valor;
    else if (nome === 'selected') el.selected = !!valor;
    else el.setAttribute(nome, valor === true ? '' : String(valor));
  }
  anexar(el, filhos);
  return el;
}

function anexar(el, filhos) {
  for (const f of filhos.flat(Infinity)) {
    if (f === null || f === undefined || f === false) continue;
    el.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
}

/** Cria SVG a partir de uma string fixa do próprio código (nunca de texto do usuário). */
export function svg(marcacao) {
  const t = document.createElement('template');
  t.innerHTML = marcacao.trim();
  return t.content.firstElementChild;
}

/** Gera um id único para ligar label/campo e aria-describedby. */
let contador = 0;
export function novoId(prefixo = 'id') { contador++; return `${prefixo}-${contador}`; }
