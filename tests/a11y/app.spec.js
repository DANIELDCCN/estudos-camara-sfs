// Critérios de aceite da Etapa 1 e verificação automática de acessibilidade (axe-core).
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROTAS = ['painel', 'edital', 'cronograma', 'revisao', 'resumos', 'config'];

async function abrir(page, rota = 'painel') {
  await page.goto(`/#/${rota}`);
  await page.waitForSelector('body[data-pronto="sim"]');
  await expect(page.locator('#titulo-tela')).toBeVisible();
}

async function axe(page, contexto) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const resumo = r.violations.map((v) => `${contexto}: ${v.id} – ${v.help} (${v.nodes.length}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  expect(resumo, resumo.join('\n')).toEqual([]);
}

async function escolherTema(page, rotulo) {
  await abrir(page, 'config');
  await page.getByRole('radio', { name: rotulo }).check();
}

test('carrega os 84 tópicos e as visões de cada cargo (52 e 68)', async ({ page }) => {
  await abrir(page, 'edital');
  await expect(page.locator('.contagem-topicos')).toHaveText('84 tópicos exibidos.');
  await page.getByRole('radio', { name: 'Assistente Administrativo' }).check();
  await expect(page.locator('.contagem-topicos')).toHaveText('52 tópicos exibidos.');
  await page.getByRole('radio', { name: 'Analista de Tecnologia da Informação' }).check();
  await expect(page.locator('.contagem-topicos')).toHaveText('68 tópicos exibidos.');
  // A visão fica salva.
  await page.reload();
  await page.waitForSelector('body[data-pronto="sim"]');
  await expect(page.locator('.contagem-topicos')).toHaveText('68 tópicos exibidos.');
});

test('POR-16 "Revisado" conta nos dois cargos e uma vez no geral', async ({ page }) => {
  await abrir(page, 'edital');
  await page.getByLabel('Status de POR-16').selectOption('revisado');
  const barra = (nome) => page.getByRole('progressbar', { name: nome, exact: true });
  await expect(barra('Língua Portuguesa – Assistente Administrativo')).toHaveAttribute('aria-valuetext', /^1 de 20 tópicos concluídos, 5%/);
  await expect(barra('Língua Portuguesa – Analista de TI')).toHaveAttribute('aria-valuetext', /^1 de 27 tópicos concluídos, 3,7%/);
  await expect(barra('Geral (sem contar em dobro)')).toHaveAttribute('aria-valuetext', /^1 de 84 tópicos concluídos, 1,2%\. Ponderado pelo peso na prova: 0,6%/);
  await expect(page.locator('#anunciador')).toContainText('POR-16 marcado como Revisado');
});

test('teclas 0 a 4 definem o status com o foco no tópico', async ({ page }) => {
  await abrir(page, 'edital');
  await page.getByRole('button', { name: /Próximo: Teoria estudada \(POR-01\)/ }).focus();
  await page.keyboard.press('4');
  await expect(page.getByLabel('Status de POR-01')).toHaveValue('dominado');
  await page.keyboard.press('0');
  await expect(page.getByLabel('Status de POR-01')).toHaveValue('nao-iniciado');
});

test('primeiro Tab vai para "Pular para o conteúdo" e ? abre a ajuda', async ({ page }) => {
  await abrir(page);
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveText('Pular para o conteúdo');
  await page.keyboard.press('Enter');
  await expect(page.locator('#titulo-tela')).toBeFocused();
  await page.keyboard.press('?');
  await expect(page.getByRole('dialog', { name: 'Ajuda e atalhos de teclado' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.keyboard.press('g');
  await page.keyboard.press('e');
  await expect(page).toHaveURL(/#\/edital$/);
  await expect(page.locator('#titulo-tela')).toBeFocused();
});

for (const [tema, rotulo] of [['claro', 'Claro'], ['escuro', 'Escuro'], ['alto', 'Alto contraste (fundo preto)']]) {
  test(`axe-core sem violações A/AA – tema ${tema}`, async ({ page }) => {
    await escolherTema(page, rotulo);
    for (const rota of ROTAS) {
      await abrir(page, rota);
      if (rota === 'edital') {
        await page.getByRole('button', { name: 'Detalhes de LEG-01' }).click();
        await page.locator('details.texto-oficial').first().evaluate((d) => { d.open = true; });
      }
      await axe(page, `${tema}/${rota}`);
    }
    await page.keyboard.press('?');
    await axe(page, `${tema}/ajuda`);
  });
}

test('fonte em 200% e tela de 320px não criam rolagem horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await abrir(page, 'config');
  await page.getByRole('combobox', { name: 'Tamanho da fonte' }).selectOption('2');
  for (const rota of ROTAS) {
    await abrir(page, rota);
    if (rota === 'edital') await page.getByRole('button', { name: 'Detalhes de LEG-01' }).click();
    const largura = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(largura, `rolagem horizontal em ${rota}`).toBeLessThanOrEqual(320);
  }
});

test('nenhuma requisição sai do app', async ({ page, baseURL }) => {
  const externas = [];
  page.on('request', (r) => { if (!r.url().startsWith(baseURL) && !r.url().startsWith('blob:') && !r.url().startsWith('data:')) externas.push(r.url()); });
  for (const rota of ROTAS) await abrir(page, rota);
  expect(externas).toEqual([]);
});

test('funciona offline depois da primeira visita', async ({ page, context }) => {
  await abrir(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForSelector('body[data-pronto="sim"]');
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await abrir(page, 'edital');
  await page.getByLabel('Status de POR-02').selectOption('teoria');
  await expect(page.locator('#anunciador')).toContainText('POR-02 marcado como Teoria estudada');
  await page.reload();
  await page.waitForSelector('body[data-pronto="sim"]');
  await expect(page.getByLabel('Status de POR-02')).toHaveValue('teoria');
  await context.setOffline(false);
});

test('backup: exportar, apagar e importar restaura tudo; mesclar não duplica', async ({ page }) => {
  await abrir(page, 'edital');
  await page.getByLabel('Status de POR-16').selectOption('revisado');
  await page.getByLabel('Status de ETI-04').selectOption('dominado');
  await page.getByRole('button', { name: 'Detalhes de ETI-04' }).click();
  await page.getByLabel('Nota curta sobre ETI-04').fill('sub-redes /24');
  await page.getByLabel('Nota curta sobre ETI-04').blur();

  await abrir(page, 'config');
  await page.getByRole('radio', { name: 'Escuro' }).check();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar backup (.json)' }).click()]);
  const caminho = await download.path();

  await page.getByRole('button', { name: 'Apagar todos os dados' }).click();
  await Promise.all([page.waitForEvent('load'), page.getByRole('dialog').getByRole('button', { name: 'Apagar tudo' }).click()]);
  await page.waitForSelector('body[data-pronto="sim"]');
  await abrir(page, 'edital');
  await expect(page.getByLabel('Status de POR-16')).toHaveValue('nao-iniciado');

  await abrir(page, 'config');
  await page.getByLabel('Arquivo de backup (.json)').setInputFiles(caminho);
  await page.getByRole('radio', { name: /^Substituir/ }).check();
  await page.getByRole('button', { name: 'Importar backup' }).click();
  await Promise.all([page.waitForEvent('load'), page.getByRole('dialog').getByRole('button', { name: 'Substituir' }).click()]);
  await page.waitForSelector('body[data-pronto="sim"]');

  await abrir(page, 'edital');
  await expect(page.getByLabel('Status de POR-16')).toHaveValue('revisado');
  await expect(page.getByLabel('Status de ETI-04')).toHaveValue('dominado');
  await page.getByRole('button', { name: 'Detalhes de ETI-04' }).click();
  await expect(page.getByLabel('Nota curta sobre ETI-04')).toHaveValue('sub-redes /24');
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'escuro');

  // Mesclar o mesmo arquivo: nada novo, nada duplicado.
  await abrir(page, 'config');
  await page.getByLabel('Arquivo de backup (.json)').setInputFiles(caminho);
  const recarregou = page.waitForEvent('load');
  await page.getByRole('button', { name: 'Importar backup' }).click();
  await expect(page.locator('#anunciador')).toContainText('0 novos');
  await recarregou;
  await page.waitForSelector('body[data-pronto="sim"]');
  const contagem = await page.evaluate(() => new Promise((ok) => {
    const req = indexedDB.open('estudos-camara-sfs');
    req.onsuccess = () => {
      const tx = req.result.transaction(['topico', 'progresso'], 'readonly');
      const a = tx.objectStore('topico').count();
      const b = tx.objectStore('progresso').count();
      tx.oncomplete = () => ok([a.result, b.result]);
    };
  }));
  expect(contagem).toEqual([84, 2]);
});
