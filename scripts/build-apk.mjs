import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, copyFile, writeFile, readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { unzipSync } from 'fflate';

const root = fileURLToPath(new URL('../', import.meta.url));
const cloudTools = '/workspace/.winy-tools';
const env = { ...process.env };
const windows = process.platform === 'win32';
if (!env.JAVA_HOME && existsSync(`${cloudTools}/jdk-21.0.13+9`)) env.JAVA_HOME = `${cloudTools}/jdk-21.0.13+9`;
if (!env.ANDROID_HOME && !env.ANDROID_SDK_ROOT && existsSync(`${cloudTools}/android-sdk`)) env.ANDROID_HOME = `${cloudTools}/android-sdk`;
const sdk = env.ANDROID_HOME || env.ANDROID_SDK_ROOT;
if (!sdk) throw new Error('Instala Android SDK 35 y configura ANDROID_HOME. Consulta docs/android.md.');
env.GRADLE_USER_HOME ||= existsSync(cloudTools) ? `${cloudTools}/gradle-cache` : path.join(root, '.local/gradle-cache');
env.ANDROID_USER_HOME ||= path.join(root, '.local/android-user');
const trust = `${cloudTools}/java-cacerts`;
if (existsSync(trust)) env.JAVA_TOOL_OPTIONS = (env.JAVA_TOOL_OPTIONS || '') + ` -Djavax.net.ssl.trustStore=${trust} -Djavax.net.ssl.trustStorePassword=changeit`;
if (env.HTTPS_PROXY) {
  const proxy = new URL(env.HTTPS_PROXY);
  if (!proxy.username && !proxy.password) {
    env.JAVA_TOOL_OPTIONS = (env.JAVA_TOOL_OPTIONS || '') + ` -Dhttps.proxyHost=${proxy.hostname} -Dhttps.proxyPort=${proxy.port || '80'} -Dhttp.proxyHost=${proxy.hostname} -Dhttp.proxyPort=${proxy.port || '80'}`;
  }
}
function run(command, args) {
  const r = spawnSync(command, args, { cwd: root, env, stdio: 'inherit', shell: windows && command.endsWith('.bat') });
  if (r.error) throw r.error;
  if (r.status !== 0) process.exit(r.status || 1);
}
await mkdir(path.join(root, '.local'), { recursive: true });
await mkdir(env.ANDROID_USER_HOME, { recursive: true });
const key = path.join(root, '.local/winy-debug.keystore');
if (!existsSync(key)) {
  // Standard Android debug key, for local test builds only. Keep it for updates.
  const keytool = env.JAVA_HOME ? path.join(env.JAVA_HOME, 'bin', windows ? 'keytool.exe' : 'keytool') : 'keytool';
  run(keytool, ['-genkeypair', '-noprompt', '-keystore', key, '-storepass', 'android', '-alias', 'androiddebugkey', '-keypass', 'android', '-dname', 'CN=Android Debug,O=Android,C=US', '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000']);
}
const gradle = env.WINY_GRADLE || (existsSync(`${cloudTools}/gradle-8.9/bin/gradle`) ? `${cloudTools}/gradle-8.9/bin/gradle` : path.join(root, 'android', windows ? 'gradlew.bat' : 'gradlew'));
run(gradle, ['--no-daemon', '-p', 'android', 'assembleDebug', 'lintDebug']);
const built = path.join(root, 'android/app/build/outputs/apk/debug/app-debug.apk');
const bytes = await readFile(built);
const files = unzipSync(bytes);
let count = 0;
async function verifyAssets(dir, relative = '') {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const name = relative + item.name;
    if (item.isDirectory()) await verifyAssets(path.join(dir, item.name), name + '/');
    else {
      const expected = await readFile(path.join(dir, item.name));
      const packaged = files['assets/' + name];
      if (!packaged || !expected.equals(Buffer.from(packaged))) throw new Error(`El APK no contiene el recurso original: ${name}`);
      count++;
    }
  }
}
await verifyAssets(path.join(root, 'web'));
const signer = path.join(sdk, 'build-tools/35.0.0', windows ? 'apksigner.bat' : 'apksigner');
run(signer, ['verify', '--verbose', built]);
const dist = path.join(root, 'dist'); await mkdir(dist, { recursive: true });
const target = path.join(dist, 'winy-debug.apk');
await copyFile(built, target);
const hash = createHash('sha256').update(bytes).digest('hex');
await writeFile(path.join(dist, 'winy-debug.apk.sha256'), `${hash}  winy-debug.apk\n`);
console.log(`APK listo: ${target}\nRecursos web verificados: ${count}\nSHA-256: ${hash}`);
