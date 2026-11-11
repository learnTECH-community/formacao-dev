// T10.1: nenhum segredo no código. Confere os arquivos versionados (git ls-files):
//   - nenhum .env versionado, só .env.example;
//   - nenhum texto com cara de credencial (token do GitHub, chave da AWS, chave privada,
//     URL de banco com usuário e senha, chave de API "live");
//   - no .env.example, as variáveis de segredo ficam vazias (só o nome).
// Uso: node scripts/segredos.mjs  → sai com 1 e lista os achados, se houver.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Padrões de credencial. Cada um tem um nome para a mensagem de erro. */
export const PADROES = [
  { nome: 'token do GitHub', re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})\b/ },
  { nome: 'chave de acesso da AWS', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { nome: 'chave privada', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  // Usuário e senha de exemplo entre <> (como <usuario>:<senha>) não contam: são só o formato.
  { nome: 'URL de banco com senha', re: /\b(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis):\/\/[^\s:/@'"<>]+:[^\s@'"<>]+@/ },
  { nome: 'chave de API live', re: /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/ },
  { nome: 'token do Slack', re: /\bxox[abposr]-[A-Za-z0-9-]{10,}\b/ },
];

/** Nomes de variável que guardam segredo: no .env.example, o valor fica vazio. */
const NOME_DE_SEGREDO = /(SECRET|SEGREDO|TOKEN|SENHA|PASSWORD|CHAVE|KEY|MONGO_URL)/i;

/** Arquivos que não se leem: binários e o lock (só hashes de pacotes). */
const IGNORAR = /\.(png|jpe?g|gif|webp|ico|woff2?|pdf|zip)$|(^|\/)package-lock\.json$/;

/** Confere um arquivo. Devolve a lista de achados ("arquivo:linha: motivo"). */
export function conferirArquivo(caminho, texto) {
  const achados = [];
  const nome = caminho.split('/').at(-1);
  if (/^\.env(\..+)?$/.test(nome) && nome !== '.env.example') {
    achados.push(`${caminho}: arquivo .env versionado; só o .env.example entra no Git`);
  }
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

/** Confere o .gitignore: .env precisa estar ignorado. */
export function conferirGitignore(texto) {
  return texto.split(/\r?\n/).some((l) => /^\/?\.env(\*|\.\*)?$/.test(l.trim())) ? [] : ['.gitignore: falta ignorar o .env'];
}

export function conferirRepositorio(raiz = process.cwd()) {
  const arquivos = execFileSync('git', ['ls-files', '-z'], { cwd: raiz, encoding: 'utf8' }).split('\0').filter(Boolean);
  const achados = conferirGitignore(readFileSync(`${raiz}/.gitignore`, 'utf8'));
  for (const caminho of arquivos) {
    if (IGNORAR.test(caminho)) continue;
    let texto;
    try {
      texto = readFileSync(`${raiz}/${caminho}`, 'utf8');
    } catch {
      continue; // apagado na cópia de trabalho
    }
    achados.push(...conferirArquivo(caminho, texto));
  }
  return { arquivos: arquivos.length, achados };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { arquivos, achados } = conferirRepositorio();
  if (achados.length) {
    console.error(`Possíveis segredos em ${achados.length} lugar(es):\n${achados.join('\n')}`);
    console.error('Troque por variável de ambiente (nome no .env.example). Se já foi para o Git, avise o responsável: a credencial precisa ser revogada (SECURITY.md).');
    process.exit(1);
  }
  console.log(`Nenhum segredo encontrado em ${arquivos} arquivos versionados.`);
}
