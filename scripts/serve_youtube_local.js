#!/usr/bin/env node
// Local preview only: expose the YouTube manifest/bundle, never the repository.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const root = path.resolve(__dirname, '..');
const host = process.argv.includes('--lan') ? '0.0.0.0' : '127.0.0.1';
const port = Number(process.env.PORT || 3001);
const providerPath = '/providers/youtube_dizifilm.js';
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    const pathname = new URL(req.url, 'http://localhost').pathname;
    let content;
    if (pathname === '/manifest.json') {
        const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
        manifest.name = 'Anthology YouTube — Local Test';
        manifest.scrapers = manifest.scrapers.filter(s => s.id === 'youtube_dizifilm');
        content = JSON.stringify(manifest);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
    } else if (pathname === providerPath) {
        content = fs.readFileSync(path.join(root, providerPath));
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else {
        res.writeHead(404); res.end('Not found'); return;
    }
    res.writeHead(200);
    res.end(req.method === 'HEAD' ? undefined : content);
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, host, () => {
    console.log('Local repository: http://127.0.0.1:' + port + '/manifest.json');
    if (host === '0.0.0.0') {
        for (const interfaces of Object.values(os.networkInterfaces())) {
            for (const iface of interfaces || []) {
                if (iface.family === 'IPv4' && !iface.internal) console.log('Device test: http://' + iface.address + ':' + port + '/manifest.json');
            }
        }
    }
    console.log('Only the YouTube manifest and bundle are served. Stop with Ctrl+C.');
});
