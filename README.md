# Estudos Câmara SFS

Sistema pessoal de estudos para o **Concurso Público da Câmara Municipal de São Francisco do Sul/SC** (Edital nº 001/2026, banca FURB), para os cargos de **Assistente Administrativo** e **Analista de Tecnologia da Informação**.

É um **PWA**: um site que pode ser instalado como app no celular e no computador e funciona **sem internet** depois da primeira abertura. Os dados ficam **só no seu aparelho** (IndexedDB). Não há servidor, rastreador, fonte externa nem CDN.

Etapas prontas:
- **Etapa 1 (MVP):** checklist do edital, progresso, painel com contagem regressiva, backup e toda a base de acessibilidade.
- **Etapa 2:** resumos em Markdown ligados aos tópicos, com busca e exportação; flashcards com FSRS, fila do dia e revisão só pelo teclado.

O cronograma automático chega na Etapa 3.

---

## Sumário

1. [Rodar no seu computador (Linux)](#1-rodar-no-seu-computador-linux)
2. [Publicar de graça no GitHub Pages](#2-publicar-de-graça-no-github-pages)
3. [Instalar no celular e no computador](#3-instalar-no-celular-e-no-computador)
4. [Backup e sincronização](#4-backup-e-sincronização)
5. [Resumos](#5-resumos)
6. [Flashcards](#6-flashcards)
7. [Atalhos de teclado](#7-atalhos-de-teclado)
8. [Como o progresso é calculado](#8-como-o-progresso-é-calculado)
9. [Testes](#9-testes)
10. [Estrutura do projeto](#10-estrutura-do-projeto)
11. [Quando sair uma retificação do edital](#11-quando-sair-uma-retificação-do-edital)
12. [Licenças](#12-licenças)

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

**Atualizar para uma etapa nova:** extraia o .zip novo **por cima** da pasta do projeto (o `.git` é mantido) e rode:

```bash
cd ~/estudos-camara-sfs
npm install
npm test
git add -A
git commit -m "Etapa 2"
git push
```

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

## 5. Resumos

Cada tópico pode ter um resumo em **Markdown** (e, se quiser, mais de um). Tópicos compartilhados entre os cargos têm um só resumo.

- **Abrir:** no Edital, use o link **Resumo** do tópico. Ou vá em **Resumos**, escolha o tópico em "Novo resumo" e use **Abrir ou criar resumo**.
- **Escrever:** o texto é **salvo sozinho** meio segundo depois que você para de digitar, e também ao sair do campo. A linha abaixo do editor diz "Salvo às 12:40". Ctrl+S salva na hora e confirma pelo leitor de tela.
- **Formatar:** use os botões **Negrito**, **Lista**, **Título** e **Destaque**, ou os atalhos Ctrl+B, Ctrl+Shift+8 e Ctrl+Shift+2. Um segundo uso do mesmo comando desfaz a formatação.
- **Destaque:** escreva `==texto==`. Na pré-visualização, o trecho aparece com fundo colorido **e** sublinhado grosso, e o leitor de tela diz "Destaque: … (fim do destaque)".
- **Pré-visualização:** o botão **Mostrar pré-visualização** abre o texto formatado logo abaixo. Um "# Título" do resumo vira título de nível 3, para manter a ordem dos títulos da página.
- **Do resumo para o tópico:** o link **Ver este tópico no Edital** abre o checklist com o foco já no tópico.
- **Busca:** em **Resumos**, o campo de busca procura em todos os resumos, sem diferenciar acentos nem maiúsculas. O trecho encontrado aparece marcado.
- **Exportar:** em **Resumos → Exportar resumos**, escolha **um arquivo único (.md)** ou **um arquivo por tópico (.zip)**.
- **Segurança:** o Markdown não executa scripts e não carrega imagens da internet; no lugar de uma imagem aparece "[imagem não exibida: …]". Assim, nenhum resumo faz o app acessar a rede.

---

## 6. Flashcards

**Algoritmo: FSRS** (biblioteca `ts-fsrs`, licença MIT). O FSRS calcula cada intervalo a partir de um modelo de memória (estabilidade e dificuldade de cada cartão) e erra menos que o SM-2 com o mesmo número de revisões. O código fica isolado em `src/logica/srs.js`: trocar por SM-2 significa reescrever só esse arquivo.

**Criar cartões:**
- **No tópico:** no Edital, abra **Detalhes** do tópico e use **Novo cartão**.
- **Na Revisão:** botão **Criar cartão**.
- **A partir do resumo:** selecione um trecho no editor (Shift + setas) e use **Criar cartão do trecho selecionado**. O trecho vai para o verso; você escreve a pergunta na frente.
- **Em lote:** em **Revisão → Gerenciar e importar cartões**, cole as linhas ou escolha um arquivo .csv ou .txt. Formato de cada linha:

  ```
  frente;verso;código_do_tópico;explicação (opcional)
  O que é crase?;Fusão da preposição a com o artigo a;POR-16
  "Usa-se crase antes de verbo; certo?";Errado;POR-16;Nunca antes de verbo
  ```

  Se o verso for **Certo** ou **Errado**, o cartão vira do tipo "certo ou errado". Use aspas quando o texto tiver ponto e vírgula. Linhas com problema são listadas com o número da linha, e as boas são importadas mesmo assim.

**Tipos:** "frente e verso" e "certo ou errado". Os dois aceitam um campo opcional de explicação ou fonte (por exemplo, o artigo da lei).

**Fila do dia:** os cartões **vencidos** (com revisão marcada até o fim de hoje) mais os **novos**, até o limite diário. O limite padrão é 20 e pode ser mudado em **Configurações → Flashcards**. Dá para filtrar por cargo, disciplina e tópico.

**Sessão de revisão (só teclado):**
1. O foco vai para o cartão, e o leitor de tela lê "Frente" e o texto.
2. **Espaço** mostra a resposta. O foco vai para "Resposta", e o leitor lê a resposta e a explicação.
3. Avalie com **1 Errei**, **2 Difícil**, **3 Bom** ou **4 Fácil**. Cada botão mostra quando o cartão volta (por exemplo, "3 Bom – volta em 10 minutos").
4. O próximo cartão começa com o resultado do anterior: "Anterior: Bom. Próxima revisão em 10 minutos (hoje às 12:50)".

Um cartão que deve voltar ainda hoje (os primeiros passos de um cartão novo, ou um "Errei") reaparece no fim da mesma sessão.

**Estatísticas** (tela Revisão): cartões revisados hoje, taxa de acerto de hoje e desde o início (acerto é qualquer nota diferente de "Errei") e uma tabela com as revisões previstas para os próximos 7 dias.

**Gerenciar:** em **Revisão → Gerenciar e importar cartões**, você pode editar, **suspender** (o cartão sai das revisões sem perder o histórico) ou excluir cada cartão.

---

## 7. Atalhos de teclado

Abra a lista a qualquer momento com a tecla **?** ou com o botão **Ajuda**.

| Tecla | O que faz |
|---|---|
| `?` | Abre a ajuda |
| `g` e depois `p`, `e`, `c`, `r`, `s` ou `o` | Vai para Painel, Edital, Cronograma, Revisão, Resumos ou Configurações |
| `Espaço` (na sessão de revisão) | Mostra a resposta |
| `1` a `4` (na sessão, depois da resposta) | Avalia: 1 Errei, 2 Difícil, 3 Bom, 4 Fácil |
| `Ctrl+B` / `Ctrl+Shift+8` / `Ctrl+Shift+2` (no editor de resumo) | Negrito / lista / título |
| `Ctrl+S` (no editor de resumo) | Salvar agora |
| `0` a `4` (com o foco num tópico) | Define o status: 0 Não iniciado, 1 Teoria estudada, 2 Questões resolvidas, 3 Revisado, 4 Dominado |
| `Esc` | Fecha janelas |

Os atalhos de uma tecla podem ser desligados em **Configurações** (útil se atrapalharem o leitor de tela). No Orca e no NVDA eles só funcionam no **modo de foco**. No modo de navegação, use **H** para pular de título em título: cada tópico é um título de nível 3.

---

## 8. Como o progresso é calculado

- **Um só catálogo:** 84 tópicos. Cada tópico existe uma vez e tem a lista de cargos a que pertence. A visão "Assistente Administrativo" mostra 52 tópicos, e a visão "Analista de TI" mostra 68. Marcar um tópico compartilhado conta nos dois cargos.
- **% simples:** tópicos **concluídos** ÷ total. Conta como concluído o tópico **Revisado** ou **Dominado**. No geral, cada tópico conta uma vez.
- **% ponderado:** cada disciplina vale o seu peso na prova (Português 1,50; Raciocínio Lógico 0,75; Legislação 1,50; Específicos 6,25). Esse peso é dividido igualmente entre os tópicos do cargo, porque o edital não diz quantas questões cai de cada assunto. O resultado é multiplicado pelo peso do status (Não iniciado 0, Teoria 0,4, Questões 0,7, Revisado 0,9, Dominado 1,0; esses valores são configuráveis).
- **Ponderado geral (os dois cargos):** um tópico compartilhado soma o peso que tem em cada cargo. Na prática, o resultado é a **média dos dois cargos**.
- **Exemplo conferido nos testes:** só POR-16 (Crase) como Revisado. Assistente: 0,075 × 0,9 = 0,675%. Analista: 0,0556 × 0,9 = 0,5%. Geral: 0,5875%.

**Fator de confiança (usado no cronograma da Etapa 3):** fator = 1 + (5 − confiança) × 0,25. Confiança 5 dá 1,0; confiança 1 dá 2,0; um tópico sem avaliação usa 1,5.

---

## 9. Testes

```bash
npm test                      # 37 testes unitários
npx playwright install chromium   # só na primeira vez (baixa o navegador de teste)
npm run test:a11y             # 23 testes no navegador
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
- backup: exportar → apagar → importar restaura tudo (inclusive resumos, cartões e histórico), e mesclar não duplica;
- resumo: salvamento automático, ligação com o tópico, busca, destaque acessível e Markdown seguro;
- flashcards: criar no tópico, revisar só pelo teclado, próxima revisão calculada, limite de novos e importação em lote.

A verificação manual com leitor de tela está em [`docs/checklist-acessibilidade.md`](docs/checklist-acessibilidade.md).

---

## 10. Estrutura do projeto

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
    srs.js                  FSRS: agendar, previsões, textos de intervalo
    fila.js                 fila do dia, estatísticas, previsão de 7 dias
    texto.js                busca sem acento, edição de Markdown, CSV de cartões
    constantes.js           status, pesos, configuração padrão
    progresso.js            % simples e ponderado
    datas.js                horário de Brasília, contagem, próximos prazos
    backup.js               formato, validação, migração e mesclagem
  ui/
    dom.js                  criação de elementos sem innerHTML
    a11y.js                 avisos ao leitor de tela, diálogos, atalhos
    aparencia.js            tema, fonte e espaçamento
    componentes.js          barra de progresso, ícone de status
    markdown.js             Markdown seguro (marked + DOMPurify), destaque acessível
    cartao-dialogo.js       janela de criar e editar cartão
    seletores.js            listas de tópicos e disciplinas
    telas/                  painel, edital, resumos, revisao, config, em-breve
  estilos/base.css          temas, foco, layout
tests/unit/                 testes unitários (Vitest)
tests/a11y/                 testes no navegador (Playwright + axe-core)
ferramentas/gerar-icones.mjs  gera os PNG a partir de public/icons/icon.svg
.github/workflows/pages.yml publicação no GitHub Pages
```

---

## 11. Quando sair uma retificação do edital

Os dados do edital estão em `src/dados/seed.json`. Para corrigir:

1. Edite o arquivo (datas em `eventoEdital`, tópicos em `topico`).
2. Aumente o número `versaoSeed` (por exemplo, de 1 para 2).
3. Publique (`git push`).

Na próxima abertura, o app aplica o seed novo: acrescenta tópicos novos e atualiza textos e datas, **sem apagar** o seu progresso, notas, links das normas nem tópicos ocultos.

A edição de tópicos e datas pela própria tela, sem mexer no arquivo, está prevista para a Etapa 4.

---

## 12. Licenças

- Código do app: MIT (arquivo `LICENSE`).
- [Dexie.js](https://dexie.org): Apache 2.0.
- [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs), [marked](https://marked.js.org) e [fflate](https://github.com/101arrowz/fflate): MIT.
- [DOMPurify](https://github.com/cure53/DOMPurify): MPL 2.0 ou Apache 2.0.
- Fonte [Atkinson Hyperlegible](https://www.brailleinstitute.org/freefont/) (Braille Institute), via Fontsource: SIL Open Font License 1.1.
- Ferramentas de desenvolvimento (Vite, Vitest, Playwright, axe-core): MIT ou MPL 2.0. Não vão para o app final, exceto o que está listado acima.
