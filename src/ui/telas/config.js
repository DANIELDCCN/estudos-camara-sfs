// Tela "Configurações": aparência, acessibilidade, pesos, backup e apagar dados.
import { h, novoId } from '../dom.js';
import { secao, tituloTela } from '../componentes.js';
import { anunciar, confirmar } from '../a11y.js';
import { estado, salvarConfig } from '../../dados/repositorio.js';
import { STATUS, PESOS_STATUS_PADRAO } from '../../logica/constantes.js';
import { aplicarAparencia, ESCALAS } from '../aparencia.js';
import { campoLimite } from './revisao.js';
import {
  exportarTudo, arquivoDoBackup, baixarArquivo, podeCompartilharArquivo, compartilharArquivo,
  lerArquivoBackup, importarBackup, apagarTudo,
} from '../../dados/backup-arquivo.js';

export const titulo = 'Configurações';

export function render() {
  const c = estado.config;

  // ---------- Aparência ----------
  const nomeTema = novoId('tema');
  const temas = [['auto', 'Automático (segue o sistema)'], ['claro', 'Claro'], ['escuro', 'Escuro'], ['alto', 'Alto contraste (fundo preto)']];
  const idEscala = novoId('escala');

  const aparencia = secao('Aparência e leitura',
    h('fieldset', {},
      h('legend', {}, 'Tema'),
      temas.map(([v, r]) => h('label', { class: 'opcao' },
        h('input', { type: 'radio', name: nomeTema, value: v, checked: c.tema === v,
          onchange: async () => { await salvarConfig({ tema: v }); aplicarAparencia(estado.config); anunciar(`Tema ${r} aplicado.`); } }),
        ' ', r))),
    h('div', { class: 'campo' },
      h('label', { for: idEscala }, 'Tamanho da fonte'),
      h('select', { id: idEscala, onchange: async (e) => {
        await salvarConfig({ escalaFonte: Number(e.target.value) }); aplicarAparencia(estado.config);
        anunciar(`Fonte em ${Math.round(Number(e.target.value) * 100)}%.`);
      } }, ESCALAS.map((v) => h('option', { value: v, selected: Math.abs(c.escalaFonte - v) < 0.001 }, `${Math.round(v * 100)}%`))),
      h('p', { class: 'nota' }, 'Os botões A− e A+ no topo da página fazem o mesmo.')),
    h('label', { class: 'opcao' },
      h('input', { type: 'checkbox', checked: c.espacamento, onchange: async (e) => {
        await salvarConfig({ espacamento: e.target.checked }); aplicarAparencia(estado.config);
        anunciar(e.target.checked ? 'Espaçamento ampliado ligado.' : 'Espaçamento ampliado desligado.');
      } }),
      ' Espaçamento ampliado entre letras, palavras e linhas'),
  );

  // ---------- Teclado e nome ----------
  const idNome = novoId('nome');
  const teclado = secao('Teclado e identificação',
    h('label', { class: 'opcao' },
      h('input', { type: 'checkbox', checked: c.atalhos, onchange: async (e) => {
        await salvarConfig({ atalhos: e.target.checked });
        anunciar(e.target.checked ? 'Atalhos de uma tecla ligados.' : 'Atalhos de uma tecla desligados.');
      } }),
      ' Atalhos de uma tecla (? e g + letra). Desligue se atrapalharem o leitor de tela.'),
    h('div', { class: 'campo' },
      h('label', { for: idNome }, 'Nome do app'),
      h('input', { id: idNome, type: 'text', value: c.nomeApp, maxlength: 60, onchange: async (e) => {
        const nome = e.target.value.trim() || 'Estudos Câmara SFS';
        await salvarConfig({ nomeApp: nome });
        document.getElementById('nome-app').textContent = nome;
        anunciar('Nome do app salvo.');
      } })),
  );

  // ---------- Pesos ----------
  const idErroPesos = novoId('erro-pesos');
  const erroPesos = h('p', { id: idErroPesos, class: 'erro', hidden: true });
  const entradasPeso = STATUS.map((s) => {
    const id = novoId('peso');
    const entrada = h('input', { id, type: 'number', min: 0, max: 1, step: 0.05, inputmode: 'decimal', value: c.pesosStatus[s.id] });
    entrada.dataset.status = s.id;
    return { s, id, entrada };
  });
  async function salvarPesos() {
    const novos = {};
    let invalido = null;
    for (const { s, entrada } of entradasPeso) {
      const v = Number(String(entrada.value).replace(',', '.'));
      if (!Number.isFinite(v) || v < 0 || v > 1) invalido = entrada;
      else novos[s.id] = v;
    }
    for (const { entrada } of entradasPeso) { entrada.removeAttribute('aria-invalid'); entrada.removeAttribute('aria-describedby'); }
    if (invalido) {
      erroPesos.textContent = 'Erro: cada peso deve ser um número entre 0 e 1.';
      erroPesos.hidden = false;
      invalido.setAttribute('aria-invalid', 'true');
      invalido.setAttribute('aria-describedby', idErroPesos);
      return;
    }
    erroPesos.hidden = true;
    await salvarConfig({ pesosStatus: novos });
    anunciar('Pesos dos status salvos.');
  }
  for (const { entrada } of entradasPeso) entrada.addEventListener('change', salvarPesos);
  const pesos = secao('Pesos dos status no progresso',
    h('p', {}, 'Quanto cada status vale no % ponderado (0 = nada, 1 = tudo).'),
    h('div', { class: 'grade-campos' }, entradasPeso.map(({ s, id, entrada }) => h('div', { class: 'campo' }, h('label', { for: id }, s.rotulo), entrada))),
    erroPesos,
    h('button', { type: 'button', class: 'botao', onclick: async () => {
      for (const { s, entrada } of entradasPeso) entrada.value = PESOS_STATUS_PADRAO[s.id];
      await salvarPesos();
    } }, 'Restaurar pesos padrão'),
  );

  // ---------- Backup ----------
  const ultimo = c.ultimoBackup ? new Date(c.ultimoBackup).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'nunca';
  const textoUltimo = h('p', {}, `Último backup exportado: ${ultimo}.`);
  async function gerarArquivo() {
    const agora = new Date();
    const arquivo = arquivoDoBackup(await exportarTudo(agora));
    await salvarConfig({ ultimoBackup: agora.toISOString() });
    textoUltimo.textContent = `Último backup exportado: ${agora.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.`;
    return arquivo;
  }
  const botaoExportar = h('button', { type: 'button', class: 'botao botao-primario', onclick: async () => {
    baixarArquivo(await gerarArquivo());
    anunciar('Backup exportado. Confira a pasta de downloads.');
  } }, 'Exportar backup (.json)');
  const botaoCompartilhar = podeCompartilharArquivo()
    ? h('button', { type: 'button', class: 'botao', onclick: async () => {
      try { await compartilharArquivo(await gerarArquivo()); anunciar('Backup enviado para compartilhar.'); } catch (e) {
        if (e?.name !== 'AbortError') anunciar('Não foi possível compartilhar. Use "Exportar backup".');
      }
    } }, 'Compartilhar backup (e-mail, Drive, etc.)')
    : null;

  const idArquivo = novoId('arquivo');
  const idErroImp = novoId('erro-imp');
  const nomeModo = novoId('modo');
  const erroImp = h('p', { id: idErroImp, class: 'erro', role: 'alert', hidden: true });
  const entradaArquivo = h('input', { id: idArquivo, type: 'file', accept: '.json,application/json' });
  const formImportar = h('form', { onsubmit: async (e) => {
    e.preventDefault();
    erroImp.hidden = true;
    entradaArquivo.removeAttribute('aria-invalid');
    const arquivo = entradaArquivo.files?.[0];
    const falhar = (msg) => {
      erroImp.textContent = `Erro: ${msg}`; erroImp.hidden = false;
      entradaArquivo.setAttribute('aria-invalid', 'true'); entradaArquivo.setAttribute('aria-describedby', idErroImp);
      entradaArquivo.focus();
    };
    if (!arquivo) return falhar('escolha um arquivo de backup primeiro.');
    let backup;
    try { backup = await lerArquivoBackup(arquivo); } catch (err) { return falhar(err.message); }
    const modo = formImportar.querySelector(`input[name="${nomeModo}"]:checked`).value;
    if (modo === 'substituir') {
      const ok = await confirmar({
        titulo: 'Substituir todos os dados?',
        texto: 'Tudo o que está neste aparelho será trocado pelo conteúdo do backup. Isso não pode ser desfeito.',
        rotuloOk: 'Substituir', perigo: true,
      });
      if (!ok) return;
    }
    const r = await importarBackup(backup, modo);
    const msg = modo === 'substituir'
      ? `Backup importado: ${r.novos} registros restaurados. O app vai recarregar.`
      : `Backup mesclado: ${r.novos} novos, ${r.atualizados} atualizados, ${r.mantidos} mantidos. O app vai recarregar.`;
    anunciar(msg);
    sessionStorage.setItem('ecsfs-aviso', msg);
    setTimeout(() => location.reload(), 1500);
  } },
  h('div', { class: 'campo' }, h('label', { for: idArquivo }, 'Arquivo de backup (.json)'), entradaArquivo),
  erroImp,
  h('fieldset', {},
    h('legend', {}, 'Como importar'),
    h('label', { class: 'opcao' }, h('input', { type: 'radio', name: nomeModo, value: 'mesclar', checked: true }),
      ' Mesclar: junta com o que já existe; em caso de conflito, vence o registro alterado por último'),
    h('label', { class: 'opcao' }, h('input', { type: 'radio', name: nomeModo, value: 'substituir' }),
      ' Substituir: apaga os dados deste aparelho e usa só os do backup')),
  h('button', { type: 'submit', class: 'botao botao-primario' }, 'Importar backup'));

  const backup = secao('Backup e sincronização',
    h('p', {}, 'Seus dados ficam só neste aparelho. Para levar para o celular ou o computador, exporte aqui e importe no outro aparelho.'),
    textoUltimo,
    h('div', { class: 'linha-botoes' }, botaoExportar, botaoCompartilhar),
    h('h3', {}, 'Importar'),
    formImportar,
  );

  // ---------- Apagar ----------
  const perigo = secao('Apagar dados',
    h('p', {}, 'Apaga progresso, notas, resumos, cartões e configurações deste aparelho. Os 84 tópicos do edital voltam ao estado inicial. Faça um backup antes.'),
    h('button', { type: 'button', class: 'botao botao-perigo', onclick: async () => {
      const ok = await confirmar({
        titulo: 'Apagar todos os dados?', texto: 'Esta ação não pode ser desfeita. Exporte um backup antes, se quiser guardar seu progresso.',
        rotuloOk: 'Apagar tudo', perigo: true,
      });
      if (!ok) return;
      await apagarTudo();
      try { localStorage.removeItem('ecsfs-aparencia'); } catch { /* sem armazenamento local */ }
      sessionStorage.setItem('ecsfs-aviso', 'Todos os dados foram apagados.');
      location.reload();
    } }, 'Apagar todos os dados'),
  );

  const sobre = secao('Sobre e privacidade',
    h('p', {}, `Versão do app: ${__VERSAO_APP__}. Dados do edital: versão ${c.versaoSeed}.`),
    h('p', {}, 'O app não envia nada pela internet: sem rastreadores, sem fontes externas. Funciona sem conexão depois da primeira abertura.'),
  );

  const revisao = secao('Flashcards',
    campoLimite(),
    h('p', { class: 'nota' }, 'Cartões novos além do limite ficam para os dias seguintes. Os cartões vencidos sempre entram na fila.'));

  return h('div', {}, tituloTela('Configurações'), aparencia, teclado, pesos, revisao, backup, perigo, sobre);
}
