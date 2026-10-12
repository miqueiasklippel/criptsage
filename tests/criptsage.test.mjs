/*
 * Testes do núcleo criptográfico do CriptSage.
 *
 *   node tests/criptsage.test.mjs
 *
 * O núcleo é extraído do próprio index.html e avaliado, de modo que o teste
 * exercita exatamente o código que vai para o ar, e não uma cópia que pode
 * divergir com o tempo. Não há dependências externas: basta o Node.js 18 ou
 * superior, que já traz a Web Crypto API e o TextEncoder globalmente.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..');

/* ------------------------------------------------------------------ */
/* Extração do núcleo                                                  */
/* ------------------------------------------------------------------ */

function carregarNucleo() {
  const html = readFileSync(join(RAIZ, 'index.html'), 'utf8');
  const inicio = html.indexOf('const CriptSage = (() => {');
  if (inicio === -1) {
    throw new Error('o núcleo criptográfico não foi encontrado no index.html');
  }
  const fim = html.indexOf('\n})();', inicio);
  if (fim === -1) {
    throw new Error('o fim do núcleo criptográfico não foi encontrado no index.html');
  }
  const fonte = html.slice(inicio, fim + '\n})();'.length);
  // eslint-disable-next-line no-eval
  return (0, eval)(fonte + '\nCriptSage;');
}

const CriptSage = carregarNucleo();

/* ------------------------------------------------------------------ */
/* Mínimo de infraestrutura de teste                                   */
/* ------------------------------------------------------------------ */

let passaram = 0;
const falhas = [];

async function teste(nome, corpo) {
  try {
    await corpo();
    passaram++;
    process.stdout.write(`  \u001b[32m✓\u001b[0m ${nome}\n`);
  } catch (erro) {
    falhas.push({ nome, erro });
    process.stdout.write(`  \u001b[31m✗\u001b[0m ${nome}\n`);
    process.stdout.write(`      ${erro && erro.message ? erro.message : erro}\n`);
  }
}

function conferir(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

function igual(obtido, esperado, mensagem) {
  if (obtido !== esperado) {
    throw new Error(`${mensagem}\n      obtido:   ${JSON.stringify(obtido)}\n      esperado: ${JSON.stringify(esperado)}`);
  }
}

async function recusa(promessa, tipos, mensagem) {
  try {
    await promessa;
  } catch (erro) {
    const aceito = tipos.some((T) => erro instanceof T);
    conferir(aceito, `${mensagem} — recusou, mas com ${erro.constructor.name}`);
    return;
  }
  throw new Error(`${mensagem} — não houve recusa`);
}

/* ------------------------------------------------------------------ */
/* Dados dos testes                                                    */
/* ------------------------------------------------------------------ */

const SENHA = 'Chuva de Pedra no Telhado Çãé';

const MENSAGENS = [
  ['texto com acentos e emoji', 'Olá, mundo! Ação, coração, çedilha 🐝🔐'],
  ['um único caractere', 'a'],
  ['texto longo', 'x'.repeat(100000)],
  ['linhas e tabulações', 'primeira\nsegunda\tterceira\r\nquarta'],
  ['caracteres fora do plano básico', '𝔘𝔫𝔦𝔠𝔬𝔡𝔢 𝖊𝖝𝖙𝖊𝖓𝖉𝖎𝖉𝖔 👨‍👩‍👧‍👦']
];

const ALGORITMOS = [
  [1, 'AES-256-GCM'],
  [2, 'AES-256-CBC com HMAC'],
  [3, 'AES-256-CTR com HMAC']
];

const DERIVACOES = [
  [1, 'PBKDF2-SHA-256'],
  [2, 'PBKDF2-SHA-512']
];

/* Custo 1 em todos os testes: o objetivo é a correção, não o tempo de espera. */
const CUSTO = 1;

/* ------------------------------------------------------------------ */
/* Execução                                                            */
/* ------------------------------------------------------------------ */

console.log('\nCriptSage — testes do núcleo criptográfico\n');

console.log('Ida e volta, em todas as combinações');
for (const [alg, nomeAlg] of ALGORITMOS) {
  for (const [kdf, nomeKdf] of DERIVACOES) {
    for (const [rotulo, mensagem] of MENSAGENS) {
      await teste(`${nomeAlg} · ${nomeKdf} · ${rotulo}`, async () => {
        const selada = await CriptSage.encrypt(mensagem, SENHA, { alg, kdf, cost: CUSTO });

        conferir(selada.text.startsWith('CSG1:'), 'a mensagem deveria começar com CSG1:');
        conferir(/^CSG1:[A-Za-z0-9_-]+$/.test(selada.text), 'o corpo deveria ser Base64url sem preenchimento');

        const aberta = await CriptSage.decrypt(selada.text, SENHA);
        igual(aberta.text, mensagem, 'o texto aberto difere do original');
        igual(aberta.info.alg, selada.info.alg, 'o algoritmo lido difere do usado');
        igual(aberta.info.iterations, selada.info.iterations, 'as repetições lidas diferem das usadas');
      });
    }
  }
}

console.log('\nRecusas');
for (const [alg, nomeAlg] of ALGORITMOS) {
  await teste(`${nomeAlg} · palavra-passe errada é recusada`, async () => {
    const selada = await CriptSage.encrypt('mensagem de teste', SENHA, { alg, kdf: 1, cost: CUSTO });
    await recusa(
      CriptSage.decrypt(selada.text, SENHA + 'x'),
      [CriptSage.AuthError],
      'uma palavra-passe errada deveria ser recusada'
    );
  });

  await teste(`${nomeAlg} · byte alterado no corpo é detectado`, async () => {
    const selada = await CriptSage.encrypt('mensagem de teste um pouco mais longa', SENHA, { alg, kdf: 1, cost: CUSTO });
    const i = Math.floor(selada.text.length * 0.8);
    const letra = selada.text[i] === 'A' ? 'B' : 'A';
    const adulterada = selada.text.slice(0, i) + letra + selada.text.slice(i + 1);
    await recusa(
      CriptSage.decrypt(adulterada, SENHA),
      [CriptSage.AuthError, CriptSage.FormatError],
      'uma alteração no texto cifrado deveria ser detectada'
    );
  });

  await teste(`${nomeAlg} · byte alterado no cabeçalho é detectado`, async () => {
    const selada = await CriptSage.encrypt('mensagem de teste', SENHA, { alg, kdf: 1, cost: CUSTO });
    // posição 10 do Base64url cai dentro do sal, que faz parte do cabeçalho
    const i = 'CSG1:'.length + 10;
    const letra = selada.text[i] === 'A' ? 'B' : 'A';
    const adulterada = selada.text.slice(0, i) + letra + selada.text.slice(i + 1);
    await recusa(
      CriptSage.decrypt(adulterada, SENHA),
      [CriptSage.AuthError, CriptSage.FormatError],
      'uma alteração no cabeçalho deveria ser detectada'
    );
  });
}

console.log('\nFormato');

await teste('o prefixo CSG1: é opcional na abertura', async () => {
  const selada = await CriptSage.encrypt('sem prefixo', SENHA, { alg: 1, kdf: 1, cost: CUSTO });
  const aberta = await CriptSage.decrypt(selada.text.slice('CSG1:'.length), SENHA);
  igual(aberta.text, 'sem prefixo', 'a mensagem sem prefixo deveria abrir normalmente');
});

await teste('espaços e quebras de linha são descartados', async () => {
  const selada = await CriptSage.encrypt('com quebras', SENHA, { alg: 1, kdf: 1, cost: CUSTO });
  const sujo = '  ' + selada.text.slice(0, 25) + '\n  ' + selada.text.slice(25) + '\n\t';
  const aberta = await CriptSage.decrypt(sujo, SENHA);
  igual(aberta.text, 'com quebras', 'quebras de linha não deveriam atrapalhar');
});

await teste('texto que não é do formato é recusado', async () => {
  for (const lixo of ['', 'isto não é uma mensagem', 'CSG1:###', 'CSG1:AQ']) {
    await recusa(
      CriptSage.decrypt(lixo, SENHA),
      [CriptSage.FormatError],
      `"${lixo}" deveria ser recusado como formato inválido`
    );
  }
});

await teste('inspect lê o cabeçalho sem a palavra-passe', async () => {
  const selada = await CriptSage.encrypt('qualquer coisa', SENHA, { alg: 3, kdf: 2, cost: 2 });
  const lido = CriptSage.inspect(selada.text);
  igual(lido.algId, 3, 'o algoritmo lido está errado');
  igual(lido.kdfId, 2, 'a derivação lida está errada');
  igual(lido.iterations, 210000 * 2, 'o número de repetições lido está errado');
});

await teste('versão de formato desconhecida é recusada', async () => {
  // o primeiro byte vale 1; trocando-o por 2, a mensagem deve ser rejeitada
  const selada = await CriptSage.encrypt('mensagem', SENHA, { alg: 1, kdf: 1, cost: CUSTO });
  const b64 = selada.text.slice('CSG1:'.length);
  const bin = Buffer.from(b64.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  bin[0] = 2;
  const forjada = bin.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await recusa(
    CriptSage.decrypt(forjada, SENHA),
    [CriptSage.FormatError],
    'uma versão desconhecida deveria ser recusada'
  );
});

console.log('\nDerivação da chave');

await teste('as formas NFC e NFD da mesma frase abrem a mensagem', async () => {
  const comAcento = 'pão de açúcar à beça';
  const selada = await CriptSage.encrypt('normalização', comAcento.normalize('NFC'), { alg: 1, kdf: 1, cost: CUSTO });
  const aberta = await CriptSage.decrypt(selada.text, comAcento.normalize('NFD'));
  igual(aberta.text, 'normalização', 'NFC e NFD deveriam produzir a mesma chave');
});

await teste('o sal muda a cada cifragem', async () => {
  const a = await CriptSage.encrypt('mesma mensagem', SENHA, { alg: 1, kdf: 1, cost: CUSTO });
  const b = await CriptSage.encrypt('mesma mensagem', SENHA, { alg: 1, kdf: 1, cost: CUSTO });
  conferir(a.text !== b.text, 'duas cifragens da mesma mensagem não deveriam coincidir');
});

await teste('o custo multiplica as repetições', async () => {
  for (const [custo, esperado] of [[1, 600000], [2, 1200000], [4, 2400000]]) {
    const selada = await CriptSage.encrypt('custo', SENHA, { alg: 1, kdf: 1, cost: custo });
    igual(selada.info.iterations, esperado, `o custo ${custo} deveria dar ${esperado} repetições`);
  }
});

await teste('o tamanho do CTR é igual ao do texto em claro', async () => {
  const texto = 'z'.repeat(1000);
  const bytes = new TextEncoder().encode(texto).length;
  const selada = await CriptSage.encrypt(texto, SENHA, { alg: 3, kdf: 1, cost: CUSTO });
  // cabeçalho de 39 bytes mais o HMAC de 32
  igual(selada.info.bytes, bytes + 39 + 32, 'o modo CTR não deveria acrescentar preenchimento');
});

/* ------------------------------------------------------------------ */
/* Resultado                                                           */
/* ------------------------------------------------------------------ */

console.log('');
if (falhas.length === 0) {
  console.log(`\u001b[32m${passaram} testes aprovados.\u001b[0m\n`);
  process.exit(0);
} else {
  console.log(`\u001b[31m${falhas.length} de ${passaram + falhas.length} testes falharam.\u001b[0m\n`);
  process.exit(1);
}
