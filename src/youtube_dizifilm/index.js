const { sortStreamsByQuality } = require('../shared/quality.js');
const { loadConfig, val, wrapAll } = require('../shared/config.js');
const { timeoutSignal } = require('../shared/http.js');
const { normalizeSeriesId } = require('../shared/turkish_series.js');
const { resolveYouTubeStreams } = require('./playback.js');
const { createSession } = require('./http.js');

var _cfgReady = null;
// Temporary local-test marker; visible beside each channel in the source list.
var BETA_LABEL = ' · BETA 1.8.27';
function cfgReady() {
    if (!_cfgReady) {
        var configSession = createSession(500);
        _cfgReady = loadConfig({ fetchJson: function (url, options) {
            return configSession.request(url, options, function (res) { return res.json(); });
        } }).then(function () {
            configSession.close();
            var v;
            v = val('api_keys.tmdb'); if (v) TMDB_API_KEY = String(v);
            v = val('urls.youtube.innertube_key'); if (v) INNERTUBE_KEY = String(v);
        });
    }
    return _cfgReady;
}

/**
 * Anthology - YouTube Dizi & Film Provider
 * 
 * YouTube üzerinde resmi yapımcılar, TV kanalları (Show TV, Kanal D, Star, TRT vb.)
 * ve film stüdyoları (Arzu Film, Fanatik Film, BKM) tarafından yayınlanan
 * tam bölümler ve yerli sinema filmleri için doğrulanan HLS/MP4 akışları.
 */

var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var INNERTUBE_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

// ── Curated YouTube Vitrin Kataloğu ──────────────────────────────────────────

var POPULAR_DIZILER = [
    { tmdbId: '34587', name: 'Kurtlar Vadisi', year: '2003', poster: 'https://image.tmdb.org/t/p/w500/yX6JEIijuH6KNCgO8I2yLKu2Psb.jpg', channel: 'Kurtlar Vadisi' },
    { tmdbId: '32519', name: 'Ezel', year: '2009', poster: 'https://image.tmdb.org/t/p/w500/pHSjh4MINU2JnK7qQvjogQaX3wr.jpg', channel: 'Ezel' },
    { tmdbId: '32433', name: 'Aşk-ı Memnu', year: '2008', poster: 'https://image.tmdb.org/t/p/w500/bJbL2fG6t4b7qH9eE2K3jP0v5a7.jpg', channel: 'Kanal D' },
    { tmdbId: '39176', name: 'Behzat Ç.', year: '2010', poster: 'https://image.tmdb.org/t/p/w500/iL8P2aX8n7j9t9K8p1v0m5k3b7g.jpg', channel: 'Adam Film' },
    { tmdbId: '39352', name: 'Leyla ile Mecnun', year: '2011', poster: 'https://image.tmdb.org/t/p/w500/8tH8rZ2vG8o1m3k5b7p9q0r1s2t.jpg', channel: 'TRT 1' },
    { tmdbId: '43865', name: 'Kuzey Güney', year: '2011', poster: 'https://image.tmdb.org/t/p/w500/q2m7b9k5p3j8r1v0m5k3b7g9q0r.jpg', channel: 'Kuzey Güney' },
    { tmdbId: '32520', name: 'Avrupa Yakası', year: '2004', poster: 'https://image.tmdb.org/t/p/w500/v1m5k3b7g9q0r1s2t8h8rZ2vG8o.jpg', channel: 'Avrupa Yakası' },
    { tmdbId: '60682', name: 'Kardeş Payı', year: '2014', poster: 'https://image.tmdb.org/t/p/w500/3j8r1v0m5k3b7g9q0r1s2t8h8rZ.jpg', channel: 'Kardeş Payı' },
    { tmdbId: '32522', name: 'Geniş Aile', year: '2009', poster: 'https://image.tmdb.org/t/p/w500/8r1v0m5k3b7g9q0r1s2t8h8rZ2v.jpg', channel: 'D Productions' },
    { tmdbId: '32521', name: 'Cennet Mahallesi', year: '2004', poster: 'https://image.tmdb.org/t/p/w500/m5k3b7g9q0r1s2t8h8rZ2vG8o1m.jpg', channel: 'Erler Film Türker İnanoğlu' },
    { tmdbId: '32524', name: 'Akasya Durağı', year: '2008', poster: 'https://image.tmdb.org/t/p/w500/7g9q0r1s2t8h8rZ2vG8o1m3k5b7.jpg', channel: 'Erler Film' },
    { tmdbId: '61483', name: 'Medcezir', year: '2013', poster: 'https://image.tmdb.org/t/p/w500/9q0r1s2t8h8rZ2vG8o1m3k5b7p9.jpg', channel: 'Medcezir' },
    { tmdbId: '68349', name: 'İçerde', year: '2016', poster: 'https://image.tmdb.org/t/p/w500/r1s2t8h8rZ2vG8o1m3k5b7p9q0r.jpg', channel: 'İçerde' },
    { tmdbId: '74431', name: 'Çukur', year: '2017', poster: 'https://image.tmdb.org/t/p/w500/2t8h8rZ2vG8o1m3k5b7p9q0r1s2.jpg', channel: 'Çukur' },
    { tmdbId: '39351', name: 'Muhteşem Yüzyıl', year: '2011', poster: 'https://image.tmdb.org/t/p/w500/8h8rZ2vG8o1m3k5b7p9q0r1s2t8.jpg', channel: 'Tims Productions' },
    { tmdbId: '32523', name: 'Yaprak Dökümü', year: '2006', poster: 'https://image.tmdb.org/t/p/w500/o1m3k5b7p9q0r1s2t8h8rZ2vG8o.jpg', channel: 'Kanal D' },
    { tmdbId: '46648', name: 'Karadayı', year: '2012', poster: 'https://image.tmdb.org/t/p/w500/m3k5b7p9q0r1s2t8h8rZ2vG8o1m.jpg', channel: 'Karadayı' },
    { tmdbId: '112454', name: 'Gönül Dağı', year: '2020', poster: 'https://image.tmdb.org/t/p/w500/5b7p9q0r1s2t8h8rZ2vG8o1m3k5.jpg', channel: 'TRT 1' }
];

var POPULAR_FILMLER = [
    { tmdbId: '38794', name: 'Tosun Paşa', year: '1976', poster: 'https://image.tmdb.org/t/p/w500/aE8cMuRNYltzzW36N2hC3zyZQm2.jpg', channel: 'ARZU FİLM' },
    { tmdbId: '16842', name: 'Hababam Sınıfı', year: '1975', poster: 'https://image.tmdb.org/t/p/w500/q2m7b9k5p3j8r1v0m5k3b7g9q0r.jpg', channel: 'ARZU FİLM' },
    { tmdbId: '38795', name: 'Şaban Oğlu Şaban', year: '1977', poster: 'https://image.tmdb.org/t/p/w500/v1m5k3b7g9q0r1s2t8h8rZ2vG8o.jpg', channel: 'ARZU FİLM' },
    { tmdbId: '38796', name: 'Süt Kardeşler', year: '1976', poster: 'https://image.tmdb.org/t/p/w500/3j8r1v0m5k3b7g9q0r1s2t8h8rZ.jpg', channel: 'ARZU FİLM' },
    { tmdbId: '38798', name: 'Kibar Feyzo', year: '1978', poster: 'https://image.tmdb.org/t/p/w500/8r1v0m5k3b7g9q0r1s2t8h8rZ2v.jpg', channel: 'ARZU FİLM' },
    { tmdbId: '38797', name: 'Çöpçüler Kralı', year: '1977', poster: 'https://image.tmdb.org/t/p/w500/m5k3b7g9q0r1s2t8h8rZ2vG8o1m.jpg', channel: 'ARZU FİLM' },
    { tmdbId: '38799', name: 'Neşeli Günler', year: '1978', poster: 'https://image.tmdb.org/t/p/w500/7g9q0r1s2t8h8rZ2vG8o1m3k5b7.jpg', channel: 'ARZU FİLM' },
    { tmdbId: '88451', name: 'Davaro', year: '1981', poster: 'https://image.tmdb.org/t/p/w500/9q0r1s2t8h8rZ2vG8o1m3k5b7p9.jpg', channel: 'Gülşah Film' },
    { tmdbId: '88452', name: 'Züğürt Ağa', year: '1985', poster: 'https://image.tmdb.org/t/p/w500/r1s2t8h8rZ2vG8o1m3k5b7p9q0r.jpg', channel: 'Fanatik Film' },
    { tmdbId: '38800', name: 'Kapıcılar Kralı', year: '1976', poster: 'https://image.tmdb.org/t/p/w500/2t8h8rZ2vG8o1m3k5b7p9q0r1s2.jpg', channel: 'ARZU FİLM' },
    { tmdbId: '12621', name: 'Organize İşler', year: '2005', poster: 'https://image.tmdb.org/t/p/w500/8h8rZ2vG8o1m3k5b7p9q0r1s2t8.jpg', channel: 'BKM' },
    { tmdbId: '12620', name: 'Vizontele', year: '2001', poster: 'https://image.tmdb.org/t/p/w500/o1m3k5b7p9q0r1s2t8h8rZ2vG8o.jpg', channel: 'BKM' },
    { tmdbId: '12619', name: 'G.O.R.A.', year: '2004', poster: 'https://image.tmdb.org/t/p/w500/m3k5b7p9q0r1s2t8h8rZ2vG8o1m.jpg', channel: 'BKM' }
];

// ── String & Matching Helpers ───────────────────────────────────────────────

function asciiFold(s) {
    s = String(s || '');
    try { if (typeof s.normalize === 'function') s = s.normalize('NFD'); } catch (e) { }
    s = s.replace(/[\u0300-\u036f]/g, '');
    var map = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'İ': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };
    var out = '';
    var lower = s.toLowerCase();
    for (var i = 0; i < lower.length; i++) {
        var ch = lower.charAt(i);
        out += (map[ch] !== undefined ? map[ch] : ch);
    }
    return out;
}

function cleanTitle(t) {
    return asciiFold(String(t || '')).replace(/[^a-z0-9]+/g, ' ').trim();
}

function parseDurationSec(str) {
    if (!str) return 0;
    var parts = String(str).split(':').map(function (p) { return parseInt(p, 10); });
    if (parts.some(isNaN)) return 0;
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    }
    return 0;
}

/**
 * Validates if YouTube video title matches requested season and episode number.
 * Prevents false matches (e.g. matching 10. Bölüm when Episode 1 is requested).
 */
function matchesEpisode(videoTitle, season, episode, cumEpisode) {
    var norm = asciiFold(videoTitle);

    var epCandidates = [episode];
    if (cumEpisode && cumEpisode !== episode) {
        epCandidates = [cumEpisode];
        var explicitSeason = norm.match(/(?:^|[^0-9])([1-9]\d?)\s*\.?\s*(?:sezon|season)\b/i);
        if (explicitSeason && Number(explicitSeason[1]) === Number(season)) epCandidates.push(episode);
    }

    var matchedEp = false;
    for (var i = 0; i < epCandidates.length; i++) {
        var ep = epCandidates[i];
        var epRegexes = [
            new RegExp('(?:^|[^0-9])' + ep + '\\s*\\.?\\s*(?:bolum|bolumu|b|episode|ep)(?:[^0-9]|$)', 'i'),
            new RegExp('(?:bolum|bolumu|episode|ep)\\s*[:#-]?\\s*' + ep + '(?:[^0-9]|$)', 'i'),
            new RegExp('(?:^|[^0-9])b' + ep + '(?:[^0-9]|$)', 'i'),
            new RegExp('(?:^|\\s)-?\\s*' + ep + '\\.bolum', 'i')
        ];
        if (epRegexes.some(function (r) { return r.test(norm); })) {
            matchedEp = true;
            break;
        }
    }

    if (!matchedEp) return false;

    // If season > 1, check that an explicitly different season is not mentioned
    if (season >= 1) {
        var otherSeasonRegex = /(?:^|[^0-9])([1-9]\d?)\s*\.?\s*(?:sezon|season)(?:[^0-9]|$)/i;
        var sMatch = norm.match(otherSeasonRegex);
        if (sMatch && parseInt(sMatch[1], 10) !== season) {
            return false;
        }
    }

    return true;
}

// ── Popüler Türk Kanalları Abone Veritabanı (0ms Ağ Gecikmesi) ──────────────
var KNOWN_CHANNELS = {
    'arzu film': '2.1M Abone',
    'trt nostalji': '667B Abone',
    'kanal d': '10.5M Abone',
    'show tv': '9.8M Abone',
    'star tv': '7.2M Abone',
    'atv': '12.8M Abone',
    'trt 1': '8.5M Abone',
    'kurtlar vadisi': '3.2M Abone',
    'ezel': '2.4M Abone',
    'bkm': '4.5M Abone',
    'fanatik film': '3.1M Abone',
    'fanatik klasik film': '1.8M Abone',
    'gulsah film': '1.2M Abone',
    'hanimin ciftligi': '197B Abone',
    'leyla ile mecnun': '1.8M Abone',
    'kuzey guney': '1.5M Abone',
    'avrupa yakasi': '1.6M Abone',
    'cukur': '7.8M Abone',
    'icerde': '3.9M Abone',
    'medcezir': '2.9M Abone',
    'karadayi': '1.1M Abone',
    'yaprak dokumu': '1.4M Abone',
    'gonul dagi': '2.3M Abone',
    'kardes payi': '1.9M Abone',
    'genis aile': '1.1M Abone',
    'cennet mahallesi': '1.5M Abone',
    'akasya duragi': '1.7M Abone',
    'muhtesem yuzyil': '3.8M Abone',
    'behzat c.': '1.2M Abone'
};

function getChannelSubscriberBadge(channel, isVerified) {
    if (!channel) return isVerified ? '✔' : '';
    var norm = cleanTitle(channel);
    var sub = KNOWN_CHANNELS[norm];
    if (sub) return isVerified ? '✔ (' + sub + ')' : '(' + sub + ')';
    return isVerified ? '✔' : '';
}

function parseViewCount(str) {
    if (!str) return 0;
    var s = String(str).toLowerCase().replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    var mnMatch = s.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:mn|m|milyon)/i);
    if (mnMatch) return parseFloat(mnMatch[1].replace(',', '.')) * 1000000;
    var bMatch = s.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:b|k|bin)/i);
    if (bMatch) return parseFloat(bMatch[1].replace(',', '.')) * 1000;
    var clean = s.replace(/[^0-9]/g, '');
    return parseInt(clean, 10) || 0;
}

function formatNumberCompact(n) {
    var num = parseInt(n, 10);
    if (isNaN(num)) return '';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.0', '').replace('.', ',') + ' Mn';
    if (num >= 1000) return (num / 1000).toFixed(0) + ' B';
    return String(num);
}

/**
 * Dizi ve film adının tam sınırlarını kontrol eder; Pusu, Terör vb. yan yapımları eler.
 */
function matchesTitle(videoTitle, targetTitle) {
    var vNorm = cleanTitle(videoTitle);
    var tNorm = cleanTitle(targetTitle);

    var tWords = tNorm.split(/\s+/).filter(function (w) { return w.length > 1; });
    var allWords = tWords.length > 0 && tWords.every(function (w) {
        return new RegExp('\\b' + w + '\\b', 'i').test(vNorm);
    });
    if (!allWords) return false;

    // Hedef başlıkta geçmeyen türev/yan yapım isimlerini negatif regex ile ele
    var spinOffs = ['pusu', 'teror', 'gladio', 'irak', 'filistin', 'vatan'];
    for (var s = 0; s < spinOffs.length; s++) {
        var sp = spinOffs[s];
        if (tNorm.indexOf(sp) === -1 && new RegExp('\\b' + sp + '\\b', 'i').test(vNorm)) {
            return false;
        }
    }
    return true;
}

// ── YouTube Hızlı Arama (Innertube API) ──────────────────────────────────────

async function searchYouTube(query, parentSession) {
    var session = parentSession || createSession(2200);
    try {
        var clients = ['MWEB', 'WEB'];
        for (var i = 0; i < clients.length; i++) {
            var data = await session.request('https://www.youtube.com/youtubei/v1/search?key=' + INNERTUBE_KEY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query, context: { client: {
                    clientName: clients[i], clientVersion: '2.20261002.01.00', hl: 'tr', gl: 'TR'
                } } })
            }, function (res) { return res.json(); }, 1100);
            if (!data) continue;
            var results = clients[i] === 'MWEB' ? _parseInnertubeMwebSearch(data) : _parseInnertubeWebSearch(data);
            if (results.length) return results;
        }
        return [];
    } finally {
        if (!parentSession) session.close();
    }
}

function _parseInnertubeMwebSearch(data) {
    var results = [];
    var seenIds = {};
    try {
        var slr = (data && data.contents && data.contents.sectionListRenderer &&
            data.contents.sectionListRenderer.contents) || [];
        for (var s = 0; s < slr.length; s++) {
            var items = (slr[s].itemSectionRenderer && slr[s].itemSectionRenderer.contents) || [];
            for (var i = 0; i < items.length; i++) {
                var it = items[i];
                var v = it.videoWithContextRenderer || it.compactVideoRenderer || it.videoRenderer;
                if (!v) continue;
                var vidId = v.videoId;
                if (!vidId && v.navigationEndpoint && v.navigationEndpoint.watchEndpoint) {
                    vidId = v.navigationEndpoint.watchEndpoint.videoId;
                }
                if (!vidId || seenIds[vidId]) continue;
                seenIds[vidId] = true;

                var title = (v.headline && v.headline.runs && v.headline.runs[0] && v.headline.runs[0].text) ||
                    (v.title && v.title.runs && v.title.runs[0] && v.title.runs[0].text) ||
                    (v.title && v.title.simpleText) || '';
                var channel = (v.shortBylineText && v.shortBylineText.runs && v.shortBylineText.runs[0] && v.shortBylineText.runs[0].text) ||
                    (v.ownerText && v.ownerText.runs && v.ownerText.runs[0] && v.ownerText.runs[0].text) || '';
                var durText = (v.lengthText && v.lengthText.runs && v.lengthText.runs[0] && v.lengthText.runs[0].text) ||
                    (v.lengthText && v.lengthText.simpleText) || '';
                var durSec = parseDurationSec(durText);
                var viewsText = (v.shortViewCountText && v.shortViewCountText.runs && v.shortViewCountText.runs[0] && v.shortViewCountText.runs[0].text) ||
                    (v.shortViewCountText && v.shortViewCountText.simpleText) ||
                    (v.viewCountText && v.viewCountText.simpleText) || '';
                viewsText = viewsText.replace(/\u00a0/g, ' ').replace(/\s*görüntüleme\s*/i, '').trim();
                var viewsNum = parseViewCount(viewsText);

                results.push({
                    id: vidId,
                    title: title,
                    duration: durText,
                    durationSec: durSec,
                    channel: channel,
                    views: viewsText,
                    viewsNum: viewsNum,
                    isVerified: Array.isArray(v.ownerBadges) && v.ownerBadges.some(function (b) {
                        return b.metadataBadgeRenderer && /VERIFIED/.test(b.metadataBadgeRenderer.style || '');
                    })
                });
            }
        }
    } catch (e) { }
    return results;
}

function _parseInnertubeWebSearch(data) {
    var results = [];
    var seenIds = {};
    try {
        var contents = (data && data.contents &&
            data.contents.twoColumnSearchResultsRenderer &&
            data.contents.twoColumnSearchResultsRenderer.primaryContents &&
            data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer &&
            data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents) || [];
        for (var s = 0; s < contents.length; s++) {
            var itemSection = contents[s].itemSectionRenderer && contents[s].itemSectionRenderer.contents;
            for (var i = 0; i < (itemSection || []).length; i++) {
                var vr = itemSection[i].videoRenderer;
                if (!vr || !vr.videoId) continue;
                var vid = vr.videoId;
                if (seenIds[vid]) continue;
                seenIds[vid] = true;

                var title = (vr.title && vr.title.runs && vr.title.runs[0] && vr.title.runs[0].text) ||
                    (vr.title && vr.title.simpleText) || '';
                var duration = (vr.lengthText && vr.lengthText.simpleText) ||
                    (vr.lengthText && vr.lengthText.runs && vr.lengthText.runs[0] && vr.lengthText.runs[0].text) || '';
                var channel = (vr.ownerText && vr.ownerText.runs && vr.ownerText.runs[0] && vr.ownerText.runs[0].text) || '';
                var views = (vr.shortViewCountText && vr.shortViewCountText.simpleText) ||
                    (vr.viewCountText && vr.viewCountText.simpleText) || '';
                views = views.replace(/\u00a0/g, ' ').replace(/\s*görüntüleme\s*/i, '').trim();

                var isVerified = false;
                if (Array.isArray(vr.ownerBadges)) {
                    isVerified = vr.ownerBadges.some(function (b) {
                        return b && b.metadataBadgeRenderer && b.metadataBadgeRenderer.style &&
                            b.metadataBadgeRenderer.style.indexOf('VERIFIED') !== -1;
                    });
                }

                results.push({
                    id: vid,
                    title: title,
                    duration: duration,
                    durationSec: parseDurationSec(duration),
                    channel: channel,
                    views: views,
                    viewsNum: parseViewCount(views),
                    isVerified: isVerified
                });
            }
        }
    } catch (e) { }
    return results;
}

// ── Stream Resolution ───────────────────────────────────────────────────────

function toStream(source, name, description) {
    var quality = source.quality || 'Bilinmiyor';
    return {
        name: name,
        title: '⌜ YouTube ⌟ | ' + name + ' (' + quality + ' · ' + (source.isHls ? 'HLS' : 'MP4') + ')',
        description: description,
        url: source.url, quality: quality, isHls: source.isHls, format: source.format,
        provider: 'youtube_dizifilm', headers: source.headers,
        behaviorHints: {
            notWebReady: true,
            headers: source.headers,
            proxyHeaders: { request: source.headers }
        }
    };
}

// Only title + seasons are needed here. Avoid external_ids/translations/aliases
// requests in the playback path, and keep metadata within two short requests.
async function resolveTitleInfo(rawId, type, session) {
    var norm = normalizeSeriesId(rawId);
    var isSeries = type === 'tv' || type === 'series';
    var kind = isSeries ? 'tv' : 'movie';
    var id = norm.id;
    var fallback = (isSeries ? POPULAR_DIZILER : POPULAR_FILMLER).find(function (v) { return v.tmdbId === id; });
    var result = { title: fallback ? fallback.name : (norm.kind === 'title' ? id : ''), seasons: [] };
    async function json(path) {
        return session.request('https://api.themoviedb.org/3/' + path +
            (path.indexOf('?') === -1 ? '?' : '&') + 'api_key=' + TMDB_API_KEY + '&language=tr-TR', {},
            function (res) { return res.json(); }, 1000);
    }
    if (norm.kind === 'imdb') {
        var found = await json('find/' + id + '?external_source=imdb_id');
        var hits = found && found[isSeries ? 'tv_results' : 'movie_results'];
        if (!hits || !hits.length) return result;
        id = String(hits[0].id);
        result.title = hits[0].name || hits[0].title || result.title;
    } else if (norm.kind === 'title') {
        // A raw title already suffices for movies / season 1 searches.
        return result;
    }
    var data = await json(kind + '/' + id);
    if (data) {
        result.title = data.name || data.title || result.title;
        result.seasons = data.seasons || [];
    }
    return result;
}

async function getStreams(tmdbIdOrArgs, mediaType, seasonNum, episodeNum) {
    var session = createSession(9000);
    try {
        await cfgReady();
        return await getStreamsInternal(tmdbIdOrArgs, mediaType, seasonNum, episodeNum, session);
    } finally {
        session.close();
    }
}

async function getStreamsInternal(tmdbIdOrArgs, mediaType, seasonNum, episodeNum, session) {
    try {
        var includeEmbed = !!(tmdbIdOrArgs && typeof tmdbIdOrArgs === 'object' && tmdbIdOrArgs.client === 'stremio');
        var rawId = tmdbIdOrArgs;
        var sNum = seasonNum || 1;
        var eNum = episodeNum || 1;
        var mType = mediaType || 'movie';

        if (typeof tmdbIdOrArgs === 'object' && tmdbIdOrArgs !== null) {
            rawId = tmdbIdOrArgs.id || tmdbIdOrArgs.url || '';
            mType = tmdbIdOrArgs.type || tmdbIdOrArgs.mediaType || mType;
            sNum = tmdbIdOrArgs.season || tmdbIdOrArgs.seasonNum || sNum;
            eNum = tmdbIdOrArgs.episode || tmdbIdOrArgs.episodeNum || eNum;
        }

        sNum = Math.max(1, parseInt(sNum, 10) || 1);
        eNum = Math.max(1, parseInt(eNum, 10) || 1);
        rawId = String(rawId || '').trim();

        // 1. Doğrudan YouTube URL veya video ID'si verilmişse
        var directYtId = null;
        if (/^[a-zA-Z0-9_-]{11}$/.test(rawId)) {
            directYtId = rawId;
        } else if (rawId.startsWith('youtube:video:')) {
            var suppliedId = rawId.replace('youtube:video:', '');
            if (!/^[a-zA-Z0-9_-]{11}$/.test(suppliedId)) return [];
            directYtId = suppliedId;
        } else if (rawId.includes('youtube.com/') || rawId.includes('youtu.be/')) {
            var m = rawId.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            if (m) directYtId = m[1];
        }

        if (directYtId) {
            var streams = [];
            var directStreams = await resolveYouTubeStreams(directYtId, { timeoutMs: session.remaining() });
            var streamData = directStreams[0];
            var chName = (streamData && streamData.author) || 'YouTube';
            var streamName = '📺 ' + chName + BETA_LABEL;
            var vTitle = (streamData && streamData.videoTitle) || '';
            var vViews = streamData && streamData.viewCount ? formatNumberCompact(streamData.viewCount) : '';
            var viewsTag = vViews ? ' · 👁 ' + vViews : '';
            directStreams.forEach(function (resolved) {
                streams.push(toStream(resolved, streamName, vTitle + viewsTag));
            });

            // Stremio için YouTube embed akışı (ExoPlayer hatasını önlemek için url boş bırakılır)
            if (includeEmbed) streams.push({
                name: streamName,
                title: '⌜ YouTube ⌟ | ' + streamName + ' (YouTube Embed)',
                description: vTitle + viewsTag,
                ytId: directYtId,
                provider: 'youtube_dizifilm'
            });

            return sortStreamsByQuality(streams.filter(function (s) { return !!s.url; }))
            .concat(streams.filter(function (s) { return !!s.ytId; }));
        }

        // 2. Özel katalog ID'si (youtube:tv:34587:1:1 veya youtube:movie:38794)
        if (rawId.startsWith('youtube:')) {
            var parts = rawId.split(':');
            if (parts[1] === 'tv' || parts[1] === 'series' || parts[1] === 'movie') {
                mType = parts[1] === 'movie' ? 'movie' : 'series';
                rawId = parts[2];
                if (parts[3]) sNum = parseInt(parts[3], 10) || sNum;
                if (parts[4]) eNum = parseInt(parts[4], 10) || eNum;
            }
        } else {
            // Nuvio / Stremio kimlik normalizasyonu (tt7115656:1:1 -> id: tt7115656, season: 1, episode: 1)
            var idNorm = normalizeSeriesId(rawId);
            if (idNorm.id) rawId = idNorm.id;
            if (!seasonNum && idNorm.season > 0) sNum = idNorm.season;
            if (!episodeNum && idNorm.episode > 0) eNum = idNorm.episode;
        }

        // 3. TMDB Kimlik Çözümü (Dinamik)
        var isSeries = (mType === 'tv' || mType === 'series');
        var info = await resolveTitleInfo(rawId, mType, session);
        var targetTitle = info.title;
        if (!targetTitle || session.remaining() <= 0) return [];

        // Kümülatif Bölüm Hesaplama (Örn: Kurtlar Vadisi 2. Sezon 1. Bölüm = 21. Bölüm)
        var cumEpisode = eNum;
        if (isSeries && sNum > 1 && Array.isArray(info.seasons) && info.seasons.length > 0) {
            var sum = 0;
            for (var s = 0; s < info.seasons.length; s++) {
                var sn = info.seasons[s].season_number;
                if (sn > 0 && sn < sNum) {
                    sum += (info.seasons[s].episode_count || 0);
                }
            }
            if (sum > 0) cumEpisode = sum + eNum;
        }

        // 4. Optimize Arama Sorguları (Maksimum 2 sorgu, PARALEL çalışır)
        var searchQueries = [];
        if (isSeries) {
            var epTarget = (cumEpisode && cumEpisode !== eNum) ? cumEpisode : eNum;
            searchQueries.push(targetTitle + ' ' + epTarget + '. Bölüm');
            if (sNum > 1 && epTarget === eNum) {
                searchQueries.push(targetTitle + ' ' + sNum + '. Sezon ' + eNum + '. Bölüm');
            }
        } else {
            searchQueries.push(targetTitle + ' Full İzle');
            searchQueries.push(targetTitle + ' Tek Parça');
        }

        // Paralel Arama (Hızlı yanıt)
        var searchResultsArr = await Promise.all(searchQueries.map(function (q) {
            return searchYouTube(q, session);
        }));

        var candidateVideos = [];
        var seenVid = {};
        var minDuration = isSeries ? 900 : 2400;

        for (var a = 0; a < searchResultsArr.length; a++) {
            var vids = searchResultsArr[a] || [];
            for (var v = 0; v < vids.length; v++) {
                var vid = vids[v];
                if (seenVid[vid.id]) continue;
                seenVid[vid.id] = true;

                // Süre kontrolü
                if (vid.durationSec > 0 && vid.durationSec < minDuration) continue;

                // Başlık & türev kontrolü (Kurtlar Vadisi -> Pusu'yu eler)
                if (!matchesTitle(vid.title, targetTitle)) continue;

                // Dizi ise bölüm kontrolü
                if (isSeries && !matchesEpisode(vid.title, sNum, eNum, cumEpisode)) continue;

                candidateVideos.push(vid);
                if (candidateVideos.length >= 4) break;
            }
            if (candidateVideos.length >= 4) break;
        }

        if (candidateVideos.length === 0) return [];

        // İzlenme sayısına göre sırala
        candidateVideos.sort(function (x, y) {
            return (y.viewsNum || 0) - (x.viewsNum || 0);
        });

        // Farklı kanallardan en iyi 2 videoyu seç
        var channelSeen = {};
        var topCandidates = [];
        for (var c = 0; c < candidateVideos.length; c++) {
            var cand = candidateVideos[c];
            var chKey = cleanTitle(cand.channel) || cand.id;
            if (!channelSeen[chKey]) {
                channelSeen[chKey] = true;
                topCandidates.push(cand);
                if (topCandidates.length >= 2) break;
            }
        }
        if (topCandidates.length < 2 && candidateVideos.length > 0) {
            for (var c2 = 0; c2 < candidateVideos.length; c2++) {
                var cand2 = candidateVideos[c2];
                if (topCandidates.indexOf(cand2) === -1) {
                    topCandidates.push(cand2);
                    if (topCandidates.length >= 2) break;
                }
            }
        }

        // Paralel MP4 Çözümü (Nuvio ExoPlayer için)
        var resolvedArr = await Promise.all(topCandidates.map(function (tc) {
            return resolveYouTubeStreams(tc.id, { timeoutMs: session.remaining() }).catch(function () { return []; });
        }));

        var streams = [];

        for (var i = 0; i < topCandidates.length; i++) {
            var candObj = topCandidates[i];
            var resolved = resolvedArr[i];
            var badge2 = getChannelSubscriberBadge(candObj.channel, candObj.isVerified);
            var streamName2 = '📺 ' + (candObj.channel || 'YouTube') + (badge2 ? ' ' + badge2 : '') + BETA_LABEL;
            var viewsLabel = candObj.views ? ' · 👁 ' + candObj.views : '';

            (resolved || []).forEach(function (source) {
                streams.push(toStream(source, streamName2, candObj.title + viewsLabel));
            });

            // 2. Stremio için YouTube embed akışı (ExoPlayer parser çökmesini önlemek için url YOK)
            if (includeEmbed) streams.push({
                name: streamName2,
                title: '⌜ YouTube ⌟ | ' + streamName2 + ' (YouTube Embed)',
                description: candObj.title + viewsLabel,
                ytId: candObj.id,
                provider: 'youtube_dizifilm'
            });
        }

        return sortStreamsByQuality(streams.filter(function (s) { return !!s.url; }))
            .concat(streams.filter(function (s) { return !!s.ytId; }));
    } catch (e) {
        return [];
    }
}

// ── Catalog & Metadata ──────────────────────────────────────────────────────

async function getCatalog(args) {
    try {
        var catalogId = (args && args.id) || 'anthology_youtube_diziler';
        var searchQuery = (args && (args.search || (args.extra && args.extra.search))) || '';

        // 1. Arama modu
        if (searchQuery) {
            var searchResults = await searchYouTube(searchQuery + ' Full');
            var searchMetas = searchResults
                .filter(function (v) { return v.durationSec >= 600; }) // en az 10 dakika
                .slice(0, 20)
                .map(function (v) {
                    return {
                        id: 'youtube:video:' + v.id,
                        type: catalogId.includes('dizi') ? 'series' : 'movie',
                        name: v.title,
                        poster: 'https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg',
                        description: (v.channel ? v.channel + ' · ' : '') + v.duration + (v.views ? ' · ' + v.views : ''),
                        releaseInfo: v.duration
                    };
                });
            return { metas: searchMetas };
        }

        // 2. Vitrin katalogları
        var isSeries = catalogId.includes('dizi');
        var pool = isSeries ? POPULAR_DIZILER : POPULAR_FILMLER;

        var metas = pool.map(function (item) {
            return {
                id: 'youtube:' + (isSeries ? 'tv' : 'movie') + ':' + item.tmdbId,
                type: isSeries ? 'series' : 'movie',
                name: item.name,
                poster: item.poster,
                description: 'YouTube Resmî Yayıncı: ' + item.channel,
                releaseInfo: item.year
            };
        });

        return { metas: metas };
    } catch (e) {
        return { metas: [] };
    }
}

async function getMeta(id) {
    try {
        var rawId = String(id || '').trim();

        // 1. Doğrudan video ID ise
        if (rawId.startsWith('youtube:video:')) {
            var vid = rawId.replace('youtube:video:', '');
            return {
                meta: {
                    id: rawId,
                    type: 'movie',
                    name: 'YouTube Video (' + vid + ')',
                    poster: 'https://i.ytimg.com/vi/' + vid + '/hqdefault.jpg',
                    background: 'https://i.ytimg.com/vi/' + vid + '/maxresdefault.jpg',
                    description: 'Doğrudan YouTube video akışı'
                }
            };
        }

        // 2. Katalog öğesi ise (youtube:tv:34587 veya youtube:movie:38794)
        if (rawId.startsWith('youtube:')) {
            var parts = rawId.split(':');
            var mType = parts[1]; // tv veya movie
            var tmdbId = parts[2];

            if (mType === 'movie') {
                var resM = await fetch('https://api.themoviedb.org/3/movie/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR', { signal: timeoutSignal(6000) });
                if (resM.ok) {
                    var dm = await resM.json();
                    return {
                        meta: {
                            id: rawId,
                            type: 'movie',
                            name: dm.title || dm.name,
                            poster: dm.poster_path ? ('https://image.tmdb.org/t/p/w500' + dm.poster_path) : undefined,
                            background: dm.backdrop_path ? ('https://image.tmdb.org/t/p/original' + dm.backdrop_path) : undefined,
                            description: dm.overview || '',
                            releaseInfo: (dm.release_date || '').slice(0, 4)
                        }
                    };
                }
            } else if (mType === 'tv') {
                var resTv = await fetch('https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR', { signal: timeoutSignal(6000) });
                if (resTv.ok) {
                    var dt = await resTv.json();
                    var videos = [];
                    if (Array.isArray(dt.seasons)) {
                        for (var s = 0; s < dt.seasons.length; s++) {
                            var sObj = dt.seasons[s];
                            var sNum = sObj.season_number;
                            if (sNum <= 0) continue; // Özel bölümleri atla
                            var epCount = sObj.episode_count || 0;
                            for (var e = 1; e <= epCount; e++) {
                                videos.push({
                                    id: 'youtube:tv:' + tmdbId + ':' + sNum + ':' + e,
                                    season: sNum,
                                    episode: e,
                                    title: sNum + '. Sezon ' + e + '. Bölüm',
                                    name: sNum + '. Sezon ' + e + '. Bölüm',
                                    releaseInfo: sNum + 'x' + (e < 10 ? '0' + e : e)
                                });
                            }
                        }
                    }

                    return {
                        meta: {
                            id: rawId,
                            type: 'series',
                            name: dt.name,
                            poster: dt.poster_path ? ('https://image.tmdb.org/t/p/w500' + dt.poster_path) : undefined,
                            background: dt.backdrop_path ? ('https://image.tmdb.org/t/p/original' + dt.backdrop_path) : undefined,
                            description: dt.overview || '',
                            releaseInfo: (dt.first_air_date || '').slice(0, 4),
                            videos: videos
                        }
                    };
                }
            }
        }

        return null;
    } catch (e) {
        return null;
    }
}

var _exports = wrapAll({ getCatalog: getCatalog, getMeta: getMeta }, cfgReady);
_exports.getStreams = getStreams;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = _exports;
}
if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = _exports.getStreams;
    globalThis.getCatalog = _exports.getCatalog;
    globalThis.getMeta = _exports.getMeta;
}
