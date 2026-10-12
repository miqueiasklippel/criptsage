# O formato CSG1

Especificação do formato de mensagem produzido pelo CriptSage, suficiente para escrever
uma implementação compatível em qualquer linguagem.

- [Visão geral](#visão-geral)
- [Representação em texto](#representação-em-texto)
- [Estrutura binária](#estrutura-binária)
- [Tabelas de valores](#tabelas-de-valores)
- [Derivação da chave](#derivação-da-chave)
- [Cifragem](#cifragem)
- [Autenticação](#autenticação)
- [Abertura da mensagem](#abertura-da-mensagem)
- [Validações obrigatórias](#validações-obrigatórias)
- [Vetor de exemplo](#vetor-de-exemplo)
- [Compatibilidade entre versões](#compatibilidade-entre-versões)

## Visão geral

Uma mensagem CSG1 é autossuficiente: ela carrega os próprios parâmetros, de modo que quem
recebe precisa apenas da palavra-passe. Nada no cabeçalho é secreto. O sal, o vetor de
inicialização e a identificação dos algoritmos podem ser lidos por qualquer um sem
prejuízo à segurança, que reside inteiramente na chave derivada da palavra-passe.

## Representação em texto

```
CSG1:<dados em Base64url sem preenchimento>
```

O prefixo `CSG1:` identifica o formato e a versão à primeira vista. Ele é uma conveniência
de leitura: o primeiro byte dos dados também guarda a versão, e uma implementação deve
aceitar a mensagem com ou sem o prefixo.

O corpo usa o alfabeto Base64url (`A-Z`, `a-z`, `0-9`, `-`, `_`), sem os sinais `=` de
preenchimento, o que permite colar a mensagem em endereços da web e em campos de texto sem
escapes.

Espaços em branco e quebras de linha devem ser descartados antes da decodificação, já que
aplicativos de mensagem costumam reposicioná-los.

## Estrutura binária

Todos os campos numéricos são big-endian. Nenhum campo é opcional, à exceção do HMAC
final, cuja presença depende do algoritmo.

| Posição | Tamanho | Campo | Observação |
|---:|---:|---|---|
| 0 | 1 | Versão | Sempre `0x01` nesta especificação |
| 1 | 1 | Algoritmo | Veja a tabela abaixo |
| 2 | 1 | Derivação | Veja a tabela abaixo |
| 3 | 4 | Repetições | Inteiro de 32 bits sem sinal |
| 7 | 16 | Sal | Bytes aleatórios, novos a cada mensagem |
| 23 | 12 ou 16 | Vetor de inicialização | 12 bytes no GCM, 16 nos demais |
| 35 ou 39 | variável | Texto cifrado | No GCM inclui a etiqueta de 16 bytes ao final |
| final | 32 | HMAC-SHA-256 | Apenas nos algoritmos 2 e 3 |

O **cabeçalho** compreende todos os bytes da posição 0 até o fim do vetor de
inicialização: 35 bytes no GCM, 39 nos demais. Esse bloco inteiro é autenticado.

## Tabelas de valores

### Algoritmo (byte 1)

| Valor | Algoritmo | Vetor | Bits derivados | Autenticação |
|---:|---|---:|---:|---|
| 1 | AES-256-GCM | 12 | 256 | Etiqueta GCM de 128 bits |
| 2 | AES-256-CBC com PKCS#7 | 16 | 512 | HMAC-SHA-256 ao final |
| 3 | AES-256-CTR | 16 | 512 | HMAC-SHA-256 ao final |

No modo CTR, o vetor de 16 bytes é usado como bloco contador inicial, com os 64 bits menos
significativos servindo de contador.

### Derivação (byte 2)

| Valor | Função | Repetições no custo padrão |
|---:|---|---:|
| 1 | PBKDF2-HMAC-SHA-256 | 600.000 |
| 2 | PBKDF2-HMAC-SHA-512 | 210.000 |

O campo de repetições guarda o valor efetivamente usado, que é o padrão multiplicado pelo
custo escolhido (1, 2 ou 4). Quem abre a mensagem usa o número gravado, e não o padrão.

## Derivação da chave

1. Normalizar a palavra-passe em Unicode NFC.
2. Codificar o resultado em UTF-8.
3. Aplicar o PBKDF2 com o sal, o número de repetições e a função de hash indicados no
   cabeçalho, produzindo 256 bits para o algoritmo 1 e 512 bits para os algoritmos 2 e 3.
4. Dividir o material derivado:
   - bytes 0 a 31: chave de cifragem AES-256;
   - bytes 32 a 63: chave HMAC-SHA-256, apenas nos algoritmos 2 e 3.

A normalização NFC é obrigatória. Sem ela, a mesma frase digitada em sistemas diferentes
pode produzir sequências de bytes distintas e, portanto, chaves distintas. Convém também
zerar os bytes intermediários na memória assim que as chaves forem importadas.

## Cifragem

### Algoritmo 1, AES-256-GCM

O cabeçalho é passado como dado adicional autenticado (AAD). A etiqueta de 128 bits
produzida pelo GCM é anexada ao texto cifrado, como é usual nas bibliotecas que
implementam o modo.

### Algoritmo 2, AES-256-CBC com HMAC

O texto em claro recebe preenchimento PKCS#7 até completar um múltiplo de 16 bytes e é
cifrado em modo CBC. Em seguida, calcula-se o HMAC-SHA-256 sobre a concatenação do
cabeçalho com o texto cifrado, usando a segunda chave derivada. O resultado de 32 bytes é
anexado ao final.

### Algoritmo 3, AES-256-CTR com HMAC

Idêntico ao anterior, trocando o modo CBC pelo CTR. Como o CTR é um modo de fluxo, não há
preenchimento: o texto cifrado tem exatamente o tamanho do texto em claro.

Nos dois casos adota-se a ordem cifrar e depois autenticar, que é a recomendada.

## Autenticação

O cabeçalho é sempre autenticado, nos três algoritmos. Isso impede que um atacante altere
o número de repetições, troque o algoritmo ou substitua o sal para induzir a vítima a uma
operação mais fraca.

A conferência acontece antes de qualquer tentativa de decifrar. Uma implementação correta
devolve a mesma recusa para palavra-passe errada e para mensagem adulterada, sem indicar
qual dos dois ocorreu.

## Abertura da mensagem

1. Descartar espaços em branco e o prefixo `CSG1:`, se presente.
2. Decodificar o Base64url.
3. Validar o cabeçalho conforme a seção seguinte.
4. Derivar as chaves com os parâmetros lidos do cabeçalho.
5. Nos algoritmos 2 e 3, conferir o HMAC sobre tudo menos os 32 bytes finais, em
   comparação de tempo constante. Falhou, recusar.
6. Decifrar. No GCM, a falha de autenticação aparece como erro da própria operação.
7. Decodificar o resultado em UTF-8 em modo estrito. Uma sequência inválida indica
   mensagem corrompida e também deve resultar em recusa.

## Validações obrigatórias

Uma implementação deve recusar a mensagem, sem tentar decifrar, quando:

- o Base64url contiver caracteres fora do alfabeto;
- o tamanho total for menor que o cabeçalho;
- o byte de versão não for `0x01`;
- o algoritmo ou a derivação não estiverem nas tabelas;
- o número de repetições estiver fora do intervalo aceito, de 10.000 a 10.000.000, limite
  que evita tanto parâmetros fracos quanto uma negação de serviço pela simples leitura de
  uma mensagem forjada;
- o corpo for menor que o mínimo do algoritmo, somado aos 32 bytes do HMAC quando houver;
- no modo CBC, o texto cifrado não for múltiplo de 16 bytes.

## Vetor de exemplo

Como o sal e o vetor de inicialização são aleatórios, duas cifragens da mesma mensagem
nunca coincidem. O exemplo abaixo serve para conferir a leitura do cabeçalho.

```
Mensagem : CSG1:AQEBAAknwMd-mqTkM-kYkfl1E...

Bytes decodificados, em hexadecimal:
  01                    versão 1
  01                    algoritmo 1, AES-256-GCM
  01                    derivação 1, PBKDF2-SHA-256
  00 09 27 C0           600.000 repetições
  C7 D7 9A A4 ...       sal, 16 bytes
  ...                   vetor de inicialização, 12 bytes
  ...                   texto cifrado com a etiqueta ao final
```

Para gerar vetores próprios, cifre uma mensagem conhecida na aplicação e confira byte a
byte com a sua implementação. Os testes em `tests/criptsage.test.mjs` fazem exatamente
isso de maneira automatizada.

## Compatibilidade entre versões

O primeiro byte identifica a versão do formato. Uma implementação que encontre uma versão
desconhecida deve recusar a mensagem de maneira explícita, em vez de tentar interpretá-la.

Se um dia houver um CSG2, com outra função de derivação ou outra disposição dos campos, as
mensagens antigas continuarão sendo reconhecidas pelo byte de versão, e o prefixo em texto
passará a ser `CSG2:`.
