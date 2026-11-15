# Estudos Câmara SFS

Sistema pessoal de estudos para o **Concurso Público da Câmara Municipal de São Francisco do Sul/SC** (Edital nº 001/2026, banca FURB), para os cargos de **Assistente Administrativo** e **Analista de Tecnologia da Informação**.

É um **PWA**: um site que pode ser instalado como app no celular e no computador e funciona **sem internet** depois da primeira abertura. Os dados ficam **só no seu aparelho** (IndexedDB). Não há servidor, rastreador, fonte externa nem CDN.

Esta é a **Etapa 1 (MVP)**: checklist do edital, progresso, painel com contagem regressiva, backup e toda a base de acessibilidade. Resumos e flashcards chegam na Etapa 2. O cronograma automático chega na Etapa 3.

---

## Sumário

1. [Rodar no seu computador (Linux)](#1-rodar-no-seu-computador-linux)
2. [Publicar de graça no GitHub Pages](#2-publicar-de-graça-no-github-pages)
3. [Instalar no celular e no computador](#3-instalar-no-celular-e-no-computador)
4. [Backup e sincronização](#4-backup-e-sincronização)
5. [Atalhos de teclado](#5-atalhos-de-teclado)
6. [Como o progresso é calculado](#6-como-o-progresso-é-calculado)
7. [Testes](#7-testes)
8. [Estrutura do projeto](#8-estrutura-do-projeto)
9. [Quando sair uma retificação do edital](#9-quando-sair-uma-retificação-do-edital)
10. [Licenças](#10-licenças)

---

## 1. Rodar no seu computador (Linux)

Você precisa do **Node.js 18 ou mais novo**. Para conferir, rode no terminal:

```bash
node -v
```

Se não tiver o Node, instale pelo gerenciador de pacotes da sua distribuição (por exemplo, `sudo apt install nodejs npm` no Debian/Ubuntu) ou pelo [nvm](https://github.com/nvm-sh/nvm).

Na pasta do projeto:

```bash
npm install        # só na primeira vez: baixa as dependências
npm run local      # gera o app e abre o servidor em 127.0.0.1
```

Abra **http://127.0.0.1:4173** no Chromium, Chrome ou Firefox. O servidor só aceita conexões do próprio computador.

Outros comandos:

| Comando | O que faz |
|---|---|
| `npm run dev` | Modo de desenvolvimento em http://127.0.0.1:5173 (recarrega ao salvar; **sem** modo offline). |
| `npm run build` | Gera o app final na pasta `dist/`. |
| `npm run preview` | Serve a pasta `dist/` já gerada em http://127.0.0.1:4173. |
| `npm test` | Testes unitários (progresso, datas, backup). |
| `npm run test:a11y` | Testes no navegador: axe-core e critérios de aceite. |

> No `127.0.0.1` o modo offline funciona sem HTTPS. Para o **celular**, use a publicação do passo 2, que tem HTTPS.

---

## 2. Publicar de graça no GitHub Pages

1. Crie uma conta em **github.com**, se ainda não tiver.
2. Crie um repositório novo, por exemplo `estudos-camara-sfs`. Pode ser **público** ou **privado**. Atenção: no plano gratuito, o GitHub Pages só funciona com repositório público. Isso não expõe seus dados: o repositório tem só o código, e o seu progresso fica no seu aparelho.
3. Envie os arquivos do projeto para o repositório. Pelo terminal, na pasta do projeto:

   ```bash
   git init
   git add .
   git commit -m "Etapa 1"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/estudos-camara-sfs.git
   git push -u origin main
   ```

4. No repositório, abra **Settings → Pages**. Em **Source**, escolha **GitHub Actions**.
5. Abra a aba **Actions**. O workflow "Publicar no GitHub Pages" (arquivo `.github/workflows/pages.yml`) roda os testes, gera o app e publica. Leva uns 2 minutos.
6. O endereço fica assim: **https://SEU-USUARIO.github.io/estudos-camara-sfs/**

Cada novo `git push` publica de novo. O app aberto mostra o aviso **"Nova versão disponível"** com o botão **Recarregar**. Atualizar não apaga seus dados.

**Alternativa sem GitHub (Codeberg Pages):** crie um repositório chamado `pages` na sua conta do codeberg.org, rode `npm run build` e envie **o conteúdo da pasta `dist/`** para esse repositório. O endereço fica `https://SEU-USUARIO.codeberg.page/`.

---

## 3. Instalar no celular e no computador

**Android (Chrome):**
1. Abra o endereço do passo 2 no Chrome.
2. Toque no menu **⋮** e depois em **Instalar app** (em algumas versões, **Adicionar à tela inicial**).
3. Abra o app uma vez com internet. A partir daí ele funciona em **modo avião**.

**Linux (Chromium ou Chrome):**
1. Abra o endereço.
2. Clique no ícone de instalar no fim da barra de endereço (um monitor com uma seta), ou vá em menu **⋮ → Transmitir, salvar e compartilhar → Instalar página como app**.
3. O app aparece no menu de aplicativos do sistema.

**Firefox no Linux:** o app abre e funciona offline, mas, até onde sei, o Firefox para computador ainda não instala PWAs como app. Para instalar, use o Chromium ou o Chrome.

**iPhone (Safari):** botão **Compartilhar → Adicionar à Tela de Início**. Fora da tela de início, o Safari pode apagar os dados de sites que ficam uns 7 dias sem uso. Por isso, faça backup.

---

## 4. Backup e sincronização

Os dados ficam só no aparelho. Para levar de um aparelho para o outro (Opção A, a do MVP):

1. Em **Configurações → Backup e sincronização**, toque em **Exportar backup (.json)**. No celular, o botão **Compartilhar backup** abre o menu do Android (e-mail, Drive, Bluetooth, etc.).
2. No outro aparelho, em **Importar**, escolha o arquivo e o modo:
   - **Mesclar** (padrão): junta os dados. Se o mesmo registro existir nos dois lados, fica o que foi **alterado por último**. Importar o mesmo arquivo duas vezes não duplica nada.
   - **Substituir**: apaga os dados do aparelho e usa só os do backup. O app pede confirmação.

O arquivo de backup tem o campo `versaoEsquema`. Backups antigos são migrados automaticamente quando o app mudar de versão.

A sincronização automática por um serviço gratuito (Opção B) é opcional e fica para a Etapa 5, desligada por padrão.

---

## 5. Atalhos de teclado

Abra a lista a qualquer momento com a tecla **?** ou com o botão **Ajuda**.

| Tecla | O que faz |
|---|---|
| `?` | Abre a ajuda |
| `g` e depois `p`, `e`, `c`, `r`, `s` ou `o` | Vai para Painel, Edital, Cronograma, Revisão, Resumos ou Configurações |
| `0` a `4` (com o foco num tópico) | Define o status: 0 Não iniciado, 1 Teoria estudada, 2 Questões resolvidas, 3 Revisado, 4 Dominado |
| `Esc` | Fecha janelas |

Os atalhos de uma tecla podem ser desligados em **Configurações** (útil se atrapalharem o leitor de tela). No Orca e no NVDA eles só funcionam no **modo de foco**. No modo de navegação, use **H** para pular de título em título: cada tópico é um título de nível 3.

---

## 6. Como o progresso é calculado

- **Um só catálogo:** 84 tópicos. Cada tópico existe uma vez e tem a lista de cargos a que pertence. A visão "Assistente Administrativo" mostra 52 tópicos, e a visão "Analista de TI" mostra 68. Marcar um tópico compartilhado conta nos dois cargos.
- **% simples:** tópicos **concluídos** ÷ total. Conta como concluído o tópico **Revisado** ou **Dominado**. No geral, cada tópico conta uma vez.
- **% ponderado:** cada disciplina vale o seu peso na prova (Português 1,50; Raciocínio Lógico 0,75; Legislação 1,50; Específicos 6,25). Esse peso é dividido igualmente entre os tópicos do cargo, porque o edital não diz quantas questões cai de cada assunto. O resultado é multiplicado pelo peso do status (Não iniciado 0, Teoria 0,4, Questões 0,7, Revisado 0,9, Dominado 1,0; esses valores são configuráveis).
- **Ponderado geral (os dois cargos):** um tópico compartilhado soma o peso que tem em cada cargo. Na prática, o resultado é a **média dos dois cargos**.
- **Exemplo conferido nos testes:** só POR-16 (Crase) como Revisado. Assistente: 0,075 × 0,9 = 0,675%. Analista: 0,0556 × 0,9 = 0,5%. Geral: 0,5875%.

**Fator de confiança (usado no cronograma da Etapa 3):** fator = 1 + (5 − confiança) × 0,25. Confiança 5 dá 1,0; confiança 1 dá 2,0; um tópico sem avaliação usa 1,5.

---

## 7. Testes

```bash
npm test                      # 19 testes unitários
npx playwright install chromium   # só na primeira vez (baixa o navegador de teste)
npm run test:a11y             # 11 testes no navegador
```

Se você já tem o Chromium ou o Chrome instalado e não quer baixar outro, aponte para ele:

```bash
CHROME_PATH=/usr/bin/chromium npm run test:a11y
```

Os testes no navegador verificam:
- **axe-core** sem violações WCAG 2.1 A/AA em todas as telas, nos três temas, com a ajuda aberta;
- 84, 52 e 68 tópicos nas três visões;
- POR-16 contando nos dois cargos e uma vez só no geral;
- teclado: "Pular para o conteúdo", tecla `?`, `g e`, teclas `0` a `4`;
- fonte em 200% numa tela de 320 px sem rolagem horizontal;
- nenhuma requisição para fora do app;
- funcionamento offline;
- backup: exportar → apagar → importar restaura tudo, e mesclar não duplica.

A verificação manual com leitor de tela está em [`docs/checklist-acessibilidade.md`](docs/checklist-acessibilidade.md).

---

## 8. Estrutura do projeto

```
index.html                  página única (cabeçalho, menu, área principal, ajuda)
public/                     manifest e ícones (copiados como estão)
src/
  main.js                   início, rotas (#/painel…), atalhos, Service Worker
  sw.js                     modelo do Service Worker (o build gera dist/sw.js)
  dados/
    seed.json               dados do edital: 84 tópicos, disciplinas, cargos, cronograma
    db.js                   banco IndexedDB (Dexie), versão do esquema
    seed.js                 carga do seed sem apagar o progresso
    repositorio.js          estado em memória e gravação
    backup-arquivo.js       exportar, compartilhar, importar, apagar
  logica/                   funções puras, com testes
    constantes.js           status, pesos, configuração padrão
    progresso.js            % simples e ponderado
    datas.js                horário de Brasília, contagem, próximos prazos
    backup.js               formato, validação, migração e mesclagem
  ui/
    dom.js                  criação de elementos sem innerHTML
    a11y.js                 avisos ao leitor de tela, diálogos, atalhos
    aparencia.js            tema, fonte e espaçamento
    componentes.js          barra de progresso, ícone de status
    telas/                  painel, edital, config, em-breve
  estilos/base.css          temas, foco, layout
tests/unit/                 testes unitários (Vitest)
tests/a11y/                 testes no navegador (Playwright + axe-core)
ferramentas/gerar-icones.mjs  gera os PNG a partir de public/icons/icon.svg
.github/workflows/pages.yml publicação no GitHub Pages
```

---

## 9. Quando sair uma retificação do edital

Os dados do edital estão em `src/dados/seed.json`. Para corrigir:

1. Edite o arquivo (datas em `eventoEdital`, tópicos em `topico`).
2. Aumente o número `versaoSeed` (por exemplo, de 1 para 2).
3. Publique (`git push`).

Na próxima abertura, o app aplica o seed novo: acrescenta tópicos novos e atualiza textos e datas, **sem apagar** o seu progresso, notas, links das normas nem tópicos ocultos.

A edição de tópicos e datas pela própria tela, sem mexer no arquivo, está prevista para a Etapa 4.

---

## 10. Licenças

- Código do app: MIT (arquivo `LICENSE`).
- [Dexie.js](https://dexie.org): Apache 2.0.
- Fonte [Atkinson Hyperlegible](https://www.brailleinstitute.org/freefont/) (Braille Institute), via Fontsource: SIL Open Font License 1.1.
- Ferramentas de desenvolvimento (Vite, Vitest, Playwright, axe-core): MIT ou MPL 2.0. Não vão para o app final, exceto o que está listado acima.
