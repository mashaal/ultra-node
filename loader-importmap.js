// src/config.ts
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ImportMap } from '@jspm/import-map';
var root = fileURLToPath(`file://${process.cwd()}`);
var cacheMap = /* @__PURE__ */ new Map();
var nodeImportMapPath = join(root, 'node.importmap');
var cache = join(root, '.cache');
var map = existsSync(nodeImportMapPath)
  ? JSON.parse(readFileSync(nodeImportMapPath, { encoding: 'utf8' }))
  : {};
var importmap = new ImportMap({ rootUrl: import.meta.url, map });

// src/utils.ts
import {
  existsSync as existsSync3,
  mkdirSync,
  writeFileSync as writeFileSync2,
} from 'node:fs';
import { dirname, join as join2 } from 'node:path';
import { parseUrlPkg } from '@jspm/generator';

// src/parser.ts
import { existsSync as existsSync2, writeFileSync } from 'node:fs';

// src/constants.ts
var IS_DEBUGGING = true;

// src/logger.ts
var logger = ({ file, isLogging = false }) => ({
  debug: (msg, ...args) => {
    if (!isLogging) return;
    if (args) console.debug(`jspm:[${file}]: ${msg}`, ...args);
    else console.debug(`jspm:[${file}]: ${msg}`);
  },
  error: (msg, ...args) => {
    if (args) console.error(`jspm:[${file}]: ${msg}`, ...args);
    else console.error(`jspm:[${file}]: ${msg}`);
  },
});

// src/parser.ts
var log = logger({ file: 'parser', isLogging: IS_DEBUGGING });
var parseNodeModuleCachePath = async (modulePath, cachePath) => {
  log.debug('parseNodeModuleCachePath', cachePath, modulePath);
  if (existsSync2(cachePath)) return cachePath;
  try {
    const resp = await fetch(modulePath);
    if (!resp.ok) throw Error(`404: Module not found: ${modulePath}`);
    const code = await resp.text();
    ensureFileSync(cachePath);
    writeFileSync(cachePath, code);
    return cachePath;
  } catch (err) {
    log.error(`parseNodeModuleCachePath: Failed in parsing module ${err}`);
    return cachePath;
  }
};

// src/utils.ts
var log2 = logger({ file: 'loader', isLogging: IS_DEBUGGING });
var ensureDirSync = (dirPath) => {
  if (existsSync3(dirPath)) return;
  const parentDir = dirname(dirPath);
  if (parentDir !== dirPath) ensureDirSync(parentDir);
  mkdirSync(dirPath);
};
var ensureFileSync = (path) => {
  const dirPath = dirname(path);
  if (!existsSync3(dirPath)) ensureDirSync(dirPath);
  try {
    writeFileSync2(path, '', { flag: 'wx' });
  } catch {
    log2.error(`ensureDirSync: Failed in creating ${path}`);
  }
};
var checkIfNodeOrFileProtocol = (modulePath) => {
  const { protocol = '' } = new URL(modulePath);
  const isNode = protocol === 'node:';
  const isFile = protocol === 'file:';
  return isNode || isFile;
};
var resolveModulePath = (specifier, cacheMapPath) => {
  const modulePath = importmap.resolve(specifier, cacheMapPath);
  log2.debug('resolveModulePath:', { modulePath });
  return modulePath;
};
var resolveNodeModuleCachePath = async (modulePath) => {
  try {
    const moduleMetadata = await parseUrlPkg(modulePath);
    const name = moduleMetadata?.pkg?.name;
    const version = moduleMetadata?.pkg?.version;
    const moduleFile = modulePath.split('/').reverse()[0] || '';
    const nodeModuleCachePath = join2(cache, `${name}@${version}`, moduleFile);
    log2.debug('resolveNodeModuleCachePath:', { nodeModuleCachePath });
    return nodeModuleCachePath;
  } catch (err) {
    log2.error('resolveNodeModuleCachePath:', err);
    return;
  }
};
var resolveParsedModulePath = async (modulePath, nodeModuleCachePath) => {
  try {
    const parsedNodeModuleCachePath = await parseNodeModuleCachePath(
      modulePath,
      nodeModuleCachePath
    );
    log2.debug('resolveParsedModulePath:', {
      nodeModuleCachePath,
      parsedNodeModuleCachePath,
    });
    return parsedNodeModuleCachePath;
  } catch (err) {
    log2.error('resolveParsedModulePath:', err);
    return;
  }
};

// src/loader.ts
var resolve = async (specifier, { parentURL }, nextResolve) => {
  if (!parentURL || !nodeImportMapPath || specifier == 'esbuild')
    return nextResolve(specifier);
  const cacheMapPath = cacheMap.get(parentURL) || parentURL;
  const modulePath = resolveModulePath(specifier, cacheMapPath);
  const isNodeOrFileProtocol = checkIfNodeOrFileProtocol(modulePath);
  if (isNodeOrFileProtocol) return nextResolve(specifier);
  const nodeModuleCachePath = await resolveNodeModuleCachePath(modulePath);
  if (!nodeModuleCachePath) return nextResolve(specifier);
  cacheMap.set(`file://${nodeModuleCachePath}`, modulePath);
  const parsedNodeModuleCachePath = await resolveParsedModulePath(
    modulePath,
    nodeModuleCachePath
  );
  if (!parsedNodeModuleCachePath) return nextResolve(specifier);
  return nextResolve(parsedNodeModuleCachePath);
};
export { resolve };
