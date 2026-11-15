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
