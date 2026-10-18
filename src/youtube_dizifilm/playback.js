const { createSession } = require('./http.js');

// Best-effort public clients. YouTube can withhold HLS or require attestation;
// an HTTP 200 player response alone does not make its media URLs playable.
var SAFARI_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Safari/605.1.15';
var ANDROID_UA = 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip';
var CLIENTS = [
    { clientName: 'WEB', clientVersion: '2.20261002.01.00', userAgent: SAFARI_UA },
    { clientName: 'ANDROID', clientVersion: '20.10.38', userAgent: ANDROID_UA }
];

function mediaUrl(url) {
    // Never expose watch pages, data/blob URLs or arbitrary API response URLs.
    return typeof url === 'string' && /^https:\/\/(?:[a-z0-9-]+\.)*googlevideo\.com\//i.test(url);
}
function header(res, name) {
    return res.headers && typeof res.headers.get === 'function' ? (res.headers.get(name) || '') : '';
}
function attributes(line) {
    var out = {};
    var re = /([A-Z0-9-]+)=("[^"]*"|[^,]*)/g;
    var m;
    while ((m = re.exec(line))) out[m[1]] = m[2].replace(/^"|"$/g, '');
    return out;
}
function absoluteUrl(value, base) {
    if (/^https:\/\//i.test(value)) return value;
    var origin = base.match(/^https:\/\/[^/]+/i);
    if (!origin || /^\/\//.test(value) || /^[a-z]+:/i.test(value)) return '';
    if (value.charAt(0) === '/') return origin[0] + value;
    return base.replace(/[?#].*$/, '').replace(/[^/]*$/, '') + value;
}
function compatibleCodecs(codecs) {
    var parts = String(codecs || '').split(',').map(function (s) { return s.trim().toLowerCase(); });
    return parts.length === 2 && parts.some(function (s) { return /^avc1\./.test(s); }) &&
        parts.some(function (s) { return s === 'mp4a.40.2'; });
}

// Only emit self-contained AVC/AAC variants. Returning a video-only child URL
// would lose EXT-X-MEDIA audio. Separate-audio masters are deliberately omitted
// until we have a portable manifest delivery mechanism and device tests.
function parseHlsVariants(text, base) {
    if (!/^#EXTM3U(?:\s|$)/.test(text.trim())) return [];
    var lines = text.split(/\r?\n/).map(function (s) { return s.trim(); });
    var groups = {};
    lines.forEach(function (line) {
        if (line.indexOf('#EXT-X-MEDIA:') !== 0) return;
        var a = attributes(line);
        if (a.TYPE === 'AUDIO') {
            var id = a['GROUP-ID'];
            if (!groups[id]) groups[id] = [];
            groups[id].push(a);
        }
    });
    var variants = [];
    for (var i = 0; i < lines.length; i++) {
        if (lines[i].indexOf('#EXT-X-STREAM-INF:') !== 0) continue;
        var a = attributes(lines[i]);
        var resolution = (a.RESOLUTION || '').match(/^(\d+)x(\d+)$/);
        if (!resolution || !compatibleCodecs(a.CODECS)) continue;
        var height = Number(resolution[2]);
        if (height > 1080 || height < 1 || Number(a['FRAME-RATE'] || 0) > 30) continue;
        if (a.AUDIO && (!groups[a.AUDIO] || groups[a.AUDIO].some(function (g) { return !!g.URI; }))) continue;
        var next = i + 1;
        while (next < lines.length && !lines[next]) next++;
        if (!lines[next] || lines[next].charAt(0) === '#') continue;
        var url = absoluteUrl(lines[next], base);
        if (mediaUrl(url)) variants.push({ url: url, height: height, bandwidth: Number(a.BANDWIDTH || 0) });
    }
    return variants.sort(function (a, b) { return b.height - a.height || b.bandwidth - a.bandwidth; });
}

async function validateHls(session, url, headers) {
    return session.request(url, { headers: headers }, async function (res) {
        if (/text\/html/i.test(header(res, 'content-type'))) return false;
        var text = await res.text();
        if (!/^#EXTM3U(?:\s|$)/.test(text.trim()) || !/#EXTINF:/.test(text)) return false;
        // Do not send DRM or unverified encrypted variants to the generic player.
        if (/#EXT-X-KEY:(?![^\r\n]*METHOD=NONE)/.test(text)) return false;
        var segment = text.split(/\r?\n/).map(function (s) { return s.trim(); }).find(function (s) { return s && s.charAt(0) !== '#'; });
        return !!segment && mediaUrl(absoluteUrl(segment, url));
    }, 1200);
}

async function validateMp4(session, url, headers) {
    // HEAD does not prove that a signed media GET works. Request a tiny byte
    // range via Google's range parameter; don't buffer an entire film in QuickJS.
    var probe = url + (url.indexOf('?') === -1 ? '?' : '&') + 'range=0-1023';
    return session.request(probe, { headers: Object.assign({}, headers, { Range: 'bytes=0-1023' }) }, async function (res) {
        var type = header(res, 'content-type');
        var length = Number(header(res, 'content-length'));
        var range = header(res, 'content-range');
        var ok = /^video\/mp4(?:;|$)/i.test(type) && (res.status === 206 || (length > 0 && length <= 1024));
        if (range && !/^bytes 0-\d+\//i.test(range)) ok = false;
        if (res.body && typeof res.body.cancel === 'function') await res.body.cancel();
        return ok;
    }, 1200);
}

async function resolveYouTubeStreams(id, options) {
    options = options || {};
    if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return [];
    var session = createSession(Math.min(4500, options.timeoutMs === undefined ? 4500 : options.timeoutMs));
    var streams = [];
    try {
        await Promise.all(CLIENTS.map(async function (client) {
            var headers = { 'User-Agent': client.userAgent };
            var data = await session.request('https://www.youtube.com/youtubei/v1/player', {
                method: 'POST',
                headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
                body: JSON.stringify({
                    videoId: id,
                    context: { client: Object.assign({ hl: 'tr', gl: 'TR' }, client) }
                })
            }, function (res) { return res.json(); }, 2000);
            if (!data || !data.playabilityStatus || data.playabilityStatus.status !== 'OK' || !data.streamingData) return;
            var sd = data.streamingData;
            var details = data.videoDetails || {};
            if (details.videoId && details.videoId !== id) return;
            function emit(url, height, isHls) {
                streams.push({
                    url: url, quality: height ? height + 'p' : 'Bilinmiyor',
                    height: height, isHls: isHls, format: isHls ? 'hls' : 'mp4',
                    headers: headers, author: details.author || '',
                    videoTitle: details.title || '', viewCount: details.viewCount || ''
                });
            }
            await Promise.all([
                (async function () {
                    if (!mediaUrl(sd.hlsManifestUrl)) return;
                    var manifest = await session.request(sd.hlsManifestUrl, { headers: headers }, function (res) { return res.text(); }, 1200);
                    if (!manifest) return;
                    var variants = parseHlsVariants(manifest, sd.hlsManifestUrl);
                    // Offer HD and a lower resolution for older hardware, at most
                    // two child playlists per client and no media downloads here.
                    var selected = variants.slice(0, 1);
                    var lower = variants.find(function (v) { return v.height <= 720 && selected[0] && v.height < selected[0].height; });
                    if (lower) selected.push(lower);
                    await Promise.all(selected.map(async function (v) {
                        if (await validateHls(session, v.url, headers)) emit(v.url, v.height, true);
                    }));
                })(),
                (async function () {
                    var formats = (Array.isArray(sd.formats) ? sd.formats : []).filter(function (f) {
                        if (!f || typeof f !== 'object') return false;
                        var codec = (f.mimeType || '').match(/codecs="([^"]+)"/);
                        return mediaUrl(f.url) && /^video\/mp4\b/.test(f.mimeType || '') && codec && compatibleCodecs(codec[1]) &&
                            !f.drmFamilies && !f.signatureCipher && !f.cipher && Number(f.height || 0) <= 1080 && Number(f.fps || 0) <= 30;
                    }).sort(function (a, b) { return Number(b.height || 0) - Number(a.height || 0); });
                    // Try the next muxed format if the highest one has expired.
                    for (var i = 0; i < Math.min(formats.length, 2); i++) {
                        var f = formats[i];
                        if (await validateMp4(session, f.url, headers)) {
                            emit(f.url, Number(f.height) || 0, false);
                            break;
                        }
                    }
                })()
            ]);
        }));
    } finally {
        session.close();
    }
    var seen = {};
    return streams.sort(function (a, b) { return b.height - a.height || Number(b.isHls) - Number(a.isHls); }).filter(function (s) {
        var key = s.format + ':' + s.height;
        if (seen[key]) return false;
        seen[key] = true;
        return true;
    });
}
module.exports = { resolveYouTubeStreams: resolveYouTubeStreams, parseHlsVariants: parseHlsVariants };
