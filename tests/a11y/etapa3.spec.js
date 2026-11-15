// Etapa 3: cronograma automático — critério de aceite 5, axe-core, reflow e backup.
// O relógio do navegador é fixado em segunda-feira, 16/11/2026, 9h (Brasília).
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SEGUNDA = new Date('2026-11-16T09:00:00-03:00');

async function abrir(page, rota) {
  await page.goto(`/#/${rota}`);
  await page.waitForSelector('body[data-pronto="sim"]');
  await expect(page.locator('#titulo-tela')).toBeVisible();
}

async function axe(page, contexto) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const resumo = r.violations.map((v) => `${contexto}: ${v.id} – ${v.help} (${v.nodes.length}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  expect(resumo, resumo.join('\n')).toEqual([]);
}

const lerBlocos = (page) => page.evaluate(() => new Promise((ok) => {
  const req = indexedDB.open('estudos-camara-sfs');
  req.onsuccess = () => {
    const r = req.result.transaction('cronogramaBloco', 'readonly').objectStore('cronogramaBloco').getAll();
    r.onsuccess = () => ok(r.result);
  };
}));

async function gerarComPadrao(page) {
  await abrir(page, 'cronograma');
  await expect(page.getByRole('heading', { name: 'Primeiro plano' })).toBeVisible();
  await page.getByRole('button', { name: 'Gerar cronograma' }).click();
  await expect(page.locator('.mensagem-plano')).toContainText('Cronograma replanejado');
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: SEGUNDA });
});

test('gera blocos de hoje até 23/01/2027, com a última semana só de revisão e simulados', async ({ page }) => {
  await gerarComPadrao(page);
  const blocos = await lerBlocos(page);
  const datas = blocos.map((b) => b.data).sort();
  expect(datas[0]).toBe('2026-11-16');
  expect(datas.at(-1)).toBe('2027-01-23');
  const reta = blocos.filter((b) => b.data >= '2027-01-17');
  expect(reta.every((b) => ['revisao', 'revisao-geral', 'simulado'].includes(b.tipo))).toBe(true);
  expect(blocos.filter((b) => b.data < '2027-01-17').some((b) => b.tipo === 'estudo')).toBe(true);

  // Com 2 h por dia o tempo não basta: aviso com a sugestão de horas por semana.
  await expect(page.getByRole('region', { name: 'Avisos do plano' })).toContainText(/não bastam.*horas por semana/);
  // Hoje: segunda, 2 h = flashcards 24 min + estudo 50 + estudo 46.
  await expect(page.getByRole('heading', { name: 'Segunda-feira, 16/11/2026 (hoje)' })).toBeVisible();
  const itens = page.locator('#conteudo ol.lista-topicos > li');
  await expect(itens).toHaveCount(3);
  await expect(itens.nth(0)).toContainText('Revisão de flashcards');
  await expect(itens.nth(1)).toContainText('50 min');
  await expect(itens.nth(2)).toContainText('46 min');
});

test('3 blocos pulados + Replanejar: os tópicos voltam ao plano e o aviso aparece', async ({ page }) => {
  await gerarComPadrao(page);
  const antes = await lerBlocos(page);
  const estudoHoje = antes.filter((b) => b.data === '2026-11-16' && b.tipo === 'estudo').map((b) => b.topicoId);
  for (const n of [1, 2, 3]) {
    await page.getByLabel(`Situação do bloco ${n} de 16/11/2026`).selectOption('pulado');
    await expect(page.locator('#anunciador')).toContainText(`Bloco ${n} marcado como Pulado`);
  }
  await page.getByRole('button', { name: 'Replanejar a partir de hoje' }).click();
  await expect(page.locator('.mensagem-plano')).toContainText('Cronograma replanejado');
  await expect(page.getByRole('region', { name: 'Avisos do plano' })).toContainText('não bastam');

  const depois = await lerBlocos(page);
  const hoje = depois.filter((b) => b.data === '2026-11-16');
  expect(hoje.map((b) => b.situacao)).toEqual(['pulado', 'pulado', 'pulado']); // o horário de hoje já foi usado
  for (const id of estudoHoje) expect(depois.some((b) => b.data > '2026-11-16' && b.topicoId === id)).toBe(true);
  await expect(page.locator('#conteudo ol.lista-topicos > li').first()).toContainText('Pulado');
});

test('marcar feito registra os minutos; parcial e minutos reais editáveis', async ({ page }) => {
  await gerarComPadrao(page);
  await page.getByLabel('Situação do bloco 2 de 16/11/2026').selectOption('feito');
  await expect(page.getByLabel('Minutos reais do bloco 2 de 16/11/2026')).toHaveValue('50');
  await expect(page.locator('#anunciador')).toContainText(/Bloco 2 marcado como Feito\. Se avançou, atualize o status de [A-Z]{3}-\d\d no Edital\./);
  await page.getByLabel('Situação do bloco 3 de 16/11/2026').selectOption('parcial');
  await page.getByLabel('Minutos reais do bloco 3 de 16/11/2026').fill('20');
  await page.getByLabel('Minutos reais do bloco 3 de 16/11/2026').blur();
  await expect(page.locator('#conteudo ol.lista-topicos > li').nth(2)).toContainText('Parcialmente feito · 20 min reais');
  await expect(page.getByText('Planejado: 2 h. Registrado: 1 h 10 min. Blocos feitos: 1 de 3.')).toBeVisible();
  // Painel mostra o dia.
  await abrir(page, 'painel');
  await expect(page.getByRole('region', { name: 'Estudo de hoje' })).toContainText('3 blocos hoje, 1 feito.');
});

test('horas suficientes: sem aviso; folgas ficam vazias; semana e navegação por dia', async ({ page }) => {
  await abrir(page, 'cronograma/ajustes');
  for (const dia of ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo']) {
    await page.getByLabel(dia, { exact: true }).fill('6');
  }
  await page.getByLabel('Nova folga').fill('2026-12-25');
  await page.getByRole('button', { name: 'Adicionar folga' }).click();
  await expect(page.getByRole('button', { name: 'Remover folga de 25/12/2026' })).toBeVisible();
  await page.getByRole('button', { name: 'Gerar cronograma' }).click();
  await expect(page.locator('.mensagem-plano')).toContainText('As horas bastam para cobrir todos os tópicos.');
  await expect(page.getByRole('region', { name: 'Avisos do plano' })).toHaveCount(0);
  const blocos = await lerBlocos(page);
  expect(blocos.some((b) => b.data === '2026-12-25')).toBe(false);

  await page.getByRole('link', { name: 'Próximo dia' }).click();
  await expect(page.getByRole('heading', { name: 'Terça-feira, 17/11/2026' })).toBeVisible();
  await page.getByRole('navigation', { name: 'Visões do cronograma' }).getByRole('link', { name: 'Semana' }).click();
  await expect(page.getByRole('heading', { name: 'Semana de 16/11/2026 a 22/11/2026' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(7);
  await abrir(page, 'cronograma/dia/2026-12-25');
  await expect(page.getByText('Dia de folga (bloqueado nos ajustes).')).toBeVisible();
});

test('ajustes inválidos mostram erro ligado ao campo', async ({ page }) => {
  await abrir(page, 'cronograma/ajustes');
  await page.getByLabel('Sábado', { exact: true }).fill('20');
  await page.getByRole('button', { name: 'Gerar cronograma' }).click();
  await expect(page.getByText('Erro: as horas de sábado devem ficar entre 0 e 16.')).toBeVisible();
  await expect(page.getByLabel('Sábado', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Sábado', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await axe(page, 'ajustes-erro');
});

test('replaneja sozinho quando há blocos atrasados de dias anteriores', async ({ page }) => {
  await gerarComPadrao(page);
  await page.clock.setSystemTime(new Date('2026-11-18T09:00:00-03:00'));
  await page.reload();
  await page.waitForSelector('body[data-pronto="sim"]');
  await abrir(page, 'cronograma');
  await expect(page.locator('.mensagem-plano')).toContainText(/Havia \d+ blocos atrasados: o cronograma foi replanejado sozinho/);
  await expect(page.getByRole('heading', { name: 'Quarta-feira, 18/11/2026 (hoje)' })).toBeVisible();
  // Os atrasados continuam no histórico, marcados como atrasados.
  await abrir(page, 'cronograma/dia/2026-11-16');
  await expect(page.locator('#conteudo ol.lista-topicos > li').first()).toContainText('Pendente (atrasado)');
});

for (const [tema, rotulo] of [['claro', 'Claro'], ['escuro', 'Escuro'], ['alto', 'Alto contraste (fundo preto)']]) {
  test(`axe-core no cronograma – tema ${tema}`, async ({ page }) => {
    await abrir(page, 'config');
    await page.getByRole('radio', { name: rotulo }).check();
    await abrir(page, 'cronograma');
    await axe(page, `${tema}/primeiro-plano`);
    await page.getByRole('button', { name: 'Gerar cronograma' }).click();
    await expect(page.locator('.mensagem-plano')).toBeVisible();
    await page.getByLabel('Situação do bloco 1 de 16/11/2026').selectOption('feito');
    await page.getByLabel('Situação do bloco 2 de 16/11/2026').selectOption('parcial');
    await page.getByLabel('Situação do bloco 3 de 16/11/2026').selectOption('pulado');
    await axe(page, `${tema}/hoje`);
    for (const v of ['semana', 'plano', 'ajustes']) { await abrir(page, `cronograma/${v}`); await axe(page, `${tema}/${v}`); }
    await abrir(page, 'cronograma/dia/2027-01-17');
    await axe(page, `${tema}/reta-final`);
    await abrir(page, 'painel');
    await axe(page, `${tema}/painel`);
  });
}

test('fonte em 200% e 320px: cronograma sem rolagem horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await abrir(page, 'config');
  await page.getByRole('combobox', { name: 'Tamanho da fonte' }).selectOption('2');
  await gerarComPadrao(page);
  for (const v of ['cronograma', 'cronograma/semana', 'cronograma/plano', 'cronograma/ajustes', 'painel']) {
    await abrir(page, v);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), v).toBeLessThanOrEqual(320);
  }
});

test('backup leva o cronograma junto', async ({ page }) => {
  await gerarComPadrao(page);
  await page.getByLabel('Situação do bloco 2 de 16/11/2026').selectOption('feito');
  const antes = await lerBlocos(page);
  await abrir(page, 'config');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar backup (.json)' }).click()]);
  const caminho = await download.path();
  await page.getByRole('button', { name: 'Apagar todos os dados' }).click();
  await Promise.all([page.waitForEvent('load'), page.getByRole('dialog').getByRole('button', { name: 'Apagar tudo' }).click()]);
  await page.waitForSelector('body[data-pronto="sim"]');
  expect(await lerBlocos(page)).toEqual([]);
  await abrir(page, 'config');
  await page.getByLabel('Arquivo de backup (.json)').setInputFiles(caminho);
  await page.getByRole('radio', { name: /^Substituir/ }).check();
  await page.getByRole('button', { name: 'Importar backup' }).click();
  await Promise.all([page.waitForEvent('load'), page.getByRole('dialog').getByRole('button', { name: 'Substituir' }).click()]);
  await page.waitForSelector('body[data-pronto="sim"]');
  const depois = await lerBlocos(page);
  expect(depois.length).toBe(antes.length);
  expect(depois.filter((b) => b.situacao === 'feito')).toHaveLength(1);
  await abrir(page, 'cronograma/plano');
  await expect(page.getByRole('region', { name: 'Resumo do plano' })).toContainText('Gerado em');
});
