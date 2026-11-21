# O formato CSG1

Especificação do formato de mensagem produzido pelo CriptSage, suficiente para escrever
uma implementação compatível em qualquer linguagem.

- [Visão geral](#visão-geral)
- [Codificação do texto](#codificação-do-texto)
- [Representação em texto](#representação-em-texto)
- [Estrutura binária](#estrutura-binária)
- [Tabelas de valores](#tabelas-de-valores)
- [Derivação da chave](#derivação-da-chave)
- [Cifragem](#cifragem)
- [Autenticação](#autenticação)
- [Abertura da mensagem](#abertura-da-mensagem)
- [Validações obrigatórias](#validações-obrigatórias)
- [Vetores de teste oficiais](#vetores-de-teste-oficiais)
- [Compatibilidade entre versões](#compatibilidade-entre-versões)

## Visão geral

Uma mensagem CSG1 é autossuficiente: ela carrega os próprios parâmetros, de modo que quem
recebe precisa apenas da palavra-passe. Nada no cabeçalho é secreto. O sal, o vetor de
inicialização e a identificação dos algoritmos podem ser lidos por qualquer um sem
prejuízo à segurança, que reside inteiramente na chave derivada da palavra-passe.

## Codificação do texto

O **texto em claro** é codificado em **UTF-8** antes da cifragem, sem marca de ordem de
byte e sem terminador. Na abertura, os bytes decifrados são decodificados em UTF-8 em modo
estrito: uma sequência inválida indica mensagem corrompida e deve resultar em recusa, não
em substituição por caracteres de reposição.

A **palavra-passe** segue a mesma codificação, depois da normalização descrita em
[Derivação da chave](#derivação-da-chave).

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
| final | 32 | HMAC-SHA-256 | Em todos os algoritmos menos o 1 |

O **cabeçalho** compreende todos os bytes da posição 0 até o fim do vetor de
inicialização: 35 bytes no GCM, 39 nos demais. Esse bloco inteiro é autenticado.

## Tabelas de valores

### Algoritmo (byte 1)

| Valor | Algoritmo | Vetor | Bits do PBKDF2 | Subchaves | Autenticação |
|---:|---|---:|---:|---|---|
| 1 | AES-256-GCM | 12 | 256 | uso direto | Etiqueta GCM de 128 bits |
| 2 | AES-256-CBC com PKCS#7 | 16 | 512 | fatiamento | HMAC-SHA-256 ao final |
| 3 | AES-256-CTR | 16 | 512 | fatiamento | HMAC-SHA-256 ao final |
| 4 | AES-256-CBC com PKCS#7 | 16 | 256 | HKDF-SHA-256 | HMAC-SHA-256 ao final |
| 5 | AES-256-CTR | 16 | 256 | HKDF-SHA-256 | HMAC-SHA-256 ao final |

Os valores **2 e 3 são históricos**. Eles pedem 512 bits diretos ao PBKDF2, o
que, sobre o SHA-256, obriga a função a executar dois blocos completos: o dobro
do trabalho para quem conhece a palavra-passe, sem dobrar o custo de quem tenta
adivinhá-la, já que o atacante só precisa do primeiro bloco para testar um
candidato. Os valores 4 e 5 corrigem essa assimetria e substituíram os
anteriores a partir da versão 1.1.0.

Uma implementação **deve abrir** mensagens com os valores 2 e 3, porque elas
existem, e **não deve gerar** mensagens novas com eles.

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
   cabeçalho. O tamanho da saída depende do algoritmo: **256 bits** nos algoritmos 1, 4
   e 5, e **512 bits** nos algoritmos históricos 2 e 3.
4. Obter as subchaves, conforme o algoritmo.

**Algoritmo 1.** Os 256 bits são a própria chave AES-256. Não há chave de autenticação,
porque o GCM autentica com a mesma chave.

**Algoritmos 2 e 3, históricos.** Fatiar os 512 bits: bytes 0 a 31 formam a chave AES-256
e bytes 32 a 63 formam a chave HMAC-SHA-256.

**Algoritmos 4 e 5.** Tratar os 256 bits como chave mestra e expandi-la com
**HKDF-SHA-256**, uma vez para cada subchave, sempre com saída de 256 bits:

| Subchave | Parâmetro `salt` | Parâmetro `info` |
|---|---|---|
| Cifragem AES-256 | vazio, zero bytes | `CSG1-enc`, em ASCII |
| Autenticação HMAC-SHA-256 | vazio, zero bytes | `CSG1-mac`, em ASCII |

O `salt` do HKDF é deliberadamente vazio: a aleatoriedade já entrou pelo sal do PBKDF2, e
o que o HKDF acrescenta aqui é apenas a separação de domínio entre as duas subchaves,
feita pelo `info`. Os rótulos são os oito bytes ASCII literais, sem terminador nulo e sem
quebra de linha.

A normalização NFC é obrigatória. Sem ela, a mesma frase digitada em sistemas diferentes
pode produzir sequências de bytes distintas e, portanto, chaves distintas. Convém também
zerar os bytes intermediários na memória assim que as chaves forem importadas. Em
JavaScript, note que apenas os vetores de bytes podem ser zerados: o texto da
palavra-passe, sendo uma cadeia imutável, permanece na memória até a coleta de lixo.

## Cifragem

### Algoritmo 1, AES-256-GCM

O cabeçalho é passado como dado adicional autenticado (AAD). A etiqueta de 128 bits
produzida pelo GCM é anexada ao texto cifrado, como é usual nas bibliotecas que
implementam o modo.

### Algoritmos 2 e 4, AES-256-CBC com HMAC

O texto em claro recebe preenchimento PKCS#7 até completar um múltiplo de 16 bytes e é
cifrado em modo CBC. Em seguida, calcula-se o HMAC-SHA-256 sobre a concatenação do
cabeçalho com o texto cifrado, usando a chave de autenticação. O resultado de 32 bytes é
anexado ao final.

A diferença entre os dois está apenas na origem das chaves, descrita em
[Derivação da chave](#derivação-da-chave): o algoritmo 2 as fatia de 512 bits do PBKDF2, e
o 4 as expande por HKDF a partir de 256 bits.

### Algoritmos 3 e 5, AES-256-CTR com HMAC

Idênticos aos anteriores, trocando o modo CBC pelo CTR. Como o CTR é um modo de fluxo, não
há preenchimento: o texto cifrado tem exatamente o tamanho do texto em claro. O vetor de
16 bytes é o bloco contador inicial, e os 64 bits menos significativos servem de contador,
o que basta para qualquer mensagem de texto sem risco de retorno do contador ao início.

Em todos esses casos adota-se a ordem cifrar e depois autenticar, que é a recomendada.

## Autenticação

O cabeçalho é sempre autenticado, em todos os algoritmos. Isso impede que um atacante
altere o número de repetições, troque o algoritmo ou substitua o sal para induzir a vítima
a uma operação mais fraca.

**Escopo exato, byte a byte.** O que entra no cálculo são apenas os bytes binários, nunca
o texto do prefixo:

| Algoritmo | O que é autenticado |
|---|---|
| 1 | `additionalData` do GCM recebe o cabeçalho inteiro, 35 bytes: versão, algoritmo, derivação, repetições, sal e vetor. O texto cifrado entra pela própria operação. |
| 2, 3, 4 e 5 | O HMAC-SHA-256 é calculado sobre a concatenação do cabeçalho de 39 bytes com o texto cifrado, nessa ordem. |

O prefixo textual `CSG1:` **não participa** de nenhum dos dois cálculos. Ele é um rótulo
de leitura, aplicado depois da codificação em Base64url, e removido antes da decodificação.
O byte de versão, dentro do cabeçalho autenticado, é a referência autoritativa da versão
do formato.

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
- o número de repetições estiver fora do intervalo aceito, de **100.000 a 10.000.000**,
  limite que evita tanto parâmetros fracos quanto uma negação de serviço pela simples
  leitura de uma mensagem forjada. A validação acontece **antes** de qualquer chamada à
  Web Crypto API, de modo que um cabeçalho forjado com bilhões de repetições é descartado
  sem consumir tempo de processamento. O piso de 100.000 não exclui nenhuma mensagem
  legítima: o menor valor que a aplicação já produziu é 210.000, do PBKDF2-SHA-512 no
  custo padrão;
- o corpo for menor que o mínimo do algoritmo, somado aos 32 bytes do HMAC quando houver;
- no modo CBC, o texto cifrado não for múltiplo de 16 bytes.

## Vetores de teste oficiais

Todos os blocos abaixo cifram o **mesmo texto** com a **mesma palavra-passe**:

- Texto em claro: `Mensagem de conformidade do CriptSage. Ação, çedilha, emoji 🔐`
- Palavra-passe: `Chuva de Pedra no Telhado Çãé`

Como o sal e o vetor de inicialização são sorteados a cada operação, uma implementação
**não reproduz** esses blocos byte a byte. O que ela deve fazer é **abri-los** e recuperar
exatamente o texto acima. É isso que os torna úteis como teste de conformidade.

### Algoritmo 1, AES-256-GCM, PBKDF2-SHA-256, 600.000 repetições

Cabeçalho: `01 01 01 00 09 27 C0`

```
CSG1:AQEBAAknwIiMq3Uggw0vGZ1QFqgB72wcg7QiLioaW_fqJ1dei45LaSKMUZy6mYrCvGUUlbQqTJyxrtKc9N2F-8Nu9g4nDuXbZfw_R_sEXifF-ad7yGEgH39dj-r5C3sNsCAHUPKXDm1eBeqb3eEC3FvMtATeMg
```

### Algoritmo 4, AES-256-CBC com HMAC e HKDF, PBKDF2-SHA-256, 600.000 repetições

Cabeçalho: `01 04 01 00 09 27 C0`

```
CSG1:AQQBAAknwMC_wAWeh-HkrqhG0TiTmt6EZcsD5rpoZIoipPYqcFE8WcUtnuxaecWloIJiXy1KcdWoBvxXfaBa2zpJCVA4II8zZ3Sep5wO3mncPdzcrEtA7XG83Z_2l6Yq9xp5gK6XXiDO9q4oWIEA4zDuQGGKbVTWjOJLYMY04uaaSD37KkHVOezZqavmMdM9ghjLXh6bXQ
```

### Algoritmo 5, AES-256-CTR com HMAC e HKDF, PBKDF2-SHA-512, 420.000 repetições

Cabeçalho: `01 05 02 00 06 68 A0`

```
CSG1:AQUCAAZooC-fQS1sSUJZibGc__rDmVNoZhlh8PrhC63uWBKfJfWxi0t9_e_BCd2zKYm6EP9zCZdJZ6S5bW0cXq3wn5wKn-r_7ZxX7JSdWK9nIxFNN2hnl4LLBLXz54FVrSiQiTYcumnq72HKDt2o3PmLjJTVC0zuXkkOc_0kE5dvg0WEydtDvHL0
```

### Algoritmos históricos, gerados pela versão 1.0.0

Estes blocos usam a derivação antiga, com 512 bits pedidos diretamente ao PBKDF2. Servem
para confirmar que uma implementação continua abrindo mensagens anteriores à versão 1.1.0.

Algoritmo 2, PBKDF2-SHA-256, 600.000 repetições:

```
CSG1:AQIBAAknwF_D4k99PYSCSRuH3Y3cGtM59co-bdhaRE3TaUqOBhv5l6anxnnPciX5j6hx6SPJLSM8JwNFPHEK2eEGqA6jXMBUm__UvxAhm_Me3obX8Qfn2AEjaiUpnK4-QTRMT7CwpuJ4qoe2AsTIVPEMpatR-mMleDw-Yp_xCEnl3hmeNPt_LpB08XDgheAZr1uTxXwplQ
```

Algoritmo 3, PBKDF2-SHA-512, 420.000 repetições:

```
CSG1:AQMCAAZooB5rorE-PAnKrqi3yPiBOrbySF33ouO8rhFiroY_YtJekvypidXdS-KPOcb8bLwQDXYF8OdT8jZjTvFvPkCn9YfivIn3c0u7UCTNPWEIKbwIK0b0vgT8CZfCABIWzQmQOtbIY5YPOMz_XL2FsTIStvYd6iNP7nwSDsaqTUbF1K7-1S_Z
```

### Leitura do cabeçalho

Decodificando qualquer um desses blocos, os sete primeiros bytes se leem assim, tomando o
primeiro vetor como exemplo:

```
01                    versão 1
01                    algoritmo 1, AES-256-GCM
01                    derivação 1, PBKDF2-SHA-256
00 09 27 C0           600.000 repetições, big-endian
```

A partir do oitavo byte vêm os 16 bytes do sal, depois o vetor de inicialização, depois o
texto cifrado e, nos algoritmos de 2 a 5, os 32 bytes do HMAC ao final.

Os testes em `tests/criptsage.test.mjs` abrem todos esses vetores automaticamente, a cada
execução da integração contínua.

## Compatibilidade entre versões

O primeiro byte identifica a versão do formato. Uma implementação que encontre uma versão
desconhecida deve recusar a mensagem de maneira explícita, em vez de tentar interpretá-la.

Se um dia houver um CSG2, com outra função de derivação ou outra disposição dos campos, as
mensagens antigas continuarão sendo reconhecidas pelo byte de versão, e o prefixo em texto
passará a ser `CSG2:`.
