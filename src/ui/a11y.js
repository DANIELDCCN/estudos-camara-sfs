// Recursos de acessibilidade compartilhados: avisos ao leitor de tela, diálogos e atalhos.
import { h } from './dom.js';

// ---------- Avisos (aria-live="polite") ----------
// Fila: dois avisos seguidos não se apagam; cada um fica pelo menos 1,5 s na região.
let limpeza;
let livreEm = 0;
/** Anuncia uma mensagem ao leitor de tela sem mover o foco. */
export function anunciar(texto) {
  const regiao = document.getElementById('anunciador');
  if (!regiao) return;
  const agora = Date.now();
  const espera = Math.max(0, livreEm - agora);
  livreEm = agora + espera + 1500;
  setTimeout(() => {
    // Limpar e escrever em seguida faz o leitor repetir mensagens iguais.
    regiao.textContent = '';
    clearTimeout(limpeza);
    setTimeout(() => { regiao.textContent = texto; }, 50);
    limpeza = setTimeout(() => { regiao.textContent = ''; }, 8000);
  }, espera);
}

// ---------- Diálogos ----------
/**
 * Abre um <dialog> modal e devolve o foco ao elemento de origem quando fechar.
 * O <dialog> nativo já prende o foco dentro dele e fecha com Esc.
 */
export function abrirDialogo(dialogo, focoInicial) {
  const origem = document.activeElement;
  dialogo.addEventListener('close', () => {
    if (origem && document.contains(origem)) origem.focus();
  }, { once: true });
  dialogo.showModal();
  (focoInicial ?? dialogo.querySelector('[autofocus], button, input, select, textarea'))?.focus();
}

/** Pergunta de confirmação acessível. Devolve true se o usuário confirmar. */
export function confirmar({ titulo, texto, rotuloOk = 'Confirmar', perigo = false }) {
  return new Promise((resolver) => {
    const idTitulo = 'conf-titulo';
    const idTexto = 'conf-texto';
    let resposta = false;
    const cancelar = h('button', { type: 'button', class: 'botao', onclick: () => dlg.close() }, 'Cancelar');
    const ok = h('button', {
      type: 'button', class: perigo ? 'botao botao-perigo' : 'botao botao-primario',
      onclick: () => { resposta = true; dlg.close(); },
    }, rotuloOk);
    const dlg = h('dialog', { class: 'dialogo', 'aria-labelledby': idTitulo, 'aria-describedby': idTexto },
      h('h2', { id: idTitulo }, titulo),
      h('p', { id: idTexto }, texto),
      h('div', { class: 'linha-botoes' }, cancelar, ok),
    );
    dlg.addEventListener('close', () => { setTimeout(() => dlg.remove(), 0); resolver(resposta); });
    document.body.append(dlg);
    abrirDialogo(dlg, cancelar); // foco começa em "Cancelar", a opção segura
  });
}

// ---------- Atalhos de teclado ----------
/** O foco está num campo de texto/seleção? Então teclas comuns não viram atalho. */
export function estaDigitando(alvo = document.activeElement) {
  if (!alvo) return false;
  if (alvo.isContentEditable) return true;
  const tag = alvo.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'file'].includes(alvo.type);
  return false;
}

/** Lista exibida na tela de ajuda (tecla ?). Mantida aqui para ficar perto do código. */
export const LISTA_ATALHOS = [
  ['?', 'Abrir esta ajuda'],
  ['g e depois p', 'Ir para o Painel'],
  ['g e depois e', 'Ir para o Edital (checklist)'],
  ['g e depois c', 'Ir para o Cronograma'],
  ['g e depois r', 'Ir para a Revisão'],
  ['g e depois s', 'Ir para os Resumos'],
  ['g e depois o', 'Ir para as Configurações'],
  ['Espaço (na sessão de revisão)', 'Mostrar a resposta do cartão'],
  ['1 a 4 (na sessão, depois da resposta)', 'Avaliar: 1 Errei, 2 Difícil, 3 Bom, 4 Fácil'],
  ['Ctrl+B (no editor de resumo)', 'Negrito'],
  ['Ctrl+Shift+8 (no editor)', 'Lista'],
  ['Ctrl+Shift+2 (no editor)', 'Título'],
  ['Ctrl+S (no editor)', 'Salvar agora (o salvamento já é automático)'],
  ['0 a 4 (com o foco num tópico)', 'Definir o status: 0 Não iniciado, 1 Teoria estudada, 2 Questões resolvidas, 3 Revisado, 4 Dominado'],
  ['Esc', 'Fechar janelas (diálogos)'],
  ['Tab e Shift+Tab', 'Avançar e voltar entre os controles'],
];
