// Etapa 2: resumos e flashcards — critérios de aceite 6, 7 e 8, mais axe-core e offline.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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

async function escreverResumo(page, texto) {
  await abrir(page, 'edital');
  await page.getByRole('link', { name: 'Resumo de POR-16' }).click();
  await expect(page.locator('#titulo-tela')).toHaveText('Resumo – POR-16');
  const area = page.getByLabel('Texto do resumo (Markdown)');
  await area.fill(texto);
  await expect(page.getByText(/^Salvo às/)).toBeVisible();
  return area;
}

async function criarCartao(page, { topico = 'POR-16', frente, verso }) {
  await abrir(page, 'edital');
  await page.getByRole('button', { name: `Detalhes de ${topico}` }).click();
  await page.getByRole('button', { name: `Novo cartão em ${topico}` }).click();
  const dlg = page.getByRole('dialog', { name: 'Novo cartão' });
  await expect(dlg.getByLabel('Tópico')).toHaveValue(topico);
  await expect(dlg.getByLabel('Frente', { exact: true })).toBeFocused();
  await dlg.getByLabel('Frente', { exact: true }).fill(frente);
  await dlg.getByLabel('Verso (resposta)').fill(verso);
  await dlg.getByRole('button', { name: 'Criar cartão' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('#anunciador')).toContainText(`Cartão criado em ${topico}`);
}

test('resumo: escreve em Markdown, salva sozinho, liga ao tópico e a busca encontra', async ({ page }) => {
  await escreverResumo(page, 'Crase é a fusão de ==a + a==.\n\n- antes de palavra feminina\n- nunca antes de verbo');
  await expect(page).toHaveURL(/#\/resumos\/resumo-/);
  await page.reload();
  await page.waitForSelector('body[data-pronto="sim"]');
  await expect(page.getByLabel('Texto do resumo (Markdown)')).toHaveValue(/nunca antes de verbo/);
  await expect(page.locator('p', { hasText: 'Tópico:' })).toContainText('POR-16 Crase (emprego do acento grave)');

  // Pré-visualização: destaque com aviso ao leitor de tela e lista de verdade.
  await page.getByRole('button', { name: 'Mostrar pré-visualização' }).click();
  const previa = page.getByRole('region', { name: 'Pré-visualização' });
  await expect(previa.locator('mark.destaque')).toHaveText('Destaque: a + a (fim do destaque)');
  await expect(previa.getByRole('listitem')).toHaveCount(2);

  // Busca em todos os resumos (sem acento e sem caixa).
  await abrir(page, 'resumos');
  await page.getByLabel('Palavra ou trecho (em todos os resumos)').fill('FEMININA');
  await expect(page.locator('.contagem-topicos')).toHaveText('1 resumo encontrado para "FEMININA".');
  await expect(page.locator('mark.achado')).toContainText('feminina');
  await page.getByLabel('Palavra ou trecho (em todos os resumos)').fill('subjuntivo');
  await expect(page.locator('.contagem-topicos')).toHaveText('0 resumos encontrados para "subjuntivo".');

  // Do resumo de volta ao tópico, com o foco no tópico.
  await page.getByLabel('Palavra ou trecho (em todos os resumos)').fill(''); // a busca fica guardada ao voltar
  await page.getByRole('link', { name: /Resumo – Crase/ }).click();
  await page.getByRole('link', { name: 'Ver este tópico no Edital' }).click();
  await expect(page.locator('#tt-POR-16')).toBeFocused();
});

test('editor: atalhos de formatação e Tab não prende o foco', async ({ page }) => {
  const area = await escreverResumo(page, 'palavra');
  await area.evaluate((el) => el.setSelectionRange(0, 7));
  await page.keyboard.press('Control+b');
  await expect(area).toHaveValue('**palavra**');
  await page.keyboard.press('Control+Shift+Digit8');
  await expect(area).toHaveValue('- **palavra**');
  await page.keyboard.press('Control+Shift+Digit2');
  await expect(area).toHaveValue('## **palavra**');
  await page.keyboard.press('Tab');
  await expect(area).not.toBeFocused();
});

test('markdown perigoso não executa nem carrega nada de fora', async ({ page, baseURL }) => {
  const externas = [];
  page.on('request', (r) => { if (!r.url().startsWith(baseURL) && !/^(blob|data):/.test(r.url())) externas.push(r.url()); });
  page.on('dialog', () => { throw new Error('alert executado'); });
  await escreverResumo(page, '<script>alert(1)</script>\n<img src="http://exemplo.invalid/x.png" onerror="alert(2)">\n\n![foto](http://exemplo.invalid/y.png)\n[link](http://exemplo.invalid)');
  await page.getByRole('button', { name: 'Mostrar pré-visualização' }).click();
  const previa = page.locator('.previa-markdown');
  await expect(previa.locator('img, script')).toHaveCount(0);
  await expect(previa).toContainText('[imagem não exibida: foto]');
  await expect(previa.getByRole('link', { name: 'link' })).toHaveAttribute('target', '_blank');
  expect(externas).toEqual([]);
});

test('flashcard: cria no tópico, revisa só pelo teclado e mostra a próxima revisão', async ({ page }) => {
  await criarCartao(page, { frente: 'O que é crase?', verso: 'Fusão da preposição a com o artigo a.' });
  await abrir(page, 'revisao');
  await expect(page.locator('.destaque-numero').first()).toHaveText('Para revisar agora: 0 cartões vencidos e 1 novo.');
  await page.getByRole('link', { name: /Começar revisão/ }).click();

  const frente = page.getByRole('region', { name: 'Frente' });
  await expect(frente).toBeFocused();
  await expect(frente).toContainText('O que é crase?');
  await page.keyboard.press('Space');
  const resposta = page.getByRole('region', { name: 'Resposta' });
  await expect(resposta).toBeFocused();
  await expect(resposta).toContainText('Fusão da preposição');
  await expect(page.getByRole('button', { name: /3 Bom – volta em 10 minutos/ })).toBeVisible();
  await page.keyboard.press('3');

  // "Bom" num cartão novo volta em 10 minutos: o cartão reaparece no fim da fila.
  await expect(page.getByRole('region', { name: 'Frente' })).toBeFocused();
  await expect(page.locator('.resultado-anterior')).toHaveText(/^Anterior: Bom\. Próxima revisão em 10 minutos \(hoje às \d\d:\d\d\)\.$/);
  await page.keyboard.press('Space');
  await page.keyboard.press('4');
  await expect(page.getByRole('region', { name: 'Fim da sessão' })).toBeFocused();
  await expect(page.getByRole('region', { name: 'Fim da sessão' })).toContainText(/Anterior: Fácil\. Próxima revisão em \d+ dias/);
  await expect(page.getByRole('region', { name: 'Fim da sessão' })).toContainText('2 revisões, 2 acertos (100%)');

  await abrir(page, 'revisao/cartoes/POR-16');
  await expect(page.locator('.lista-topicos')).toContainText(/Próxima revisão: .*, \d\d\/\d\d\/\d{4}\. Revisões feitas: 2\./);
  await abrir(page, 'revisao');
  await expect(page.getByText('Cartões revisados hoje: 2.')).toBeVisible();
});

test('fila do dia respeita o limite de novos; importação em lote aponta erros', async ({ page }) => {
  await abrir(page, 'config');
  await page.getByLabel('Cartões novos por dia (máximo)').fill('2');
  await page.getByLabel('Cartões novos por dia (máximo)').blur();
  await abrir(page, 'painel');
  await abrir(page, 'config');
  await expect(page.getByLabel('Cartões novos por dia (máximo)')).toHaveValue('2');

  await abrir(page, 'revisao/cartoes');
  await page.getByLabel('Cole as linhas aqui').fill([
    'frente;verso;codigo',
    'P1;R1;POR-01', 'P2;R2;POR-02', '"Afirmação; com ponto e vírgula";Certo;LEG-01;Art. 1º', 'P4;R4;ETI-04', 'P5;R5;ETI-05',
    'ruim;sem codigo;',
  ].join('\n'));
  await page.getByRole('button', { name: 'Importar cartões' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'importados' })).toHaveText('5 cartões importados; 1 linha com erro.');
  await expect(page.getByText('Linha 7: falta o código do tópico (ex.: POR-16).')).toBeVisible();
  await expect(page.locator('.contagem-topicos')).toHaveText('5 cartões exibidos.');

  await abrir(page, 'revisao');
  await expect(page.locator('.destaque-numero').first()).toHaveText('Para revisar agora: 0 cartões vencidos e 2 novos.');
  await expect(page.getByText(/3 cartões novos ficaram para os próximos dias/)).toBeVisible();
  // Filtro por cargo: só Analista de TI → os novos de ETI entram primeiro? Não: a ordem é a de criação, dentro do filtro.
  await page.getByRole('radio', { name: 'Analista de Tecnologia da Informação' }).check();
  await expect(page.locator('.destaque-numero').first()).toHaveText('Para revisar agora: 0 cartões vencidos e 2 novos.');
  await page.getByLabel('Disciplina').selectOption('LEG');
  await expect(page.locator('.destaque-numero').first()).toHaveText('Para revisar agora: 0 cartões vencidos e 1 novo.');

  // O cartão "certo ou errado" mostra a resposta por extenso.
  await page.getByRole('link', { name: /Começar revisão/ }).click();
  await expect(page.getByRole('region', { name: 'Frente: certo ou errado?' })).toContainText('Afirmação; com ponto e vírgula');
  await page.keyboard.press('Space');
  await expect(page.getByRole('region', { name: 'Resposta' })).toContainText('A afirmação está CERTO.');
  await expect(page.getByRole('region', { name: 'Resposta' })).toContainText('Art. 1º');
});

test('cartão a partir de um trecho selecionado do resumo', async ({ page }) => {
  const area = await escreverResumo(page, 'A crase indica a fusão de duas vogais iguais.');
  await page.getByRole('button', { name: 'Criar cartão do trecho selecionado' }).click();
  await expect(page.getByText(/Erro: selecione um trecho/)).toBeVisible();
  await expect(area).toBeFocused();
  await area.evaluate((el) => { const i = el.value.indexOf('a fusão'); el.setSelectionRange(i, el.value.length); el.dispatchEvent(new Event('select')); });
  await page.getByRole('button', { name: 'Criar cartão do trecho selecionado' }).click();
  const dlg = page.getByRole('dialog', { name: 'Novo cartão' });
  await expect(dlg.getByLabel('Verso (resposta)')).toHaveValue('a fusão de duas vogais iguais.');
  await expect(dlg.getByLabel('Frente', { exact: true })).toBeFocused();
  await dlg.getByRole('button', { name: 'Criar cartão' }).click();
  await expect(dlg.getByText('Erro: a frente não pode ficar vazia.')).toBeVisible();
  await expect(dlg.getByLabel('Frente', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Criar cartão do trecho selecionado' })).toBeFocused();
});

for (const [tema, rotulo] of [['claro', 'Claro'], ['escuro', 'Escuro'], ['alto', 'Alto contraste (fundo preto)']]) {
  test(`axe-core nas telas da Etapa 2 – tema ${tema}`, async ({ page }) => {
    await abrir(page, 'config');
    await page.getByRole('radio', { name: rotulo }).check();
    await escreverResumo(page, '# Título\n\nTexto com **negrito** e ==destaque==.\n\n- item');
    await page.getByRole('button', { name: 'Mostrar pré-visualização' }).click();
    await axe(page, `${tema}/editor`);
    await page.getByRole('button', { name: 'Criar cartão do trecho selecionado' }).click();
    await axe(page, `${tema}/editor-erro`);

    await abrir(page, 'resumos');
    await page.getByLabel('Palavra ou trecho (em todos os resumos)').fill('negrito');
    await expect(page.locator('mark.achado')).toBeVisible();
    await axe(page, `${tema}/resumos`);

    await criarCartao(page, { frente: 'Pergunta', verso: 'Resposta **forte**' });
    await abrir(page, 'revisao');
    await axe(page, `${tema}/revisao`);
    await page.getByRole('button', { name: 'Criar cartão' }).click();
    await axe(page, `${tema}/dialogo-cartao`);
    await page.keyboard.press('Escape');

    await page.getByRole('link', { name: /Começar revisão/ }).click();
    await expect(page.getByRole('region', { name: 'Frente' })).toBeFocused();
    await axe(page, `${tema}/sessao-frente`);
    await page.keyboard.press('Space');
    await axe(page, `${tema}/sessao-resposta`);

    await abrir(page, 'revisao/cartoes');
    await axe(page, `${tema}/cartoes`);
    await abrir(page, 'painel');
    await axe(page, `${tema}/painel`);
  });
}

test('fonte em 200% e 320px: telas da Etapa 2 sem rolagem horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await abrir(page, 'config');
  await page.getByRole('combobox', { name: 'Tamanho da fonte' }).selectOption('2');
  await criarCartao(page, { frente: 'Pergunta longa sobre administração pública municipal', verso: 'Resposta' });
  await escreverResumo(page, '# Título\n\n==destaque== texto');
  await page.getByRole('button', { name: 'Mostrar pré-visualização' }).click();
  const largura = async (onde) => expect(await page.evaluate(() => document.documentElement.scrollWidth), onde).toBeLessThanOrEqual(320);
  await largura('editor');
  for (const rota of ['resumos', 'revisao', 'revisao/cartoes']) { await abrir(page, rota); await largura(rota); }
  await abrir(page, 'revisao/sessao');
  await page.keyboard.press('Space');
  await largura('sessao');
});

test('offline: edita resumo e revisa cartão em modo avião', async ({ page, context }) => {
  await abrir(page, 'painel');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForSelector('body[data-pronto="sim"]');
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);

  await escreverResumo(page, 'escrito sem internet');
  await criarCartao(page, { frente: 'Offline?', verso: 'Sim' });
  await abrir(page, 'revisao/sessao');
  await page.keyboard.press('Space');
  await page.keyboard.press('4');
  await expect(page.getByRole('region', { name: 'Fim da sessão' })).toBeVisible();
  await page.reload();
  await page.waitForSelector('body[data-pronto="sim"]');
  await abrir(page, 'resumos');
  await expect(page.getByRole('link', { name: /Resumo – Crase/ })).toBeVisible();
  await context.setOffline(false);
});

test('backup restaura resumos, cartões e histórico; mesclar não duplica', async ({ page }) => {
  await escreverResumo(page, 'resumo para o backup');
  await criarCartao(page, { frente: 'Backup?', verso: 'Sim' });
  await abrir(page, 'revisao/sessao');
  await page.keyboard.press('Space');
  await page.keyboard.press('4');
  await expect(page.getByRole('region', { name: 'Fim da sessão' })).toBeVisible();

  await abrir(page, 'config');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar backup (.json)' }).click()]);
  const caminho = await download.path();
  await page.getByRole('button', { name: 'Apagar todos os dados' }).click();
  await Promise.all([page.waitForEvent('load'), page.getByRole('dialog').getByRole('button', { name: 'Apagar tudo' }).click()]);
  await page.waitForSelector('body[data-pronto="sim"]');
  await abrir(page, 'resumos');
  await expect(page.locator('.contagem-topicos')).toHaveText('0 resumos no total.');

  await abrir(page, 'config');
  await page.getByLabel('Arquivo de backup (.json)').setInputFiles(caminho);
  await page.getByRole('radio', { name: /^Substituir/ }).check();
  await page.getByRole('button', { name: 'Importar backup' }).click();
  await Promise.all([page.waitForEvent('load'), page.getByRole('dialog').getByRole('button', { name: 'Substituir' }).click()]);
  await page.waitForSelector('body[data-pronto="sim"]');

  await abrir(page, 'resumos');
  await expect(page.locator('.contagem-topicos')).toHaveText('1 resumo no total.');
  await abrir(page, 'revisao/cartoes');
  await expect(page.locator('.lista-topicos')).toContainText('Revisões feitas: 1.');
  await expect(page.locator('.lista-topicos')).toContainText('Próxima revisão:');

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
      const tx = req.result.transaction(['resumo', 'flashcard', 'revisaoLog'], 'readonly');
      const r = ['resumo', 'flashcard', 'revisaoLog'].map((s) => tx.objectStore(s).count());
      tx.oncomplete = () => ok(r.map((x) => x.result));
    };
  }));
  expect(contagem).toEqual([1, 1, 1]);
});
