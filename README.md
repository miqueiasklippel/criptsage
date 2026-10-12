<div align="center">

<img src="assets/icone.svg" alt="" width="120">

# CriptSage

**Mensagens que só a sua palavra-passe abre.**

[![Licença MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-eead2d)](LICENSE)
[![Testes](https://github.com/miqueiasklippel/criptsage/actions/workflows/testes.yml/badge.svg)](https://github.com/miqueiasklippel/criptsage/actions/workflows/testes.yml)
[![Publicação](https://github.com/miqueiasklippel/criptsage/actions/workflows/publicar.yml/badge.svg)](https://github.com/miqueiasklippel/criptsage/actions/workflows/publicar.yml)

[**Abrir o CriptSage**](https://criptsage.klippelbit.app.br/) &nbsp;·&nbsp;
[Como funciona](#como-funciona) &nbsp;·&nbsp;
[Formato CSG1](docs/FORMATO.md) &nbsp;·&nbsp;
[Segurança](SECURITY.md)

</div>

---

O CriptSage é um web app que cifra e decifra textos no próprio navegador. Você escreve
a mensagem, escolhe uma palavra-passe e recebe um bloco que ninguém lê sem essa chave.
Usa AES-256 com derivação por PBKDF2, e nada é enviado a servidor algum. Depois que a
página carrega, funciona até sem internet. Para abrir, basta o bloco e a palavra-passe.

## Sumário

- [O que ele faz](#o-que-ele-faz)
- [Como funciona](#como-funciona)
- [Opções de criptografia](#opções-de-criptografia)
- [O formato CSG1](#o-formato-csg1)
- [Rodando localmente](#rodando-localmente)
- [Publicando a sua própria cópia](#publicando-a-sua-própria-cópia)
- [Testes](#testes)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Decisões de projeto](#decisões-de-projeto)
- [Limitações conhecidas](#limitações-conhecidas)
- [Contribuindo](#contribuindo)
- [Licença](#licença)

## O que ele faz

- **Cifra e decifra textos** com uma palavra-passe escolhida por você.
- **Funciona inteiramente no navegador**, pela Web Crypto API nativa. Não há servidor,
  não há conta, não há coleta de dados.
- **Abre sem conexão.** Na primeira visita a aplicação se guarda no navegador. Depois
  disso ela abre offline e pode ser instalada como aplicativo pelo menu do navegador.
- **Reconhece os parâmetros sozinho.** Quem recebe a mensagem precisa apenas do bloco
  de texto e da palavra-passe: algoritmo, derivação e custo viajam dentro do bloco.
- **Detecta adulteração.** Qualquer byte alterado no caminho faz a abertura ser recusada.
- **Feito para o celular**, e igualmente confortável no computador.

## Como funciona

São quatro passos, nesta ordem, a cada operação de cifragem.

1. **A frase é padronizada.** A palavra-passe passa por normalização Unicode (NFC), de
   modo que acentos digitados em teclados ou sistemas diferentes produzam a mesma chave.
2. **Entra o sal.** Dezesseis bytes sorteados na hora se juntam à frase. Por isso a mesma
   mensagem, com a mesma palavra-passe, gera um resultado diferente a cada vez, e tabelas
   de senhas pré-calculadas não servem de nada.
3. **A chave é forjada.** O PBKDF2 repete a mistura centenas de milhares de vezes até
   chegar a uma chave de 256 bits. Para quem sabe a frase é um instante; para quem tenta
   adivinhar, cada tentativa custa o mesmo trabalho.
4. **O texto é cifrado e selado.** O AES-256 embaralha a mensagem, e uma autenticação
   cobre também o cabeçalho. Palavra-passe errada e texto adulterado recebem a mesma
   recusa, sem revelar qual dos dois ocorreu.

```
palavra-passe ─┐
               ├─→ PBKDF2 (600.000 repetições) ─→ chave AES de 256 bits ─┐
sal (16 bytes) ─┘                                                        │
                                                                         ▼
                                            mensagem ─────────→ AES-256 cifra e assina
                                                                         │
                                                                         ▼
                                                                   CSG1:AQEBAA…
```

A palavra-passe nunca é gravada nem transmitida: ela existe apenas enquanto a chave está
sendo calculada, dentro do seu navegador, e os bytes intermediários são zerados em
seguida.

## Opções de criptografia

Quem quiser pode trocar o algoritmo, a função de derivação e o custo. O padrão atende
bem à maioria dos casos.

| Algoritmo | Modo | Autenticação |
|---|---|---|
| **AES-256-GCM** (padrão) | Contador com autenticação integrada | Etiqueta de 128 bits, calculada junto com a cifragem |
| **AES-256-CBC** | Blocos encadeados, com preenchimento PKCS#7 | HMAC-SHA-256 com chave própria, no esquema cifrar e depois autenticar |
| **AES-256-CTR** | Contador | HMAC-SHA-256 com chave própria |

| Derivação | Repetições no custo padrão |
|---|---|
| **PBKDF2-SHA-256** (padrão) | 600.000 |
| **PBKDF2-SHA-512** | 210.000 |

Esses números seguem as recomendações da OWASP em vigor. O custo pode ser multiplicado
por dois ou por quatro, deixando cada tentativa de adivinhação proporcionalmente mais
cara, à custa de um pouco mais de espera na hora de abrir a mensagem.

Nos três algoritmos, a autenticação cobre também o cabeçalho (versão, algoritmo,
derivação, repetições, sal e vetor de inicialização), de modo que nenhum parâmetro pode
ser trocado por quem intercepte a mensagem.

## O formato CSG1

O resultado começa com `CSG1:` e segue em Base64 seguro para endereços da web. A
[documentação completa do formato](docs/FORMATO.md) descreve byte a byte o que há dentro,
o suficiente para escrever uma implementação compatível em qualquer linguagem.

```
CSG1:AQEBAAknwMd-mqTkM-kYkfl1EXJvZGFww6k...
     └┬┘│ │ └──┬──┘ └────┬────┘ └───┬───┘
      │ │ │    │         │          └─ vetor de inicialização e texto cifrado
      │ │ │    │         └─ sal de 16 bytes
      │ │ │    └─ número de repetições
      │ │ └─ derivação
      │ └─ algoritmo
      └─ versão do formato
```

## Rodando localmente

O projeto não tem etapa de compilação nem dependências para instalar. Qualquer servidor
estático serve.

```bash
git clone https://github.com/miqueiasklippel/criptsage.git
cd criptsage

python3 -m http.server 8000
# em seguida, abra http://localhost:8000
```

Abrir o `index.html` com dois cliques, pelo endereço `file://`, também funciona para
cifrar e decifrar. O que não funciona assim é o service worker, que exige `http://localhost`
ou HTTPS. Por isso, para experimentar o uso offline, prefira o servidor local.

> A Web Crypto API só está disponível em contextos seguros. Na prática, isso significa
> HTTPS, `http://localhost` ou um arquivo aberto diretamente do disco. Em um servidor sem
> HTTPS a aplicação avisa na tela em vez de falhar em silêncio.

## Publicando a sua própria cópia

O repositório já traz o fluxo de publicação no GitHub Pages. Depois de enviar o código:

1. Abra **Settings → Pages** no repositório.
2. Em **Source**, escolha **GitHub Actions**.
3. Envie qualquer alteração para o ramo `main`. A publicação acontece sozinha.

Também é possível hospedar em qualquer outro lugar que sirva arquivos estáticos, já que
não há nada para compilar. Se a aplicação ficar numa subpasta, nada precisa ser ajustado:
todos os caminhos são relativos.

## Testes

Os testes exercitam o núcleo criptográfico extraído do próprio `index.html`, de modo que
testam exatamente o código que vai para o ar. Não há dependências externas; basta o
Node.js 18 ou superior.

```bash
node tests/criptsage.test.mjs
```

São verificadas as dezoito combinações de algoritmo, derivação e tipo de mensagem, com
acentos, emoji, texto de um único caractere e texto longo. Cada combinação confirma que o
texto volta igual, que uma palavra-passe errada é recusada, que um byte alterado é
detectado e que a normalização Unicode faz as formas NFC e NFD produzirem a mesma chave.

## Estrutura do projeto

```
criptsage/
├── index.html                  aplicação e site, em arquivo único
├── sw.js                       service worker, responsável pelo uso offline
├── manifest.webmanifest        permite instalar como aplicativo
├── assets/                     ícones e imagem para compartilhamento
├── docs/
│   └── FORMATO.md              especificação do formato CSG1
├── tests/
│   └── criptsage.test.mjs      testes do núcleo criptográfico
└── .github/workflows/          testes e publicação automáticos
```

## Decisões de projeto

**Arquivo único.** Marcação, estilo e script moram no mesmo `index.html`. Para uma
ferramenta de criptografia isso é uma vantagem de segurança, e não apenas de comodidade:
qualquer pessoa consegue ler o arquivo inteiro e verificar que não há chamada de rede
escondida, e o arquivo salvo no disco continua funcionando por conta própria.

**Sem bibliotecas de criptografia.** Toda a criptografia vem da Web Crypto API, que é
implementada pelo próprio navegador, auditada e acelerada por hardware. Nenhuma
implementação de AES escrita em JavaScript entra no caminho.

**Sem dependências, sem compilação.** Não há `node_modules`, empacotador ou etapa de
build. O que está no repositório é exatamente o que roda no navegador.

**Formato próprio e documentado.** O CSG1 carrega os seus próprios parâmetros, o que
dispensa combinar configurações entre quem envia e quem recebe. Ele é simples o bastante
para ser reimplementado em uma tarde, e está [documentado em detalhe](docs/FORMATO.md).

**Autenticação sempre.** Nenhum dos modos oferecidos permite cifrar sem autenticar. Nos
modos CBC e CTR, o HMAC é conferido antes de qualquer tentativa de decifrar.

## Limitações conhecidas

- **Não existe recuperação.** Sem a palavra-passe, a mensagem não pode ser aberta por
  ninguém. Não há senha mestra nem porta dos fundos.
- **O tamanho não é escondido.** O comprimento do texto cifrado revela o tamanho
  aproximado da mensagem original.
- **Não é compatível com PGP.** O CSG1 é um formato próprio e não conversa com o GnuPG
  nem com outras ferramentas de PGP.
- **Sem auditoria externa.** Os algoritmos e parâmetros são padronizados e seguem
  recomendações atuais, mas este é um projeto independente, que não passou por auditoria
  de terceiros.
- **O medidor de força é uma estimativa.** Ele dá uma noção útil, e não uma medida exata
  de resistência.
- **As fontes vêm do Google Fonts.** É a única requisição externa da página, feita apenas
  na primeira visita e depois guardada pelo service worker. Para eliminar até ela, troque
  a declaração de fontes no `index.html` por uma pilha de fontes do sistema.

## Contribuindo

Sugestões, relatos de problema e melhorias são bem-vindos. O
[guia de contribuição](CONTRIBUTING.md) explica como preparar uma alteração, e a
[política de segurança](SECURITY.md) descreve como relatar uma falha em particular.

## Licença

Distribuído sob a [licença MIT](LICENSE). Use, modifique e redistribua à vontade,
inclusive comercialmente, mantendo o aviso de direitos autorais.

---

<div align="center">
<sub>CriptSage · Desenvolvido por M. A. Klippel · <a href="mailto:contato@klippelbit.app.br">contato@klippelbit.app.br</a></sub>
</div>
