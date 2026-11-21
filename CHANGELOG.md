# Histórico de versões

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), e as
versões obedecem ao [versionamento semântico](https://semver.org/lang/pt-BR/).

## [1.1.1] - 2026-11-21

### Adicionado

- Links para o repositório e para a página de versões no rodapé do site, e na dúvida sobre
  o modelo de confiança, que até aqui mandava o leitor procurar o arquivo em Releases sem
  oferecer o caminho.

### Corrigido

- O aviso de versão nova podia não aparecer. O ouvinte do evento `updatefound` era
  registrado depois que `register()` resolvia, e o evento pode disparar antes disso. Agora
  o estado da instalação também é consultado diretamente, e a troca de comando do service
  worker serve como sinal adicional.

## [1.1.0] - 2026-11-21

Versão de endurecimento, resultante de uma auditoria técnica externa do projeto.
Nenhuma mensagem já cifrada deixa de abrir.

### Adicionado

- Algoritmos 4 e 5, que derivam as chaves de cifragem e de autenticação por HKDF-SHA-256
  a partir de uma chave mestra de 256 bits, com rótulos de separação de domínio. Passam a
  ser as opções oferecidas para os modos CBC e CTR.
- Política de segurança de conteúdo estrita na própria página, com `default-src 'none'` e
  `connect-src 'none'`, autorizando o estilo e o script pelo resumo SHA-256 do conteúdo em
  vez de `unsafe-inline`.
- Ferramenta `tools/csp.mjs`, que calcula e confere essa política, com verificação
  obrigatória na integração contínua para que uma política defasada nunca seja publicada.
- Vetores de teste oficiais na especificação do formato, com blocos para os algoritmos 1,
  4 e 5 e para os históricos 2 e 3, todos abertos automaticamente pela suíte de testes.
- Fluxo de lançamento que publica o `index.html` isolado e um pacote completo no GitHub
  Releases, acompanhados dos resumos SHA-256, para uso offline verificável.
- Dúvida no site explicando em que ainda é preciso confiar quando o código chega pela rede,
  e como contornar isso com o arquivo publicado em Releases.
- Aviso sobre a área de transferência junto ao texto aberto.
- Especificação do escopo exato da autenticação, do uso do UTF-8 no texto em claro e da
  exclusão do prefixo `CSG1:` dos cálculos de integridade.

### Alterado

- Os algoritmos 2 e 3 passam a ser históricos: continuam sendo abertos, e não são mais
  usados em mensagens novas. Eles pediam 512 bits diretos ao PBKDF2, o que custava dois
  blocos a quem conhece a palavra-passe e apenas um a quem tenta adivinhá-la.
- O piso de repetições aceitas na abertura subiu de 10.000 para 100.000. O menor valor que
  a aplicação já produziu é 210.000, portanto nenhuma mensagem legítima é afetada.
- O campo da mensagem passou a desligar o corretor ortográfico, a correção automática e a
  capitalização automática, para não expor texto em claro a serviços em nuvem. O efeito
  colateral é a perda da marcação de erros de digitação ao escrever.
- A suíte de testes cresceu de 48 para 61 casos.

### Segurança

- Validação do intervalo de repetições confirmada como anterior a qualquer chamada
  criptográfica, agora coberta por testes que forjam o cabeçalho.
- Decisões assumidas e seus custos documentados em SECURITY.md: a ausência de resistência a
  memória no PBKDF2, a manutenção dos modos CBC e CTR e a impossibilidade de limpar cadeias
  de texto da memória em JavaScript.

## [1.0.0] - 2026-10-12

Primeira versão pública.

### Adicionado

- Cifragem e decifragem de textos no navegador, com palavra-passe escolhida pelo usuário.
- Três algoritmos à escolha: AES-256-GCM, AES-256-CBC com HMAC-SHA-256 e AES-256-CTR com
  HMAC-SHA-256.
- Duas funções de derivação, PBKDF2-SHA-256 e PBKDF2-SHA-512, em três níveis de custo.
- Formato CSG1, que carrega os próprios parâmetros e dispensa combinar configurações entre
  quem envia e quem recebe.
- Autenticação do cabeçalho em todos os modos, impedindo a troca de parâmetros por
  terceiros.
- Normalização Unicode NFC da palavra-passe, para que acentos digitados em sistemas
  diferentes produzam a mesma chave.
- Medidor de força da palavra-passe e campo de confirmação.
- Reconhecimento automático dos parâmetros ao colar uma mensagem recebida.
- Abertura de mensagem a partir de arquivo `.txt`, além da colagem direta.
- Botões para copiar, compartilhar e salvar o resultado.
- Uso offline por service worker, com possibilidade de instalar como aplicativo.
- Site de apresentação com a ferramenta embutida, explicação do funcionamento, a
  especificação do formato e as dúvidas mais comuns.
- Suíte de 48 testes do núcleo criptográfico, extraído do próprio `index.html`.
- Publicação automática no GitHub Pages.

[1.1.1]: https://github.com/miqueiasklippel/criptsage/releases/tag/v1.1.1
[1.1.0]: https://github.com/miqueiasklippel/criptsage/releases/tag/v1.1.0
[1.0.0]: https://github.com/miqueiasklippel/criptsage/releases/tag/v1.0.0
