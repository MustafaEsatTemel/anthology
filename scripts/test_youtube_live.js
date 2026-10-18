#!/usr/bin/env node
// Explicit network test; never count ytId / HTTP 200 HTML as playable media.
const fs = require('fs');
const { execFile } = require('child_process');
const provider = require('../providers/youtube_dizifilm.js');

if (!process.argv.includes('--live')) {
    console.error('Usage: node scripts/test_youtube_live.js --live [YouTube video ID]');
    process.exit(2);
}
const args = process.argv.slice(2).filter(x => x !== '--live');
const targets = args.length ? args.map(id => ({ id, type: 'movie' })) : [
    { id: 'aqz-KE-bpKQ', type: 'movie' },
    { id: 'youtube:tv:34587:1:1', type: 'series' },
    { id: 'youtube:movie:38794', type: 'movie' }
];
const originalFetch = global.fetch;
let requests = [];
global.fetch = async function (url, options) {
    const entry = { host: new URL(url).hostname, path: new URL(url).pathname, status: null };
    // Signed query strings, API keys and media URLs are never written to reports.
    if (entry.host.endsWith('googlevideo.com')) entry.path = '(media)';
    requests.push(entry);
    try {
        const response = await originalFetch(url, options);
        entry.status = response.status;
        entry.contentType = response.headers.get('content-type');
        if (entry.path.endsWith('/player')) {
            entry.client = JSON.parse(options.body).context.client.clientName;
            const read = response.json.bind(response);
            response.json = async function () {
                const data = await read();
                entry.playability = data.playabilityStatus?.status;
                entry.reason = data.playabilityStatus?.reason;
                entry.hasHls = !!data.streamingData?.hlsManifestUrl;
                entry.muxedFormats = (data.streamingData?.formats || []).map(f => ({ itag: f.itag, height: f.height, direct: !!f.url }));
                return data;
            };
        }
        return response;
    } catch (error) {
        entry.error = error.name;
        throw error;
    }
};
function probe(stream) {
    return new Promise(resolve => {
        const headers = Object.entries(stream.headers || {}).map(([key, value]) => key + ': ' + value + '\r\n').join('');
        execFile('ffprobe', ['-v', 'error', '-rw_timeout', '7000000', '-analyzeduration', '3000000', '-probesize', '2000000',
            '-headers', headers, '-show_entries', 'stream=codec_type,codec_name,width,height', '-of', 'json', stream.url],
        { timeout: 15000, maxBuffer: 1024 * 1024 }, (err, stdout) => {
            if (err) return resolve({ ok: false, error: err.code === 'ENOENT' ? 'ffprobe missing' : 'media probe failed or timed out' });
            try {
                const tracks = JSON.parse(stdout).streams || [];
                resolve({ ok: tracks.some(t => t.codec_type === 'video') && tracks.some(t => t.codec_type === 'audio'), tracks });
            } catch (_) { resolve({ ok: false, error: 'invalid ffprobe output' }); }
        });
    });
}
(async function () {
    const report = { date: new Date().toISOString(), runtime: process.version, devicePlaybackTested: false, targets: [] };
    for (const target of targets) {
        requests = [];
        const start = Date.now();
        const streams = await provider.getStreams(target);
        const elapsedMs = Date.now() - start;
        const direct = streams.filter(s => s.url);
        const result = { target, elapsedMs, requests, embedCount: streams.filter(s => s.ytId).length, media: [] };
        for (const stream of direct) result.media.push({ title: stream.description, format: stream.format, quality: stream.quality, probe: await probe(stream) });
        result.ok = elapsedMs < 9500 && result.media.some(s => s.probe.ok);
        report.targets.push(result);
        console.log(JSON.stringify(result, null, 2));
    }
    fs.mkdirSync('docs', { recursive: true });
    fs.writeFileSync('docs/youtube-local-results.json', JSON.stringify(report, null, 2) + '\n');
    if (report.targets.some(t => !t.ok)) process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
