// T10.1: nenhum segredo no código. Confere os arquivos versionados (git ls-files):
//   - nenhum .env versionado, só .env.example;
//   - nenhum texto com cara de credencial (token do GitHub, chave da AWS, chave privada,
//     URL de banco com usuário e senha, chave de API "live");
//   - no .env.example, as variáveis de segredo ficam vazias (só o nome).
// Uso: node scripts/segredos.mjs  → sai com 1 e lista os achados, se houver.
// O nome do arquivo é conferido sobre a lista do Git, antes e independente da leitura: um .env
// versionado e apagado da cópia ainda é achado (R19 QA do #363). Um arquivo que não dá para ler
// (que não seja o apagado) também faz a varredura falhar. Submódulos (gitlinks) são pulados.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Padrões de credencial. Cada um tem um nome para a mensagem de erro. */
export const PADROES = [
  { nome: 'token do GitHub', re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})\b/ },
  // AKIA: chave fixa; ASIA: chave temporária (#364).
  { nome: 'chave de acesso da AWS', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  // Inclui a encriptada (PKCS#8) e a PGP (#364).
  { nome: 'chave privada', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED |PGP )?PRIVATE KEY(?: BLOCK)?-----/ },
  { nome: 'chave do Google', re: /\bAIza[0-9A-Za-z_-]{35}(?![0-9A-Za-z_-])/ },
  { nome: 'token do npm', re: /\bnpm_[A-Za-z0-9]{36}\b/ },
  // Chaves de LLM (Anthropic, OpenAI): com tamanho mínimo, para "sk-" curto em texto não contar.
  { nome: 'chave de LLM', re: /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{32,}/ },
  { nome: 'webhook do Discord', re: /https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/ },
  { nome: 'webhook do Slack', re: /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/]+/ },
  // Usuário e senha de exemplo entre <> (como <usuario>:<senha>) não contam: são só o formato.
  { nome: 'URL de banco com senha', re: /\b(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis):\/\/[^\s:/@'"<>]+:[^\s@'"<>]+@/ },
  { nome: 'chave de API live', re: /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/ },
  { nome: 'token do Slack', re: /\bxox[abposr]-[A-Za-z0-9-]{10,}\b/ },
];

/** Nomes de variável que guardam segredo: no .env.example, o valor fica vazio. */
const NOME_DE_SEGREDO = /(SECRET|SEGREDO|TOKEN|SENHA|PASSWORD|CHAVE|KEY|MONGO_URL)/i;

/** Arquivos que não se leem: imagens, fontes e o lock (só hashes de pacotes). */
const IGNORAR = /\.(png|jpe?g|gif|webp|ico|woff2?)$|(^|\/)package-lock\.json$/;

/** Arquivos que podem levar um segredo dentro e que a varredura não abre: viram achado (#364). */
const FECHADOS = /\.(zip|pdf|7z|rar|tar|tgz|gz)$/i;

/** Confere só o nome do arquivo versionado: nenhum .env, fora o .env.example. */
export function conferirNome(caminho) {
  const nome = caminho.split('/').at(-1);
  return /^\.env(\..+)?$/.test(nome) && nome !== '.env.example' ? [`${caminho}: arquivo .env versionado; só o .env.example entra no Git`] : [];
}

/** Confere o conteúdo de um arquivo. Devolve a lista de achados ("arquivo:linha: motivo"). */
export function conferirConteudo(caminho, texto) {
  const achados = [];
  const nome = caminho.split('/').at(-1);
  for (const [i, linha] of texto.split(/\r?\n/).entries()) {
    for (const { nome: tipo, re } of PADROES) {
      if (re.test(linha)) achados.push(`${caminho}:${i + 1}: parece ${tipo}`);
    }
    if (nome === '.env.example') {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m && NOME_DE_SEGREDO.test(m[1]) && m[2].trim() !== '') {
        achados.push(`${caminho}:${i + 1}: ${m[1]} tem valor no .env.example; deixe só o nome`);
      }
    }
  }
  return achados;
}

/** Confere um arquivo inteiro: o nome e o conteúdo. */
export function conferirArquivo(caminho, texto) {
  return [...conferirNome(caminho), ...conferirConteudo(caminho, texto)];
}

/** Confere o .gitignore: .env precisa estar ignorado. */
export function conferirGitignore(texto) {
  return texto.split(/\r?\n/).some((l) => /^\/?\.env(\*|\.\*)?$/.test(l.trim())) ? [] : ['.gitignore: falta ignorar o .env'];
}

/**
 * Lê um arquivo versionado para a varredura. Só o arquivo apagado na cópia de trabalho (ENOENT) é
 * pulado; qualquer outro erro de leitura vira achado, para a varredura falhar fechada e não passar
 * calada por um arquivo que ela não leu (checklist de autorrevisão, item 4).
 */
export function lerParaConferir(caminho, ler) {
  try {
    return { texto: ler(caminho) };
  } catch (erro) {
    if (erro?.code === 'ENOENT') return { pular: true };
    // Só o código do erro vai para o log: uma mensagem pode trazer texto do arquivo (#364).
    return { achado: `${caminho}: não deu para ler (${erro?.code ?? 'erro sem código'}); confira à mão` };
  }
}

/** As entradas do índice (`git ls-files -s -z`), com o modo, sem os submódulos (gitlinks, modo 160000). */
export function entradasDoIndice(saida) {
  return saida
    .split('\0')
    .filter(Boolean)
    .map((linha) => linha.match(/^(\d+) [0-9a-f]+ \d+\t(.+)$/s))
    .filter((m) => m && m[1] !== '160000')
    .map((m) => ({ modo: m[1], caminho: m[2] }));
}

/** Só os caminhos das entradas do índice. */
export function arquivosDoIndice(saida) {
  return entradasDoIndice(saida).map((e) => e.caminho);
}

export function conferirRepositorio(raiz = process.cwd()) {
  const entradas = entradasDoIndice(execFileSync('git', ['ls-files', '-s', '-z'], { cwd: raiz, encoding: 'utf8' }));
  const ilegiveis = [];
  const gitignore = lerParaConferir('.gitignore', (c) => readFileSync(`${raiz}/${c}`, 'utf8'));
  const achados = gitignore.texto !== undefined ? conferirGitignore(gitignore.texto) : ['.gitignore: não existe; ele precisa ignorar o .env'];
  for (const { modo, caminho } of entradas) {
    // O nome vale sempre, mesmo se o arquivo for pulado ou não puder ser lido.
    achados.push(...conferirNome(caminho));
    // Link simbólico (120000): no Git, o conteúdo é só o caminho do alvo. É tratado à parte e não
    // segue o alvo; assim um alvo que não existe não vira um ENOENT pulado calado (#364).
    if (modo === '120000') continue;
    if (FECHADOS.test(caminho)) {
      ilegiveis.push(`${caminho}: arquivo compactado ou PDF versionado; a varredura não abre, confira à mão`);
      continue;
    }
    if (IGNORAR.test(caminho)) continue;
    const lido = lerParaConferir(caminho, (c) => readFileSync(`${raiz}/${c}`, 'utf8'));
    if (lido.pular) continue; // apagado na cópia de trabalho; o nome já foi conferido
    if (lido.achado) {
      ilegiveis.push(lido.achado);
      continue;
    }
    achados.push(...conferirConteudo(caminho, lido.texto));
  }
  return { arquivos: entradas.length, achados, ilegiveis };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { arquivos, achados, ilegiveis } = conferirRepositorio();
  if (achados.length) {
    console.error(`Possíveis segredos em ${achados.length} lugar(es):\n${achados.join('\n')}`);
    console.error('Troque por variável de ambiente (nome no .env.example). Se já foi para o Git, avise o responsável: a credencial precisa ser revogada (SECURITY.md).');
  }
  if (ilegiveis.length) console.error(`Não deu para ler ${ilegiveis.length} arquivo(s); confira à mão:\n${ilegiveis.join('\n')}`);
  if (achados.length || ilegiveis.length) process.exit(1);
  console.log(`Nenhum segredo encontrado em ${arquivos} arquivos versionados.`);
}
