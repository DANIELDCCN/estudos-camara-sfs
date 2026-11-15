// Ponto de entrada: carrega fontes e estilos, prepara o banco, monta o menu e as rotas.
import '@fontsource/atkinson-hyperlegible/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-700.css';
import './estilos/base.css';

import seed from './dados/seed.json';
import { db } from './dados/db.js';
import { aplicarSeed } from './dados/seed.js';
import { estado, carregar, salvarConfig } from './dados/repositorio.js';
import { aplicarAparencia, proximaEscala } from './ui/aparencia.js';
import { anunciar, abrirDialogo, estaDigitando, LISTA_ATALHOS } from './ui/a11y.js';
import { h } from './ui/dom.js';
import * as painel from './ui/telas/painel.js';
import * as edital from './ui/telas/edital.js';
import * as config from './ui/telas/config.js';
import * as revisao from './ui/telas/revisao.js';
import * as resumos from './ui/telas/resumos.js';
import { cronograma } from './ui/telas/em-breve.js';

// Rotas: o endereço fica como .../#/edital ou .../#/resumos/topico/POR-16
// (funciona em qualquer hospedagem estática). O que vem depois da rota é o parâmetro da tela.
const ROTAS = { painel, edital, cronograma, revisao, resumos, config };
const TECLA_ROTA = { p: 'painel', e: 'edital', c: 'cronograma', r: 'revisao', s: 'resumos', o: 'config' };

const main = document.getElementById('conteudo');

function rotaAtual() {
  const m = location.hash.match(/^#\/([a-z]+)(?:\/(.*))?$/);
  return m && ROTAS[m[1]] ? { nome: m[1], param: decodeURIComponent(m[2] ?? '') } : { nome: 'painel', param: '' };
}

let primeiraTela = true;
function mostrar() {
  // Âncoras internas (ex.: #conteudo do "Pular para o conteúdo") não trocam de tela.
  if (location.hash && !location.hash.startsWith('#/')) return;
  const { nome, param } = rotaAtual();
  const tela = ROTAS[nome];
  const conteudo = tela.render(param);
  main.replaceChildren(conteudo);
  document.title = `${tela.titulo} – ${estado.config.nomeApp}`;
  for (const a of document.querySelectorAll('#menu a')) {
    if (a.getAttribute('href') === `#/${nome}`) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  // Na troca de tela, o foco vai para o título (h1), e o leitor de tela lê onde você está.
  // Exceções: a tela pede foco num elemento (data-foco-inicial) ou cuida do foco sozinha.
  const alvo = main.querySelector('[data-foco-inicial]');
  if (alvo) { alvo.focus(); alvo.scrollIntoView({ block: 'start' }); } else if (!primeiraTela && !conteudo.dataset?.focoProprio) document.getElementById('titulo-tela')?.focus();
  primeiraTela = false;
}

function configurarCabecalho() {
  document.getElementById('nome-app').textContent = estado.config.nomeApp;
  document.getElementById('lista-atalhos').replaceChildren(
    ...LISTA_ATALHOS.map(([tecla, descricao]) => h('tr', {}, h('td', {}, h('kbd', {}, tecla)), h('td', {}, descricao))));
  const mudarFonte = async (passo) => {
    const nova = proximaEscala(estado.config.escalaFonte, passo);
    await salvarConfig({ escalaFonte: nova });
    aplicarAparencia(estado.config);
    anunciar(`Fonte em ${Math.round(nova * 100)}%.`);
  };
  document.getElementById('fonte-menos').addEventListener('click', () => mudarFonte(-1));
  document.getElementById('fonte-mais').addEventListener('click', () => mudarFonte(+1));
  document.getElementById('abrir-ajuda').addEventListener('click', abrirAjuda);
  document.getElementById('fechar-ajuda').addEventListener('click', () => document.getElementById('dlg-ajuda').close());
  document.querySelector('.pular').addEventListener('click', (e) => {
    e.preventDefault();
    (document.getElementById('titulo-tela') ?? main).focus();
  });
}

function abrirAjuda() {
  const dlg = document.getElementById('dlg-ajuda');
  if (!dlg.open) abrirDialogo(dlg, document.getElementById('fechar-ajuda'));
}

function configurarAtalhos() {
  let esperandoG = 0;
  document.addEventListener('keydown', (e) => {
    if (!estado.config.atalhos || e.ctrlKey || e.altKey || e.metaKey || estaDigitando(e.target)) return;
    if (document.querySelector('dialog[open]')) return;
    if (e.key === '?') { e.preventDefault(); abrirAjuda(); return; }
    if (e.key === 'g') { esperandoG = Date.now(); return; }
    if (esperandoG && Date.now() - esperandoG < 1500 && TECLA_ROTA[e.key]) {
      e.preventDefault();
      esperandoG = 0;
      location.hash = `#/${TECLA_ROTA[e.key]}`;
    } else esperandoG = 0;
  });
}

// Só recarrega quando o usuário pede (botão Recarregar). Na primeira visita, o Service
// Worker assume o controle sem recarregar a página.
let pediuAtualizacao = false;

function registrarServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    const avisoNovaVersao = () => {
      const aviso = document.getElementById('aviso-atualizacao');
      aviso.hidden = false;
      anunciar('Nova versão disponível. Use o botão Recarregar no topo da página.');
      document.getElementById('recarregar').onclick = () => { pediuAtualizacao = true; reg.waiting?.postMessage('PULAR_ESPERA'); };
    };
    if (reg.waiting && navigator.serviceWorker.controller) avisoNovaVersao();
    reg.addEventListener('updatefound', () => {
      const novo = reg.installing;
      novo?.addEventListener('statechange', () => {
        if (novo.state !== 'installed') return;
        if (navigator.serviceWorker.controller) avisoNovaVersao();
        else anunciar('App pronto para funcionar sem internet.');
      });
    });
  }).catch(() => { /* sem Service Worker o app ainda funciona online */ });
  let recarregando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recarregando || !pediuAtualizacao) return;
    recarregando = true;
    location.reload();
  });
}

async function iniciar() {
  try {
    await aplicarSeed(db, seed);
    await carregar();
  } catch (erro) {
    main.replaceChildren();
    const p = document.createElement('p');
    p.className = 'erro';
    p.setAttribute('role', 'alert');
    p.textContent = `Erro ao abrir o banco de dados local: ${erro.message}. Verifique se o navegador permite armazenamento para este site.`;
    main.append(p);
    return;
  }
  aplicarAparencia(estado.config);
  configurarCabecalho();
  configurarAtalhos();
  window.addEventListener('hashchange', mostrar);
  mostrar();
  registrarServiceWorker();
  // Pede ao navegador para não apagar os dados automaticamente.
  navigator.storage?.persist?.().catch(() => {});
  // Mensagem deixada antes de recarregar (ex.: depois de importar um backup).
  const aviso = sessionStorage.getItem('ecsfs-aviso');
  if (aviso) { sessionStorage.removeItem('ecsfs-aviso'); setTimeout(() => anunciar(aviso), 500); }
  document.body.dataset.pronto = 'sim'; // usado pelos testes automáticos
}

iniciar();
