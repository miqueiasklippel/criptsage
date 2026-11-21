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

/* Suites oferecidas para cifrar. As de identificador 2 e 3 só abrem mensagens
   antigas e por isso não entram aqui. */
const ALGORITMOS = [
  [1, 'AES-256-GCM'],
  [4, 'AES-256-CBC com HMAC'],
  [5, 'AES-256-CTR com HMAC']
];

/* Blocos gerados pela versão 1.0.0, antes da mudança na derivação de chaves.
   Precisam continuar abrindo para sempre: são a garantia de que nenhuma
   mensagem já cifrada por alguém se torne ilegível. */
const TEXTO_HISTORICO = 'Mensagem de conformidade do CriptSage. Ação, çedilha, emoji \u{1F510}';
const BLOCOS_HISTORICOS = [
  ['AES-256-GCM, PBKDF2-SHA-256, 600.000 repetições', 1, 600000,
   'CSG1:AQEBAAknwOVIwfWulxVcpXnTz0uCn3bFemp0MGCBIdt5v1kQjsz0luNiGMRbH0OCbGI2Uj9LeZovdC6Csvh38npH2JtLnuk5JRRMDEECXsM3inkljNnZcXAVZhNj0WK63GHluGa3Xc9RQolpbtkNzYlriZC8BA'],
  ['AES-256-CBC com HMAC antigo, PBKDF2-SHA-256, 600.000 repetições', 2, 600000,
   'CSG1:AQIBAAknwF_D4k99PYSCSRuH3Y3cGtM59co-bdhaRE3TaUqOBhv5l6anxnnPciX5j6hx6SPJLSM8JwNFPHEK2eEGqA6jXMBUm__UvxAhm_Me3obX8Qfn2AEjaiUpnK4-QTRMT7CwpuJ4qoe2AsTIVPEMpatR-mMleDw-Yp_xCEnl3hmeNPt_LpB08XDgheAZr1uTxXwplQ'],
  ['AES-256-CTR com HMAC antigo, PBKDF2-SHA-512, 420.000 repetições', 3, 420000,
   'CSG1:AQMCAAZooB5rorE-PAnKrqi3yPiBOrbySF33ouO8rhFiroY_YtJekvypidXdS-KPOcb8bLwQDXYF8OdT8jZjTvFvPkCn9YfivIn3c0u7UCTNPWEIKbwIK0b0vgT8CZfCABIWzQmQOtbIY5YPOMz_XL2FsTIStvYd6iNP7nwSDsaqTUbF1K7-1S_Z']
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

console.log('\nCompatibilidade com mensagens já cifradas');

for (const [rotulo, algId, repeticoes, bloco] of BLOCOS_HISTORICOS) {
  await teste(`bloco da v1.0.0 abre: ${rotulo}`, async () => {
    const lido = CriptSage.inspect(bloco);
    igual(lido.algId, algId, 'o identificador de algoritmo lido está errado');
    igual(lido.iterations, repeticoes, 'o número de repetições lido está errado');
    const aberta = await CriptSage.decrypt(bloco, SENHA);
    igual(aberta.text, TEXTO_HISTORICO, 'o texto histórico não voltou igual');
  });
}

await teste('as suites antigas não são oferecidas para cifrar', async () => {
  for (const antiga of [2, 3]) {
    await recusa(
      CriptSage.encrypt('nova mensagem', SENHA, { alg: antiga, kdf: 1, cost: CUSTO }),
      [Error],
      `a suite ${antiga} não deveria aceitar uma mensagem nova`
    );
  }
});

console.log('\nDerivação em dois estágios');

await teste('o HKDF está disponível neste ambiente', async () => {
  conferir(await CriptSage.temHkdf(), 'sem HKDF as suites 4 e 5 cairiam para as antigas');
});

for (const alg of [4, 5]) {
  await teste(`a suite ${alg} grava o identificador novo no cabeçalho`, async () => {
    const selada = await CriptSage.encrypt('duas chaves', SENHA, { alg, kdf: 1, cost: CUSTO });
    igual(CriptSage.inspect(selada.text).algId, alg, 'o cabeçalho não registrou a suite pedida');
  });
}

await teste('as subchaves de cifragem e de autenticação são independentes', async () => {
  /* Reproduz a derivação do app e confirma que os rótulos de separação de
     domínio produzem material distinto a partir da mesma chave mestra. */
  const te = new TextEncoder();
  const salt = new Uint8Array(16).fill(7);
  const base = await crypto.subtle.importKey('raw', te.encode('frase'), 'PBKDF2', false, ['deriveBits']);
  const mestra = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, base, 256));
  const expandir = async (info) => {
    const k = await crypto.subtle.importKey('raw', mestra, 'HKDF', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: te.encode(info) }, k, 256));
  };
  const cifra = await expandir('CSG1-enc');
  const mac = await expandir('CSG1-mac');
  igual(cifra.length, 32, 'a subchave de cifragem deveria ter 32 bytes');
  igual(mac.length, 32, 'a subchave de autenticação deveria ter 32 bytes');
  conferir(!cifra.every((b, i) => b === mac[i]), 'as duas subchaves saíram iguais');
  conferir(!cifra.every((b, i) => b === mestra[i]), 'a subchave de cifragem é a própria chave mestra');
});

console.log('\nLimites do campo de repetições');

/* Reescreve o campo de repetições de um bloco válido e confirma que a recusa
   vem da validação do cabeçalho, antes de qualquer operação criptográfica. */
function forjarRepeticoes(bloco, valor) {
  const b64 = bloco.replace(/^CSG1:/i, '');
  const bin = Buffer.from(b64.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  bin.writeUInt32BE(valor, 3);
  return 'CSG1:' + bin.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

for (const [rotulo, valor] of [['abaixo do piso', 99999], ['zero', 0], ['acima do teto', 10000001], ['o máximo de um uint32', 4294967295]]) {
  await teste(`repetições ${rotulo} são recusadas como formato inválido`, async () => {
    const selada = await CriptSage.encrypt('limites', SENHA, { alg: 1, kdf: 1, cost: CUSTO });
    await recusa(
      CriptSage.decrypt(forjarRepeticoes(selada.text, valor), SENHA),
      [CriptSage.FormatError],
      'um cabeçalho fora da faixa deveria ser recusado antes de derivar a chave'
    );
  });
}

await teste('o piso aceita o menor valor legítimo do app', async () => {
  const selada = await CriptSage.encrypt('piso', SENHA, { alg: 1, kdf: 2, cost: 1 });
  igual(selada.info.iterations, 210000, 'o menor valor legítimo mudou');
  conferir(210000 >= 100000, 'o piso de 100.000 não pode barrar um valor legítimo');
});

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
  const selada = await CriptSage.encrypt('qualquer coisa', SENHA, { alg: 5, kdf: 2, cost: 2 });
  const lido = CriptSage.inspect(selada.text);
  igual(lido.algId, 5, 'o algoritmo lido está errado');
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
  const selada = await CriptSage.encrypt(texto, SENHA, { alg: 5, kdf: 1, cost: CUSTO });
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
