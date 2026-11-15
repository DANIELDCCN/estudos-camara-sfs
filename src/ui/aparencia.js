// Tema, tamanho da fonte e espaçamento. Uma cópia fica no localStorage
// para o index.html aplicar antes de desenhar a página (evita "piscar").

export const ESCALAS = [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2];

export function aplicarAparencia({ tema, escalaFonte, espacamento }) {
  const raiz = document.documentElement;
  if (tema && tema !== 'auto') raiz.dataset.tema = tema; else delete raiz.dataset.tema;
  raiz.style.setProperty('--escala', String(escalaFonte ?? 1));
  raiz.classList.toggle('espacamento-amplo', !!espacamento);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(raiz).getPropertyValue('--fundo').trim() || '#ffffff';
  try {
    localStorage.setItem('ecsfs-aparencia', JSON.stringify({ tema, escalaFonte, espacamento }));
  } catch { /* navegação privada sem armazenamento: ignora */ }
}

/** Próxima escala para A− (passo −1) ou A+ (passo +1). */
export function proximaEscala(atual, passo) {
  const i = ESCALAS.findIndex((v) => Math.abs(v - atual) < 0.001);
  const j = Math.min(ESCALAS.length - 1, Math.max(0, (i < 0 ? 0 : i) + passo));
  return ESCALAS[j];
}
