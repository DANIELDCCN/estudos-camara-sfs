// Janela (diálogo) para criar ou editar um flashcard.
import { h, novoId } from './dom.js';
import { abrirDialogo, anunciar } from './a11y.js';
import { seletorTopicos } from './seletores.js';
import { salvarCartao } from '../dados/repositorio.js';

/**
 * Abre o diálogo. Resolve com o cartão salvo, ou null se cancelar.
 * @param {{cartao?: any, topicoId?: string, verso?: string, aviso?: string}} p
 */
export function abrirDialogoCartao({ cartao, topicoId, verso = '', aviso } = {}) {
  return new Promise((resolver) => {
    const editar = !!cartao;
    const ids = { titulo: novoId('dc-titulo'), topico: novoId('dc-topico'), frente: novoId('dc-frente'), verso: novoId('dc-verso'),
      expl: novoId('dc-expl'), erro: novoId('dc-erro'), ajudaFrente: novoId('dc-ajuda') };
    const nomeTipo = novoId('dc-tipo');
    const nomeResp = novoId('dc-resp');
    let tipo = cartao?.tipo ?? 'frente-verso';
    let salvo = null;

    const topico = seletorTopicos({ id: ids.topico, valor: cartao?.topicoId ?? topicoId ?? '', opcaoVazia: 'Escolha o tópico' });
    const frente = h('textarea', { id: ids.frente, rows: 3, 'aria-describedby': ids.ajudaFrente }, cartao?.frente ?? '');
    const ajudaFrente = h('p', { id: ids.ajudaFrente, class: 'nota' });
    const versoCampo = h('textarea', { id: ids.verso, rows: 3 }, tipo === 'frente-verso' ? (cartao?.verso ?? verso) : verso);
    const blocoVerso = h('div', { class: 'campo' }, h('label', { for: ids.verso }, 'Verso (resposta)'), versoCampo);
    const blocoResposta = h('fieldset', {},
      h('legend', {}, 'A afirmação está'),
      ['Certo', 'Errado'].map((v) => h('label', { class: 'opcao' },
        h('input', { type: 'radio', name: nomeResp, value: v, checked: (cartao?.tipo === 'certo-errado' ? cartao.verso : 'Certo') === v }), ` ${v}`)));
    const explicacao = h('textarea', { id: ids.expl, rows: 2 }, cartao?.explicacao ?? '');
    const erro = h('p', { id: ids.erro, class: 'erro', role: 'alert', hidden: true });

    function mostrarTipo() {
      blocoVerso.hidden = tipo !== 'frente-verso';
      blocoResposta.hidden = tipo !== 'certo-errado';
      ajudaFrente.textContent = tipo === 'frente-verso'
        ? 'A pergunta ou o enunciado que você vai ver primeiro.'
        : 'Escreva uma afirmação. Na revisão, você decide se ela está certa ou errada.';
    }

    const limparErros = () => {
      erro.hidden = true;
      for (const c of [topico, frente, versoCampo]) { c.removeAttribute('aria-invalid'); }
      frente.setAttribute('aria-describedby', ids.ajudaFrente);
      topico.removeAttribute('aria-describedby');
      versoCampo.removeAttribute('aria-describedby');
    };
    const falhar = (campo, msg) => {
      erro.textContent = `Erro: ${msg}`;
      erro.hidden = false;
      campo.setAttribute('aria-invalid', 'true');
      campo.setAttribute('aria-describedby', campo === frente ? `${ids.ajudaFrente} ${ids.erro}` : ids.erro);
      campo.focus();
    };

    const form = h('form', { onsubmit: async (e) => {
      e.preventDefault();
      limparErros();
      if (!topico.value) return falhar(topico, 'escolha o tópico do cartão.');
      if (!frente.value.trim()) return falhar(frente, 'a frente não pode ficar vazia.');
      const versoFinal = tipo === 'frente-verso' ? versoCampo.value.trim() : form.querySelector(`input[name="${nomeResp}"]:checked`).value;
      if (!versoFinal) return falhar(versoCampo, 'o verso não pode ficar vazio.');
      salvo = await salvarCartao({
        ...(editar ? { id: cartao.id } : {}),
        topicoId: topico.value, tipo, frente: frente.value.trim(), verso: versoFinal, explicacao: explicacao.value.trim(),
      });
      anunciar(editar ? `Cartão de ${salvo.topicoId} salvo.` : `Cartão criado em ${salvo.topicoId}. Ele entra na fila de novos.`);
      dlg.close();
    } },
    aviso ? h('p', { class: 'nota' }, aviso) : null,
    h('div', { class: 'campo' }, h('label', { for: ids.topico }, 'Tópico'), topico),
    h('fieldset', {},
      h('legend', {}, 'Tipo de cartão'),
      [['frente-verso', 'Frente e verso'], ['certo-errado', 'Certo ou errado']].map(([v, r]) => h('label', { class: 'opcao' },
        h('input', { type: 'radio', name: nomeTipo, value: v, checked: tipo === v, onchange: () => { tipo = v; mostrarTipo(); } }), ` ${r}`))),
    h('div', { class: 'campo' }, h('label', { for: ids.frente }, 'Frente'), ajudaFrente, frente),
    blocoVerso,
    blocoResposta,
    h('div', { class: 'campo' }, h('label', { for: ids.expl }, 'Explicação ou fonte (opcional)'), explicacao),
    erro,
    h('div', { class: 'linha-botoes' },
      h('button', { type: 'button', class: 'botao', onclick: () => dlg.close() }, 'Cancelar'),
      h('button', { type: 'submit', class: 'botao botao-primario' }, editar ? 'Salvar cartão' : 'Criar cartão')));

    const dlg = h('dialog', { class: 'dialogo', 'aria-labelledby': ids.titulo },
      h('h2', { id: ids.titulo }, editar ? 'Editar cartão' : 'Novo cartão'), form);
    mostrarTipo();
    dlg.addEventListener('close', () => { setTimeout(() => dlg.remove(), 0); resolver(salvo); });
    document.body.append(dlg);
    abrirDialogo(dlg, topico.value ? frente : topico);
  });
}
