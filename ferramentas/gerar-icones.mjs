// Renderiza os ícones PNG a partir do SVG usando o Chrome (Playwright).
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
const dir = process.argv[2] ?? "public/icons";
const svg = readFileSync(`${dir}/icon.svg`, 'utf8');
const navegador = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const pagina = await navegador.newPage();
async function gerar(tamanho, arquivo, mascaravel) {
  await pagina.setViewportSize({ width: tamanho, height: tamanho });
  const conteudo = mascaravel
    ? `<div style="width:100vw;height:100vh;background:#0b3d91;display:grid;place-items:center"><div style="width:72%;height:72%">${svg.replace('rx="96"', 'rx="0"')}</div></div>`
    : svg;
  await pagina.setContent(`<html><body style="margin:0;background:transparent">${conteudo}</body></html><style>svg{width:100%;height:100%;display:block}</style>`);
  await pagina.screenshot({ path: `${dir}/${arquivo}`, omitBackground: true });
}
await gerar(192, 'icon-192.png');
await gerar(512, 'icon-512.png');
await gerar(512, 'icon-maskable-512.png', true);
await navegador.close();
