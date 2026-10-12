# Como contribuir

Obrigado pelo interesse no CriptSage. Correções, sugestões e melhorias são bem-vindas.

## Antes de começar

- **Falhas de segurança não vão para as issues.** Siga a
  [política de segurança](SECURITY.md) e escreva para contato@klippelbit.app.br.
- **Mudanças grandes merecem uma conversa antes.** Abra uma issue descrevendo a ideia, para
  evitar trabalho que talvez não se encaixe no projeto.
- **A linguagem do projeto é o português do Brasil**, tanto na interface quanto nos
  comentários, nomes de variáveis em português já existentes, commits e documentação.

## Preparando o ambiente

Não há dependências para instalar.

```bash
git clone https://github.com/miqueiasklippel/criptsage.git
cd criptsage
python3 -m http.server 8000
```

Para rodar os testes basta o Node.js 18 ou superior:

```bash
node tests/criptsage.test.mjs
```

## Padrões do código

**Arquivo único.** Marcação, estilo e script moram no `index.html`. Essa decisão é
deliberada: permite auditar a aplicação inteira de uma vez e faz o arquivo salvo funcionar
sozinho. Propostas que dividam o projeto em muitos arquivos ou acrescentem uma etapa de
compilação provavelmente não serão aceitas.

**Sem dependências de execução.** A criptografia vem da Web Crypto API do navegador.
Bibliotecas externas só entram com uma justificativa forte, e nunca para funções
criptográficas.

**Estilo.** Dois espaços de indentação, aspas simples no JavaScript, ponto e vírgula ao
fim das instruções. O `.editorconfig` cuida do essencial.

**Acessibilidade.** Todo controle precisa de rótulo, foco visível e operação pelo teclado.
A animação deve respeitar `prefers-reduced-motion`.

**Compatibilidade do formato.** Mensagens já cifradas precisam continuar abrindo. Qualquer
mudança no formato exige um novo byte de versão e uma atualização da
[especificação](docs/FORMATO.md).

## Mexendo na criptografia

Alterações no núcleo criptográfico recebem a atenção mais rigorosa.

- Explique o raciocínio na descrição do pull request, com referência à recomendação ou ao
  padrão que embasa a mudança.
- Acrescente testes que cubram o comportamento novo.
- Não altere constantes existentes de maneira que quebre mensagens antigas.
- Nunca introduza um modo sem autenticação.

## Enviando a alteração

1. Crie um ramo a partir de `main`, com nome descritivo.
2. Faça os testes passarem: `node tests/criptsage.test.mjs`.
3. Escreva mensagens de commit no imperativo, explicando o motivo, por exemplo
   `corrige a leitura do cabeçalho em mensagens truncadas`.
4. Abra o pull request descrevendo o que muda, por que muda e como testar.

Se a alteração for visual, uma captura de tela antes e depois ajuda bastante.

## Código de conduta

Trate as outras pessoas com cordialidade e boa-fé. Discussões técnicas são sobre o código,
nunca sobre quem o escreveu. Comportamento hostil ou desrespeitoso não é bem-vindo.
