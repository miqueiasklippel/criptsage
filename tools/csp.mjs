#!/usr/bin/env node
/*
 * Gera e confere a Content-Security-Policy do index.html.
 *
 *   node tools/csp.mjs              grava a política na meta tag
 *   node tools/csp.mjs --verificar  apenas confere, e falha se estiver defasada
 *
 * O CriptSage é um arquivo único, com estilo e script embutidos. Para que a
 * política possa dispensar 'unsafe-inline', ela declara o resumo SHA-256 de
 * cada um desses blocos, que é o que o navegador calcula para autorizá-los.
 * Qualquer alteração no script ou no estilo muda o resumo, e a verificação
 * abaixo roda na integração contínua para que uma política defasada nunca
 * chegue ao ar. Uma política defasada deixaria a página sem estilo e sem
 * script, ou seja, inutilizável.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ARQUIVO = join(RAIZ, 'index.html');
const MARCA_INICIO = '<meta http-equiv="Content-Security-Policy" content="';
const MARCA_FIM = '">';

/* Extrai o conteúdo exato de um bloco, que é o que o navegador submete ao
   resumo: tudo entre a tag de abertura e a de fechamento, sem alteração. */
function conteudoUnico(html, tag) {
  const abre = new RegExp(`<${tag}(\\s[^>]*)?>`, 'g');
  const inicios = [...html.matchAll(abre)];
  if (inicios.length !== 1) {
    throw new Error(`esperava exatamente um <${tag}>, encontrei ${inicios.length}`);
  }
  const de = inicios[0].index + inicios[0][0].length;
  const ate = html.indexOf(`</${tag}>`, de);
  if (ate === -1) throw new Error(`</${tag}> não encontrado`);
  return html.slice(de, ate);
}

function resumo(texto) {
  return "'sha256-" + createHash('sha256').update(texto, 'utf8').digest('base64') + "'";
}

function montarPolitica(html) {
  const script = resumo(conteudoUnico(html, 'script'));
  const estilo = resumo(conteudoUnico(html, 'style'));
  return [
    "default-src 'none'",
    `script-src ${script}`,
    `style-src ${estilo} https://fonts.googleapis.com`,
    'font-src https://fonts.gstatic.com',
    "img-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
    "connect-src 'none'",
    "form-action 'none'",
    "base-uri 'none'"
  ].join('; ');
}

const html = readFileSync(ARQUIVO, 'utf8');
const esperada = montarPolitica(html);

const de = html.indexOf(MARCA_INICIO);
if (de === -1) {
  console.error('ERRO: a meta tag da Content-Security-Policy não existe no index.html.');
  process.exit(1);
}
const inicioValor = de + MARCA_INICIO.length;
const fimValor = html.indexOf(MARCA_FIM, inicioValor);
const atual = html.slice(inicioValor, fimValor);

if (process.argv.includes('--verificar')) {
  if (atual === esperada) {
    console.log('Content-Security-Policy conferida: os resumos correspondem ao conteúdo atual.');
    process.exit(0);
  }
  console.error('ERRO: a Content-Security-Policy está defasada.');
  console.error('  no arquivo: ' + atual);
  console.error('  esperada:   ' + esperada);
  console.error('\nRode "node tools/csp.mjs" para atualizá-la.');
  process.exit(1);
}

if (atual === esperada) {
  console.log('Nada a fazer: a política já está correta.');
  process.exit(0);
}
writeFileSync(ARQUIVO, html.slice(0, inicioValor) + esperada + html.slice(fimValor), 'utf8');
console.log('Content-Security-Policy atualizada:');
console.log('  ' + esperada);
