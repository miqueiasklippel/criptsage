# Histórico de versões

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), e as
versões obedecem ao [versionamento semântico](https://semver.org/lang/pt-BR/).

## [1.0.0] — 2026-10-12

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

[1.0.0]: https://github.com/miqueiasklippel/criptsage/releases/tag/v1.0.0
