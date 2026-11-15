# Checklist manual de acessibilidade

O axe-core encontra uns 30–40% dos problemas. O resto precisa de teste manual. Faça este roteiro a cada etapa.

## Leitor de tela

Leitores: **Orca** (Linux, com Firefox ou Chromium), **NVDA** (Windows) ou **TalkBack** (Android, com Chrome).

- [ ] Ao abrir o app, o título da página é lido ("Painel – Estudos Câmara SFS").
- [ ] Na lista de marcos (landmarks), aparecem: banner, navegação "Menu principal" e principal.
- [ ] O menu anuncia a tela atual como "página atual".
- [ ] Ao trocar de tela, o leitor lê o título (h1) da nova tela.
- [ ] Na tela Edital, a navegação por títulos (H) vai de disciplina (nível 2) em disciplina e de tópico (nível 3) em tópico.
- [ ] O botão da disciplina anuncia "expandido" ou "recolhido".
- [ ] Cada barra de progresso é lida com o texto completo, por exemplo "Língua Portuguesa – Assistente Administrativo, 1 de 20 tópicos concluídos, 5%. Ponderado pelo peso na prova: 4,5%".
- [ ] O campo "Status de POR-16" é lido com o nome do tópico. Ao mudar o status, o leitor anuncia "POR-16 marcado como Revisado…" sem perder o foco.
- [ ] O botão "Próximo: …" diz qual status vai ser aplicado.
- [ ] Os subitens "(só Analista)" são lidos.
- [ ] Erros de formulário (por exemplo, acertos maiores que questões feitas) são lidos ao voltar ao campo, e o campo é anunciado como inválido.
- [ ] Os diálogos (Ajuda, Apagar, Substituir) são anunciados com o título. O foco começa em "Cancelar" ou "Fechar" e volta ao botão de origem ao fechar.
- [ ] Exportar e importar backup geram um aviso falado.

## Teclado (sem mouse)

- [ ] O primeiro Tab mostra "Pular para o conteúdo", e Enter leva ao título da tela.
- [ ] Todos os controles são alcançáveis com Tab, na ordem visual.
- [ ] O foco é sempre visível (contorno grosso magenta, amarelo ou ciano, conforme o tema).
- [ ] Nenhum lugar prende o foco. Os diálogos fecham com Esc.
- [ ] `?` abre a ajuda; `g` e depois `e` vai para o Edital; `0` a `4` funcionam com o foco num tópico.
- [ ] Desligar "Atalhos de uma tecla" em Configurações desativa `?` e `g`.

## Visão

- [ ] Temas claro, escuro e alto contraste: todo o texto é legível; nada some.
- [ ] A fonte de 100% a 200% (A−/A+) muda o tamanho e fica salva ao reabrir.
- [ ] Com o zoom do navegador em 200% e a fonte do app em 200%, não há rolagem horizontal (exceto tabelas).
- [ ] "Espaçamento ampliado" não corta nem sobrepõe texto.
- [ ] Os status se distinguem sem cor: texto + ícone com preenchimento diferente (vazio, ¼, ½, ¾, cheio).
- [ ] A tela atual no menu se distingue sem cor (negrito e sublinhado).
- [ ] Com "Reduzir movimento" ligado no sistema, nada se anima.

## Toque (celular)

- [ ] Todos os botões e campos têm pelo menos 44×44 px e não ficam colados.
- [ ] O app funciona na vertical e na horizontal.
- [ ] Com TalkBack, deslizar para a direita percorre tudo em ordem lógica.

## Etapa 2 – Resumos

- [ ] No Edital, o link "Resumo de POR-16" abre o editor, e o leitor lê "Resumo – POR-16".
- [ ] O campo "Texto do resumo (Markdown)" é lido com a ajuda dos atalhos.
- [ ] Ctrl+B, Ctrl+Shift+8 e Ctrl+Shift+2 formatam, e o leitor anuncia "Negrito aplicado", "Item de lista aplicado" ou "Título aplicado".
- [ ] Tab sai do editor (não fica preso).
- [ ] Ctrl+S anuncia "Resumo salvo". Depois de recarregar a página, o texto continua lá.
- [ ] Na pré-visualização, um ==destaque== é lido como "Destaque: … (fim do destaque)" e aparece com fundo e sublinhado grosso.
- [ ] "Ver este tópico no Edital" leva o foco ao título do tópico.
- [ ] A busca anuncia quantos resumos foram encontrados; o trecho achado é lido como "Encontrado: …".
- [ ] "Criar cartão do trecho selecionado" sem seleção mostra o erro e devolve o foco ao editor.

## Etapa 2 – Flashcards

- [ ] O diálogo "Novo cartão" abre com o foco na Frente (ou no Tópico, se não houver tópico escolhido) e fecha com Esc, devolvendo o foco ao botão.
- [ ] Erros no diálogo (frente vazia, tópico não escolhido) são lidos e marcam o campo como inválido.
- [ ] Na sessão, o leitor lê "Frente", as informações do cartão e o texto, sem precisar navegar.
- [ ] Espaço mostra a resposta; o leitor lê "Resposta", o texto e a explicação.
- [ ] Cada botão de avaliação é lido com o número, a nota e o intervalo ("3 Bom – volta em 10 minutos").
- [ ] As teclas 1 a 4 avaliam; o próximo cartão começa lendo o resultado anterior ("Anterior: Bom. Próxima revisão em…").
- [ ] "Fim da sessão" é lido com o total de revisões e acertos.
- [ ] A tabela de previsão de 7 dias é lida com cabeçalhos de linha e coluna.
- [ ] A importação em lote anuncia quantos cartões entraram e lista os erros com o número da linha.
- [ ] No celular (TalkBack), os quatro botões de avaliação são grandes e fáceis de tocar.

## Etapa 3 – Cronograma

- [ ] Na primeira vez, Cronograma abre os Ajustes com "Primeiro plano". Cada campo de horas é lido com o nome do dia.
- [ ] Um valor inválido (ex.: 20 horas) mostra "Erro: …", leva o foco ao campo e o marca como inválido.
- [ ] "Adicionar folga" e "Remover folga de 25/12/2026" anunciam o resultado.
- [ ] Depois de gerar, a mensagem "Cronograma replanejado…" é lida, e os "Avisos do plano" aparecem como região com título.
- [ ] O submenu "Visões do cronograma" indica a visão atual ("página atual").
- [ ] Hoje: o título do dia é lido; cada bloco é um item de lista numerado, com tipo, minutos e descrição.
- [ ] Os campos "Situação do bloco 2 de 16/11/2026" e "Minutos reais do bloco 2 de 16/11/2026" dizem de qual bloco são.
- [ ] Marcar um bloco anuncia "Bloco 2 marcado como Feito" e lembra de atualizar o status do tópico. O total "Registrado" se atualiza.
- [ ] A situação aparece em texto e com ícone de forma diferente (vazio, meio, cheio, cortado), não só por cor.
- [ ] Semana: um título de nível 3 por dia (tecla H no leitor de tela).
- [ ] Resumo do plano: a tabela de disciplinas é lida com cabeçalhos de linha e coluna.
- [ ] "Replanejar a partir de hoje" anuncia o resultado sem perder o lugar na página.
