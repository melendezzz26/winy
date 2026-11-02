import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
for (const dir of ['web', 'web/core', 'server', 'scripts']) {
  for (const name of (await readdir(dir)).filter(name => /\.(m?js)$/.test(name))) {
    const result = spawnSync(process.execPath, ['--check', `${dir}/${name}`], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status || 1);
  }
}
console.log('Sintaxis verificada en la interfaz, API y scripts.');
