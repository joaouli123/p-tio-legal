import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';

import worker from './dist/server/index.js';

const rootDir = dirname(fileURLToPath(import.meta.url));
const clientDir = join(rootDir, 'dist', 'client');
const port = Number.parseInt(process.env.PORT || '3000', 10);
const host = process.env.HOST || '0.0.0.0';

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function buildRequestUrl(request) {
  const protocol = request.headers['x-forwarded-proto'] || 'http';
  const hostHeader = request.headers.host || `127.0.0.1:${port}`;
  return new URL(request.url || '/', `${protocol}://${hostHeader}`);
}

async function resolveStaticPath(pathname) {
  const decodedPath = decodeURIComponent(pathname);
  const relativePath = decodedPath.replace(/^\/+/, '');

  if (!relativePath) {
    return null;
  }

  const normalizedPath = normalize(relativePath);
  const filePath = join(clientDir, normalizedPath);
  const clientRootWithSep = clientDir.endsWith(sep) ? clientDir : `${clientDir}${sep}`;

  if (!filePath.startsWith(clientRootWithSep)) {
    return null;
  }

  try {
    await access(filePath);
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      return null;
    }
    return { filePath, fileStats };
  } catch {
    return null;
  }
}

async function serveStaticFile(request, response, pathname) {
  const staticFile = await resolveStaticPath(pathname);

  if (!staticFile) {
    return false;
  }

  const extension = extname(staticFile.filePath).toLowerCase();
  response.setHeader('Content-Length', String(staticFile.fileStats.size));
  response.setHeader('Content-Type', contentTypes[extension] || 'application/octet-stream');
  response.statusCode = 200;

  if (request.method === 'HEAD') {
    response.end();
    return true;
  }

  await new Promise((resolve, reject) => {
    const fileStream = createReadStream(staticFile.filePath);
    fileStream.on('error', reject);
    response.on('close', resolve);
    fileStream.pipe(response);
  });

  return true;
}

function createRequest(request) {
  const url = buildRequestUrl(request);
  const headers = new Headers();

  for (const [key, value] of Object.entries(request.headers)) {
    if (value === undefined) {
      continue;
    }
    headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  return new Request(url, {
    method: request.method,
    headers,
    body: hasBody ? Readable.toWeb(request) : undefined,
    duplex: hasBody ? 'half' : undefined
  });
}

async function writeResponse(nodeResponse, webResponse) {
  nodeResponse.statusCode = webResponse.status;

  webResponse.headers.forEach((value, key) => {
    nodeResponse.setHeader(key, value);
  });

  if (!webResponse.body) {
    nodeResponse.end();
    return;
  }

  const bodyStream = Readable.fromWeb(webResponse.body);
  await new Promise((resolve, reject) => {
    bodyStream.on('error', reject);
    nodeResponse.on('close', resolve);
    bodyStream.pipe(nodeResponse);
  });
}

const server = createServer(async (request, response) => {
  try {
    const url = buildRequestUrl(request);

    if (await serveStaticFile(request, response, url.pathname)) {
      return;
    }

    const webRequest = createRequest(request);
    const webResponse = await worker.fetch(webRequest, process.env, {
      passThroughOnException() {},
      waitUntil() {}
    });

    await writeResponse(response, webResponse);
  } catch (error) {
    console.error(error);
    if (!response.headersSent) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    response.end('Internal Server Error');
  }
});

server.listen(port, host, () => {
  console.log(`Railway server listening on http://${host}:${port}`);
});