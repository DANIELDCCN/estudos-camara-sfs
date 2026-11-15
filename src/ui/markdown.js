// Markdown → HTML seguro (marked + DOMPurify), com as regras do app:
// - "# Título" vira h3 (a página já tem h1 e a pré-visualização tem h2): ordem de títulos correta;
// - ==texto== vira destaque: cor + sublinhado + aviso "destaque" para o leitor de tela;
// - imagens não são carregadas (o app não faz requisições de rede); aparece só o texto alternativo;
// - links externos abrem em nova aba.
import { Marked } from 'marked';
import DOMPurify from 'dompurify';

const escapar = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const marcador = new Marked({ gfm: true, breaks: true });
marcador.use({
  renderer: {
    heading({ tokens, depth }) {
      const n = Math.min(6, depth + 2);
      return `<h${n}>${this.parser.parseInline(tokens)}</h${n}>\n`;
    },
    image({ text }) {
      return `<span class="imagem-omitida">[imagem não exibida${text ? `: ${escapar(text)}` : ''}]</span>`;
    },
  },
  extensions: [{
    name: 'destaque',
    level: 'inline',
    start(src) { const i = src.indexOf('=='); return i < 0 ? undefined : i; },
    tokenizer(src) {
      const m = /^==(?=\S)([\s\S]*?\S)==/.exec(src);
      if (m) return { type: 'destaque', raw: m[0], tokens: this.lexer.inlineTokens(m[1]) };
      return undefined;
    },
    renderer(token) {
      return `<mark class="destaque"><span class="sr-only">Destaque: </span>${this.parser.parseInline(token.tokens)}<span class="sr-only"> (fim do destaque)</span></mark>`;
    },
  }],
});

DOMPurify.addHook('afterSanitizeAttributes', (no) => {
  if (no.tagName === 'A' && /^https?:/i.test(no.getAttribute('href') ?? '')) {
    no.setAttribute('target', '_blank');
    no.setAttribute('rel', 'noopener noreferrer');
  }
});

const OPCOES = {
  RETURN_DOM_FRAGMENT: true,
  FORBID_TAGS: ['img', 'picture', 'source', 'video', 'audio', 'iframe', 'object', 'embed', 'style', 'form', 'input', 'button', 'svg', 'math'],
  FORBID_ATTR: ['style', 'srcset'],
  ADD_ATTR: ['target'],
};

/** Converte Markdown num fragmento de DOM já limpo, pronto para inserir na página. */
export function renderizarMarkdown(md) {
  return DOMPurify.sanitize(marcador.parse(String(md ?? '')), OPCOES);
}
