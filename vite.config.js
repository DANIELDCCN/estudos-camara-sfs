// Configuração do Vite (servidor de desenvolvimento e build).
import { defineConfig } from 'vite';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

const pacote = JSON.parse(readFileSync('./package.json', 'utf8'));

/** Lista os arquivos da pasta public/ (manifest, ícones). */
function listar(dir, base = dir) {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    return statSync(caminho).isDirectory() ? listar(caminho, base) : [relative(base, caminho).split('\\').join('/')];
  });
}

/**
 * Gera dist/sw.js com a lista exata de arquivos do build (precache).
 * A versão é um hash do conteúdo: qualquer mudança no app gera um Service Worker
 * novo, e o app mostra "Nova versão disponível".
 */
function servicoOffline() {
  return {
    name: 'service-worker-offline',
    apply: 'build',
    enforce: 'post',
    generateBundle(_opcoes, bundle) {
      const hash = createHash('sha256');
      const doBuild = Object.values(bundle).map((item) => {
        hash.update(item.fileName);
        hash.update(item.type === 'chunk' ? item.code : item.source);
        return item.fileName;
      });
      const publicos = listar('public');
      for (const f of publicos) { hash.update(f); hash.update(readFileSync(join('public', f))); }
      const arquivos = ['./', ...[...doBuild, ...publicos].filter((f) => f !== 'sw.js').sort().map((f) => `./${f}`)];
      const versao = `${pacote.version}-${hash.digest('hex').slice(0, 10)}`;
      const codigo = readFileSync('src/sw.js', 'utf8')
        .replace("'__VERSAO__'", JSON.stringify(versao))
        .replace('__ARQUIVOS__', JSON.stringify(arquivos, null, 2));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: codigo });
    },
  };
}

export default defineConfig({
  base: './', // caminhos relativos: funciona em qualquer pasta (GitHub Pages, Codeberg, local)
  define: { __VERSAO_APP__: JSON.stringify(pacote.version) },
  build: { target: 'es2020', assetsInlineLimit: 0, sourcemap: false },
  server: { host: '127.0.0.1', port: 5173 },
  preview: { host: '127.0.0.1', port: 4173 },
  plugins: [servicoOffline()],
  test: { include: ['tests/unit/**/*.test.js'], environment: 'node' },
});
