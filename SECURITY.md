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
| 1.1.x | sim |
| 1.0.x | não, atualize recarregando a página |

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
- **A área de transferência.** Ao copiar o texto aberto, ele passa para a área de
  transferência do sistema, que outros programas podem ler e que, em vários sistemas,
  guarda histórico. A aplicação avisa sobre isso ao exibir o resultado, mas não tem como
  controlar o que acontece depois.
- **Serviços do teclado e do navegador.** Os campos de palavra-passe e de mensagem têm
  corretor ortográfico, correção automática e preenchimento automático desligados, para
  não enviar texto em claro a corretores em nuvem ou a dicionários de teclados móveis.
  Ainda assim, um teclado de terceiros no celular enxerga o que é digitado, e isso está
  fora do alcance de qualquer página.
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
- **Derivação em dois estágios** nos algoritmos 4 e 5: o PBKDF2 produz uma chave mestra de
  256 bits e o HKDF-SHA-256 a expande em duas subchaves independentes, com rótulos de
  separação de domínio distintos. Isso evita a assimetria de pedir 512 bits diretos ao
  PBKDF2, que custaria dois blocos a quem conhece a palavra-passe e apenas um a quem tenta
  adivinhá-la. Os algoritmos 2 e 3, que tinham esse comportamento, permanecem apenas para
  abrir mensagens anteriores à versão 1.1.0 e não são usados em mensagens novas.
- **Autenticação antes da decifragem** nos modos CBC e CTR, com comparação de tempo
  constante.
- **Validação do cabeçalho antes de qualquer operação criptográfica**, incluindo um
  intervalo obrigatório de 100.000 a 10.000.000 repetições. Um bloco forjado com bilhões
  de repetições é descartado sem consumir tempo de processamento, e um forjado com
  repetições insuficientes é recusado em vez de processado em silêncio.
- **Política de segurança de conteúdo estrita**, declarada na própria página, com
  `default-src 'none'` e `connect-src 'none'`. Os blocos de estilo e de script são
  autorizados pelo resumo SHA-256 do seu conteúdo, e não por `unsafe-inline`. Em
  consequência, mesmo que código estranho fosse injetado na página, ele não teria como
  enviar nada para fora. Uma verificação na integração contínua recalcula os resumos e
  impede que uma política defasada chegue ao ar.
- **Normalização Unicode NFC** da palavra-passe, para que o mesmo texto sempre produza a
  mesma chave.
- **Recusa indistinguível**: palavra-passe errada e mensagem adulterada devolvem a mesma
  resposta.

Toda a criptografia vem da Web Crypto API do navegador. Não há implementação de primitiva
criptográfica escrita neste projeto.

O formato está [documentado em detalhe](docs/FORMATO.md), de modo que a especificação pode
ser revisada de maneira independente do código.

## Decisões assumidas, com os seus custos

Três escolhas de projeto têm desvantagens conhecidas. Documentá-las é mais honesto que
omiti-las.

**O PBKDF2 não exige memória.** Diferente do Argon2id, ele não é resistente a memória, o
que o torna mais suscetível à aceleração em placas de vídeo e em hardware dedicado. A
escolha decorre da premissa de zero dependências: o Argon2id não existe na Web Crypto API
e exigiria embutir uma biblioteca, o que ampliaria a superfície de ataque e o tamanho do
arquivo. O que compensa essa limitação é a palavra-passe: uma frase de quatro ou cinco
palavras incomuns torna a aceleração em hardware irrelevante, e a interface insiste nisso.

**Os modos CBC e CTR aumentam a base de código.** Eles trazem detalhes delicados que o
GCM não tem, como o preenchimento PKCS#7, o gerenciamento do contador e a conferência do
MAC em separado. O GCM é o padrão e atende a praticamente todos os casos. Os outros dois
permanecem por interoperabilidade e por preferência de quem queira cifrar e autenticar com
chaves separadas. Se um dia a manutenção pesar mais que esse benefício, a remoção será
feita em uma revisão do formato, preservando a abertura das mensagens antigas.

**A memória do JavaScript não pode ser limpa por completo.** Os vetores de bytes
intermediários da derivação são zerados assim que as chaves são importadas. O texto da
palavra-passe e o da mensagem, porém, são cadeias imutáveis, que permanecem na memória até
a coleta de lixo do navegador. Nenhuma página consegue contornar isso.

## Ausência de auditoria

Este é um projeto independente, que **não passou por auditoria de segurança externa
formal**. Os algoritmos e parâmetros são padronizados e seguem recomendações atuais, o
formato está especificado byte a byte, os vetores de teste são públicos e o código é curto
o bastante para ser lido por inteiro. Nada disso substitui uma revisão profissional.
Avalie esse ponto ao decidir o que confiar à ferramenta.
