const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createSession } = require('../src/youtube_dizifilm/http');
const { resolveYouTubeStreams, parseHlsVariants } = require('../src/youtube_dizifilm/playback');

const ID = 'abcdefghijk';
const BASE = 'https://manifest.googlevideo.com/api/master.m3u8';
const MP4 = 'https://rr1.googlevideo.com/videoplayback?itag=18';
const playlist = '#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXTINF:6,\nhttps://rr1.googlevideo.com/segment.ts\n#EXT-X-ENDLIST\n';
function master(extra = '') {
    return '#EXTM3U\n' + extra + '\n' + [1080, 720, 360].map(h =>
        '#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=1920x' + h + ',FRAME-RATE=25,CODECS="avc1.640028,mp4a.40.2"\n' + h + '.m3u8').join('\n');
}
function response(data, type = 'application/json', status = 200, extra = {}) {
    return { ok: status >= 200 && status < 300, status, headers: { get: name => ({ 'content-type': type, ...extra }[name] || '') },
        json: async () => data, text: async () => String(data), body: { cancel: async () => {} } };
}
function player(sd, status = 'OK') {
    return response({ playabilityStatus: { status }, videoDetails: { videoId: ID, title: 'Test', author: 'Kanal' }, streamingData: sd });
}
function format(height = 360, url = MP4) {
    return { url, height, qualityLabel: height + 'p', fps: 25, mimeType: 'video/mp4; codecs="avc1.42001E, mp4a.40.2"' };
}
async function mocked(fetch, run) {
    const previous = global.fetch;
    global.fetch = fetch;
    try { return await run(); } finally { global.fetch = previous; }
}
function bundle(fetch, extra = {}) {
    const context = vm.createContext({ module: { exports: {} }, require: () => undefined,
        fetch, setTimeout, clearTimeout, ...extra });
    vm.runInContext(fs.readFileSync('providers/youtube_dizifilm.js', 'utf8'), context);
    return context.module.exports;
}
function defaultFetch(url) {
    if (url.includes('config.json')) return response({});
    if (url.includes('/player')) return player({ formats: [format()] });
    if (url.includes('googlevideo.com')) return response('', 'video/mp4', 206);
    throw new Error('Unexpected request: ' + url);
}

test('HLS uses manifest resolution and excludes 4K, 60fps and unsupported codecs', () => {
    const text = master() + '\n#EXT-X-STREAM-INF:RESOLUTION=3840x2160,CODECS="avc1.640033,mp4a.40.2"\n4k.m3u8' +
        '\n#EXT-X-STREAM-INF:RESOLUTION=1920x1080,FRAME-RATE=60,CODECS="avc1.64002a,mp4a.40.2"\n60.m3u8' +
        '\n#EXT-X-STREAM-INF:RESOLUTION=1920x1080,CODECS="av01.0.08M.08,mp4a.40.2"\nav1.m3u8';
    assert.deepEqual(parseHlsVariants(text, BASE).map(v => v.height), [1080, 720, 360]);
});
test('HLS with external audio is not emitted as a silent video child', () => {
    const text = '#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",URI="audio.m3u8"\n' +
        '#EXT-X-STREAM-INF:RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2",AUDIO="a"\nvideo.m3u8';
    assert.deepEqual(parseHlsVariants(text, BASE), []);
});
test('HTML, media playlists without codec metadata, and audio-only manifests do not become HD', () => {
    assert.deepEqual(parseHlsVariants('<html>1080p</html>', BASE), []);
    assert.deepEqual(parseHlsVariants(playlist, BASE), []);
    assert.deepEqual(parseHlsVariants('#EXTM3U\n#EXT-X-STREAM-INF:CODECS="mp4a.40.2"\naudio.m3u8', BASE), []);
});
test('no arbitrary hosts or web pages accepted from a manifest', () => {
    assert.equal(parseHlsVariants(master().replace(/\n(?:1080|720|360)\.m3u8/g, '\nhttps://youtube.com/watch?v=x'), BASE).length, 0);
});
test('returns verified 1080p/720p HLS and muxed MP4 together', async () => {
    await mocked(async (url, options) => {
        if (url.includes('/player')) return player(JSON.parse(options.body).context.client.clientName === 'WEB'
            ? { hlsManifestUrl: BASE } : { formats: [format()] });
        if (url === BASE) return response(master(), 'application/vnd.apple.mpegurl');
        if (url.endsWith('.m3u8')) return response(playlist, 'application/vnd.apple.mpegurl');
        return response('', 'video/mp4', 206);
    }, async () => {
        const streams = await resolveYouTubeStreams(ID);
        assert.deepEqual(streams.map(s => [s.format, s.quality]), [['hls', '1080p'], ['hls', '720p'], ['mp4', '360p']]);
    });
});
test('failed HLS does not suppress working MP4', async () => {
    await mocked(async url => url.includes('/player') ? player({ hlsManifestUrl: BASE, formats: [format()] }) :
        url.includes('m3u8') ? response('<html>blocked</html>', 'text/html') : response('', 'video/mp4', 206), async () => {
        const streams = await resolveYouTubeStreams(ID);
        assert.equal(streams.length, 1);
        assert.equal(streams[0].quality, '360p');
    });
});
test('rejects HLS child HTML / encrypted playlists', async () => {
    for (const child of ['<html>denied</html>', playlist.replace('#EXTINF:', '#EXT-X-KEY:METHOD=SAMPLE-AES,URI="key"\n#EXTINF:')]) {
        await mocked(async url => url.includes('/player') ? player({ hlsManifestUrl: BASE }) : response(url === BASE ? master() : child), async () => {
            assert.deepEqual(await resolveYouTubeStreams(ID), []);
        });
    }
});
test('sorts muxed formats by height and rejects video-only adaptiveFormats', async () => {
    await mocked(async url => url.includes('/player') ? player({ formats: [format(360), format(720, MP4 + '&hd=1')],
        adaptiveFormats: [{ url: MP4 + '&silent=1', height: 1080, mimeType: 'video/mp4; codecs="avc1.640028"' }] }) : response('', 'video/mp4', 206), async () => {
        const streams = await resolveYouTubeStreams(ID);
        assert.equal(streams[0].quality, '720p');
        assert.equal(streams.length, 1);
    });
});
test('403, HTML 200 and unbounded MP4 responses fail closed', async () => {
    for (const res of [response('', 'video/mp4', 403), response('<html>', 'text/html'), response('', 'video/mp4', 200)]) {
        await mocked(async url => url.includes('/player') ? player({ formats: [format()] }) : res, async () => {
            assert.deepEqual(await resolveYouTubeStreams(ID), []);
        });
    }
});
test('cipher-only and wrong codec formats are skipped without fabricated fallback URLs', async () => {
    await mocked(async () => player({ formats: [
        { ...format(), url: undefined, signatureCipher: 'encrypted' },
        { ...format(), mimeType: 'video/mp4; codecs="av01.0.08M.08, mp4a.40.2"' },
        { ...format(), url: 'https://googlevideo.com.evil.test/file.mp4' }
    ] }), async () => assert.deepEqual(await resolveYouTubeStreams(ID), []));
});
test('unknown resolution is not labelled 360p or 1080p', async () => {
    await mocked(async url => url.includes('/player') ? player({ formats: [{ ...format(), height: undefined, qualityLabel: undefined }] }) : response('', 'video/mp4', 206), async () => {
        assert.equal((await resolveYouTubeStreams(ID))[0].quality, 'Bilinmiyor');
    });
});
test('denied player response and mismatched video IDs return no media', async () => {
    await mocked(async () => player({ formats: [format()] }, 'LOGIN_REQUIRED'), async () => assert.deepEqual(await resolveYouTubeStreams(ID), []));
    await mocked(async () => response({ playabilityStatus: { status: 'OK' }, videoDetails: { videoId: 'wrong' }, streamingData: { formats: [format()] } }),
        async () => assert.deepEqual(await resolveYouTubeStreams(ID), []));
});
test('deadline includes a stalled response body', async () => {
    await mocked(async () => ({ ok: true, json: () => new Promise(() => {}) }), async () => {
        const session = createSession(35);
        const start = Date.now();
        assert.equal(await session.request('x', {}, r => r.json()), null);
        assert.ok(Date.now() - start < 250);
        session.close();
    });
});
test('no fetch starts after deadline or close', async () => {
    await mocked(async () => { throw new Error('must not fetch'); }, async () => {
        const session = createSession(0);
        assert.equal(await session.request('x', {}, r => r.json()), null);
        session.close();
        assert.equal(await session.request('x', {}, r => r.json()), null);
    });
});
test('QuickJS-like bundle needs no Node modules, URL, Buffer or AbortController', async () => {
    const provider = bundle(async url => defaultFetch(url));
    const streams = await provider.getStreams(ID, 'movie');
    assert.equal(streams.filter(s => s.url).length, 1);
    assert.equal(streams[0].quality, '360p');
    assert.equal(streams.some(s => s.ytId), false);
    const stremio = await provider.getStreams({ id: ID, type: 'movie', client: 'stremio' });
    const embed = stremio.find(s => s.ytId);
    assert.equal(embed.ytId, ID);
    assert.equal(embed.url, undefined);
    assert.equal(embed.quality, undefined);
    assert.equal(JSON.stringify(streams[0].behaviorHints.proxyHeaders.request), JSON.stringify(streams[0].headers));
});
test('bundle bounds stalled network without AbortController', async () => {
    const provider = bundle(async url => url.includes('config.json') ? response({}) : new Promise(() => {}));
    const start = Date.now();
    const streams = await provider.getStreams(ID, 'movie');
    assert.ok(Date.now() - start < 2700);
    assert.equal(streams.length, 0);
});
test('invalid video IDs never trigger a player request', async () => {
    let calls = 0;
    await mocked(async () => { calls++; }, async () => assert.deepEqual(await resolveYouTubeStreams('not-an-id'), []));
    assert.equal(calls, 0);
});
function searchResponse(titles) {
    return response({ contents: { sectionListRenderer: { contents: [{ itemSectionRenderer: { contents: titles.map((title, index) => ({
        videoWithContextRenderer: { videoId: index === 0 ? ID : 'lmnopqrstuv', headline: { runs: [{ text: title }] },
            lengthText: { simpleText: '1:30:00' }, shortBylineText: { runs: [{ text: 'Kanal' }] } }
    })) } }] } } });
}
test('rejects Pusu and episode 10 for Kurtlar Vadisi episode 1; avoids channel/alias requests', async () => {
    const calls = [];
    const provider = bundle(async (url, options) => {
        calls.push(url);
        if (url.includes('/3/tv/')) return response({ name: 'Kurtlar Vadisi', seasons: [] });
        if (url.includes('/search')) return searchResponse(['Kurtlar Vadisi Pusu 1. Bölüm', 'Kurtlar Vadisi 10. Bölüm']);
        return defaultFetch(url, options);
    });
    const streams = await provider.getStreams({ id: 'youtube:tv:34587:1:1', type: 'series' });
    assert.equal(streams.length, 0);
    assert.ok(!calls.some(url => /\/player|\/browse|translations|external_ids/.test(url)));
});
test('cumulative episode lookup does not silently select season 1 episode 1', async () => {
    let requested = [];
    const provider = bundle(async (url, options) => {
        if (url.includes('/3/tv/')) return response({ name: 'Kurtlar Vadisi', seasons: [{ season_number: 1, episode_count: 20 }] });
        if (url.includes('/search')) return searchResponse(['Kurtlar Vadisi 1. Bölüm', 'Kurtlar Vadisi 21. Bölüm']);
        if (url.includes('/player')) {
            const id = JSON.parse(options.body).videoId;
            requested.push(id);
            return response({ playabilityStatus: { status: 'OK' }, videoDetails: { videoId: id }, streamingData: { formats: [format()] } });
        }
        return defaultFetch(url, options);
    });
    const streams = await provider.getStreams({ id: 'youtube:tv:34587:2:1', type: 'series' });
    assert.ok(streams.some(s => s.url));
    assert.ok(requested.every(id => id === 'lmnopqrstuv'));
});

test('stalled remote config cannot block native playback', async () => {
    const provider = bundle(async url => url.includes('config.json') ? new Promise(() => {}) : defaultFetch(url));
    const start = Date.now();
    const streams = await provider.getStreams(ID, 'movie');
    assert.ok(Date.now() - start < 1000);
    assert.ok(streams.some(s => s.url));
});
test('unplayable native results are empty; Stremio opt-in keeps URL-free embed', async () => {
    const provider = bundle(async url => url.includes('config.json') ? response({}) : player({}, 'UNPLAYABLE'));
    assert.equal((await provider.getStreams(ID, 'movie')).length, 0);
    const streams = await provider.getStreams({ id: ID, type: 'movie', client: 'stremio' });
    assert.equal(streams.length, 1);
    assert.equal(streams[0].ytId, ID);
    assert.equal(streams[0].url, undefined);
});
test('embed URLs and invalid prefixed IDs are handled safely', async () => {
    const provider = bundle(async url => defaultFetch(url));
    assert.ok((await provider.getStreams('https://www.youtube.com/embed/' + ID)).some(s => s.url));
    assert.equal((await provider.getStreams('youtube:video:invalid')).length, 0);
});
test('local versions and series catalog type remain synchronized', () => {
    const manifest = require('../manifest.json');
    const provider = manifest.scrapers.find(s => s.id === 'youtube_dizifilm');
    assert.equal(manifest.version, require('../package.json').version);
    assert.equal(manifest.version, require('../config.json').version);
    assert.equal(manifest.version, require('../package-lock.json').packages[''].version);
    assert.equal(provider.version, manifest.version);
    assert.equal(provider.catalogs.find(c => c.id === 'anthology_youtube_diziler').type, 'series');
});
