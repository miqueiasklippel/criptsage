# Política de segurança

## Como relatar uma falha

Falhas de segurança não devem ser abertas como issue pública, para que não fiquem à vista
antes da correção.

Escreva para **contato@klippelbit.app.br** com o assunto `CriptSage: segurança` e, se
possível, inclua:

- uma descrição da falha e do impacto que ela permite;
- os passos para reproduzi-la;
- a versão do CriptSage, o navegador e o sistema operacional;
- qualquer prova de conceito que ajude a entender o problema.

Procuro responder em até sete dias. Depois da confirmação, a correção é publicada e o
relato é reconhecido no [histórico de versões](CHANGELOG.md), salvo se você preferir
permanecer anônimo.

## Versões atendidas

Apenas a versão mais recente recebe correções. Como o CriptSage é um único arquivo
estático, atualizar significa recarregar a página.

| Versão | Atendida |
|---|---|
| 1.0.x | sim |

## Modelo de ameaça

Deixar claro contra o que a ferramenta protege evita expectativas equivocadas.

### Contra o que o CriptSage protege

- **Leitura por terceiros em trânsito.** Quem interceptar a mensagem vê apenas o texto
  cifrado. Sem a palavra-passe, não há como lê-lo.
- **Adulteração.** Qualquer byte alterado, no cabeçalho ou no corpo, faz a abertura ser
  recusada. Os parâmetros de criptografia também são autenticados e não podem ser trocados
  por quem intercepte a mensagem.
- **Leitura por quem hospeda o serviço de mensagens.** O provedor de e-mail ou de
  mensagens que transporta o bloco não tem a palavra-passe.
- **Observação pelo servidor que hospeda a página.** Toda a criptografia acontece no
  navegador. Nenhuma mensagem e nenhuma palavra-passe são enviadas a servidor algum.

### Contra o que ele não protege

- **Um aparelho comprometido.** Se houver registrador de teclado, extensão maliciosa ou
  programa espião na máquina, a palavra-passe e o texto em claro podem ser capturados
  antes de a criptografia acontecer.
- **Uma palavra-passe fraca.** O PBKDF2 encarece cada tentativa, mas não salva uma senha
  curta ou previsível de um ataque por dicionário.
- **O canal da palavra-passe.** Enviar a mensagem e a palavra-passe pelo mesmo aplicativo
  anula a proteção. Combine a frase por outro caminho.
- **O tamanho da mensagem.** O comprimento do texto cifrado revela o tamanho aproximado do
  original.
- **Metadados.** Quem conversa com quem, quando e com que frequência continua visível para
  quem transporta as mensagens.
- **Coação.** Não há mensagem falsa nem volume oculto. Quem for obrigado a revelar a
  palavra-passe revela a mensagem.
- **Um servidor hostil.** Como em qualquer aplicação web, quem controla a hospedagem pode
  servir um arquivo alterado. Para uso crítico, baixe o `index.html`, confira o conteúdo e
  abra o arquivo local.

## Escolhas criptográficas

- **AES-256** nos modos GCM, CBC e CTR, com os dois últimos acompanhados de HMAC-SHA-256
  no esquema cifrar e depois autenticar.
- **PBKDF2** com SHA-256 ou SHA-512, em 600.000 e 210.000 repetições no custo padrão,
  conforme as recomendações da OWASP em vigor.
- **Sal de 16 bytes** e **vetor de inicialização** sorteados por `crypto.getRandomValues`
  a cada mensagem.
- **Chaves separadas** para cifragem e autenticação, derivadas de material independente.
- **Autenticação antes da decifragem** nos modos CBC e CTR, com comparação de tempo
  constante.
- **Normalização Unicode NFC** da palavra-passe, para que o mesmo texto sempre produza a
  mesma chave.
- **Recusa indistinguível**: palavra-passe errada e mensagem adulterada devolvem a mesma
  resposta.

Toda a criptografia vem da Web Crypto API do navegador. Não há implementação de primitiva
criptográfica escrita neste projeto.

O formato está [documentado em detalhe](docs/FORMATO.md), de modo que a especificação pode
ser revisada de maneira independente do código.

## Ausência de auditoria

Este é um projeto independente, que **não passou por auditoria de segurança externa**. Os
algoritmos e parâmetros são padronizados e seguem recomendações atuais, e o código é curto
o bastante para ser lido por inteiro, mas isso não substitui uma revisão profissional.
Avalie esse ponto ao decidir o que confiar à ferramenta.
