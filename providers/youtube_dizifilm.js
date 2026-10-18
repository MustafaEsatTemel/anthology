/**
 * Anthology Provider: youtube_dizifilm
 * Built from src/youtube_dizifilm/index.js
 * Build: v1.8.27 (anthology build system)
 */
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/shared/quality.js
var require_quality = __commonJS({
  "src/shared/quality.js"(exports2, module2) {
    function getQualityScore(s) {
      if (!s) return 0;
      if (!s.url) return 1;
      var q = ((s.quality || "") + " " + (s.title || "") + " " + (s.name || "")).toLowerCase();
      var score = 0;
      if (/\b(4k|2160p?|uhd)\b/.test(q)) score = 2160;
      else if (/\b(2k|1440p?|qhd)\b/.test(q)) score = 1440;
      else if (/\b(1080p?|fhd)\b/.test(q)) score = 1080;
      else if (/\b(720p?|hd)\b/.test(q)) score = 720;
      else if (/\b(540p?)\b/.test(q)) score = 540;
      else if (/\b(480p?|sd)\b/.test(q)) score = 480;
      else if (/\b(360p?)\b/.test(q)) score = 360;
      else if (/\b(240p?)\b/.test(q)) score = 240;
      if (score === 0 && s.title) {
        var text = s.title.toLowerCase();
        if (/\b(4k|2160p|uhd)\b/.test(text)) score = 2160;
        else if (/\b(2k|1440p|qhd)\b/.test(text)) score = 1440;
        else if (/\b(1080p|fhd)\b/.test(text)) score = 1080;
        else if (/\b(720p|hd)\b/.test(text)) score = 720;
        else if (/\b(480p|sd)\b/.test(text)) score = 480;
        else if (/\b(360p)\b/.test(text)) score = 360;
        else if (/\b(240p)\b/.test(text)) score = 240;
      }
      if (score === 0 && s.url) {
        var u = s.url.toLowerCase();
        if (/[\/_.-](2160p?|4k)[\/_.-]/.test(u)) score = 2160;
        else if (/[\/_.-](1440p?|2k)[\/_.-]/.test(u)) score = 1440;
        else if (/[\/_.-](1080p?|fhd)[\/_.-]/.test(u)) score = 1080;
        else if (/[\/_.-](720p?|hd)[\/_.-]/.test(u)) score = 720;
        else if (/[\/_.-](480p?|sd)[\/_.-]/.test(u)) score = 480;
        else if (/[\/_.-](360p?)[\/_.-]/.test(u)) score = 360;
      }
      var isDirectMp4 = s.format === "mp4" || s.type === "mp4" || !s.isHls && s.url && (s.url.endsWith(".mp4") || s.url.includes(".mp4?"));
      if (isDirectMp4 && score > 0) score += 1;
      return score;
    }
    function sortStreamsByQuality2(streams) {
      if (!Array.isArray(streams) || streams.length === 0) return streams;
      return streams.slice().sort(function(a, b) {
        return getQualityScore(b) - getQualityScore(a);
      });
    }
    module2.exports = {
      getQualityScore,
      sortStreamsByQuality: sortStreamsByQuality2
    };
  }
});

// src/shared/config.js
var require_config = __commonJS({
  "src/shared/config.js"(exports2, module2) {
    var CONFIG_URL = "https://raw.githubusercontent.com/falsisdev/anthology/main/config.json";
    var CONFIG_TTL_MS = 10 * 60 * 1e3;
    var _cfg = null;
    var _cfgTime = 0;
    function _cfgLocalRead() {
      try {
        if (typeof require === "undefined") return null;
        var fs = require("fs");
        var path = require("path");
        if (!fs || !path || typeof fs.existsSync !== "function") return null;
        var dir = typeof __dirname !== "undefined" ? __dirname : "";
        var candidates = [
          path.resolve(dir, "..", "config.json"),
          // providers/<name>.js
          path.resolve(dir, "..", "..", "config.json"),
          // src/<name>/index.js
          path.resolve(dir, "config.json")
        ];
        for (var i = 0; i < candidates.length; i++) {
          if (fs.existsSync(candidates[i])) {
            return JSON.parse(fs.readFileSync(candidates[i], "utf8"));
          }
        }
      } catch (e) {
        return null;
      }
      return null;
    }
    function _cfgFetch(options) {
      if (options && typeof options.fetchJson === "function") {
        return options.fetchJson(CONFIG_URL, { headers: { "Accept": "application/json" } });
      }
      return fetch(CONFIG_URL, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "application/json"
        }
      }).then(function(res) {
        if (!res || !res.ok) throw new Error("config.json " + (res && res.status));
        if (typeof res.json === "function") return res.json();
        return res.text().then(function(t) {
          return JSON.parse(t);
        });
      });
    }
    function loadConfig2(options) {
      var now = Date.now();
      if (_cfg && now - _cfgTime < CONFIG_TTL_MS) return Promise.resolve(_cfg);
      var local = _cfgLocalRead();
      if (local && typeof local === "object") {
        _cfg = local;
        _cfgTime = now;
        return Promise.resolve(_cfg);
      }
      return _cfgFetch(options).then(function(c) {
        _cfg = c && typeof c === "object" ? c : {};
        _cfgTime = now;
        return _cfg;
      }).catch(function() {
        _cfg = null;
        _cfgTime = now;
        return _cfg;
      });
    }
    function val2(pathStr) {
      if (!_cfg || !pathStr) return void 0;
      var parts = String(pathStr).split(".");
      var cur = _cfg;
      for (var i = 0; i < parts.length; i++) {
        if (cur == null || typeof cur !== "object") return void 0;
        cur = cur[parts[i]];
      }
      return cur;
    }
    function wrapAll2(obj, pre) {
      var out = {};
      for (var k in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
          if (typeof obj[k] === "function") {
            (function(name, fn) {
              out[name] = function() {
                var self = this;
                var args = arguments;
                var chain = pre ? pre() : Promise.resolve();
                return chain.then(function() {
                  return fn.apply(self, args);
                });
              };
            })(k, obj[k]);
          } else {
            out[k] = obj[k];
          }
        }
      }
      return out;
    }
    if (typeof module2 !== "undefined" && module2.exports) {
      module2.exports = { loadConfig: loadConfig2, val: val2, wrapAll: wrapAll2 };
    }
  }
});

// src/shared/http.js
var require_http = __commonJS({
  "src/shared/http.js"(exports2, module2) {
    var DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    function timeoutSignal2(ms) {
      if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
        return AbortSignal.timeout(ms);
      }
      var controller = new AbortController();
      setTimeout(function() {
        controller.abort();
      }, ms);
      return controller.signal;
    }
    function fetchWithTimeout(url, options, ms) {
      ms = ms || 1e4;
      options = options || {};
      if (!options.signal) {
        options.signal = timeoutSignal2(ms);
      }
      if (!options.headers) {
        options.headers = {};
      }
      if (!options.headers["User-Agent"] && !options.headers["user-agent"]) {
        options.headers["User-Agent"] = DEFAULT_UA;
      }
      return fetch(url, options);
    }
    module2.exports = {
      DEFAULT_UA,
      timeoutSignal: timeoutSignal2,
      fetchWithTimeout
    };
  }
});

// src/shared/turkish_series.js
var require_turkish_series = __commonJS({
  "src/shared/turkish_series.js"(exports2, module2) {
    var TMDB_API_BASE = "https://api.themoviedb.org/3";
    function normalizeSeriesId2(raw) {
      var out = { id: "", kind: "unknown", season: 0, episode: 0 };
      if (typeof raw !== "string") return out;
      var val2 = raw.trim();
      var seg = val2.split(":");
      if (seg.length >= 3 && /^\d+$/.test(seg[seg.length - 1]) && /^\d+$/.test(seg[seg.length - 2])) {
        out.season = parseInt(seg[seg.length - 2], 10);
        out.episode = parseInt(seg[seg.length - 1], 10);
        seg = seg.slice(0, seg.length - 2);
        val2 = seg.join(":");
      } else if (seg.length === 2 && /^\d+$/.test(seg[1])) {
        out.episode = parseInt(seg[1], 10);
        val2 = seg[0];
      }
      var core = String(val2).trim();
      core = core.replace(/^(cinemata|cine|tmdb|tvdb|imdb|metadata|mal|id|movieid|seriesid|showid|slug|tv):/i, "");
      if (/^tt\d+$/i.test(core)) {
        out.id = core;
        out.kind = "imdb";
      } else if (/^\d+$/.test(core)) {
        out.id = core;
        out.kind = "tmdb";
      } else if (core) {
        out.id = core;
        out.kind = "title";
      }
      return out;
    }
    function asciiFold2(s) {
      s = String(s || "");
      try {
        if (typeof s.normalize === "function") s = s.normalize("NFD");
      } catch (e) {
      }
      s = s.replace(/[\u0300-\u036f]/g, "");
      s = s.toLowerCase();
      var map = { "\xE7": "c", "\u011F": "g", "\u0131": "i", "\u0130": "i", "\xF6": "o", "\u015F": "s", "\xFC": "u", "\xE2": "a", "\xEE": "i", "\xFB": "u" };
      var out = "";
      for (var i = 0; i < s.length; i++) {
        var ch = s.charAt(i);
        out += map[ch] !== void 0 ? map[ch] : ch;
      }
      return out;
    }
    function cleanTitle2(t) {
      return asciiFold2(String(t || "")).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
    }
    function tokensMatch(a, b) {
      var ta = cleanTitle2(a).split(" ").filter(function(x) {
        return x.length > 1;
      });
      var tb = cleanTitle2(b).split(" ").filter(function(x) {
        return x.length > 1;
      });
      if (!ta.length || !tb.length) return 0;
      var hits = 0;
      for (var i = 0; i < ta.length; i++) {
        for (var j = 0; j < tb.length; j++) {
          if (ta[i] === tb[j]) {
            hits++;
            break;
          }
        }
      }
      return hits / Math.max(ta.length, tb.length);
    }
    function tmdbJson(url) {
      return __async(this, null, function* () {
        try {
          var res = yield fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
              "Accept": "application/json"
            }
          });
          if (!res.ok) return null;
          return yield res.json();
        } catch (e) {
          return null;
        }
      });
    }
    function pickResults(data, preferTv) {
      if (!data) return null;
      if (preferTv) {
        if (data.tv_results && data.tv_results[0]) return { type: "tv", item: data.tv_results[0] };
        if (data.movie_results && data.movie_results[0]) return { type: "movie", item: data.movie_results[0] };
      } else {
        if (data.movie_results && data.movie_results[0]) return { type: "movie", item: data.movie_results[0] };
        if (data.tv_results && data.tv_results[0]) return { type: "tv", item: data.tv_results[0] };
      }
      return null;
    }
    function resolveSeriesInfo(rawId, mediaType, apiKey) {
      return __async(this, null, function* () {
        var out = { title: "", origTitle: "", numericId: "", imdbId: "", aliases: [], seasons: [], kind: "unknown", type: "tv" };
        var key = apiKey || "500330721680edb6d5f7f12ba7cd9023";
        var norm = normalizeSeriesId2(rawId);
        if (!norm.id) return out;
        out.kind = norm.kind;
        var wantTv = mediaType === "tv" || mediaType === "series" || mediaType === "show" || norm.season > 0 || norm.kind !== "movie";
        if (mediaType === "movie") wantTv = false;
        var numericId = "";
        var name = "";
        var original = "";
        var foundType = wantTv ? "tv" : "movie";
        if (norm.kind === "imdb") {
          var fd = yield tmdbJson(TMDB_API_BASE + "/find/" + norm.id + "?api_key=" + key + "&external_source=imdb_id&language=tr-TR");
          var hit = pickResults(fd, wantTv);
          if (!hit && wantTv) {
            hit = pickResults(fd, false);
          }
          if (hit) {
            foundType = hit.type;
            numericId = String(hit.item.id);
            name = hit.item.name || hit.item.title || "";
            original = hit.item.original_name || hit.item.original_title || "";
          }
        } else if (norm.kind === "tmdb") {
          numericId = norm.id;
        } else {
          var sd = yield tmdbJson(TMDB_API_BASE + "/search/tv?query=" + encodeURIComponent(norm.id) + "&api_key=" + key + "&language=tr-TR&page=1");
          var results = sd && sd.results || [];
          var best = null;
          var bestScore = -1;
          var target = cleanTitle2(norm.id);
          for (var i = 0; i < results.length; i++) {
            var r = results[i];
            var score = tokensMatch(r.name, norm.id);
            if (cleanTitle2(r.name) === target) score = 1;
            if (score > bestScore) {
              bestScore = score;
              best = r;
            }
          }
          if (!best && results.length > 0) best = results[0];
          if (best) {
            numericId = String(best.id);
            name = best.name || "";
            original = best.original_name || "";
          }
        }
        if (!numericId) return out;
        out.numericId = numericId;
        out.type = foundType;
        var dres = yield tmdbJson(TMDB_API_BASE + "/" + foundType + "/" + numericId + "?api_key=" + key + "&language=tr-TR");
        if (dres) {
          name = dres.name || dres.title || name;
          original = dres.original_name || dres.original_title || original;
          if (foundType === "tv" && dres.seasons) out.seasons = dres.seasons;
        }
        out.title = name || norm.id;
        out.origTitle = original || name || norm.id;
        var ext = yield tmdbJson(TMDB_API_BASE + "/" + foundType + "/" + numericId + "/external_ids?api_key=" + key);
        if (ext && ext.imdb_id) {
          out.imdbId = ext.imdb_id;
          out.aliases.push(ext.imdb_id);
        }
        var trs = yield tmdbJson(TMDB_API_BASE + "/" + foundType + "/" + numericId + "/translations?api_key=" + key);
        if (trs && trs.translations) {
          for (var t = 0; t < trs.translations.length; t++) {
            var trName = trs.translations[t].data && trs.translations[t].data.name;
            if (trName && trName !== name && trName !== original) {
              out.aliases.push(trName);
            }
          }
        }
        if (foundType === "movie") {
          var alt = yield tmdbJson(TMDB_API_BASE + "/movie/" + numericId + "/alternative_titles?api_key=" + key + "&country=TR");
          if (alt && alt.titles) {
            for (var a = 0; a < alt.titles.length; a++) {
              var tn = alt.titles[a].title;
              if (tn && tn !== name && tn !== original && out.aliases.indexOf(tn) === -1) out.aliases.push(tn);
            }
          }
        }
        var seen = {};
        seen[asciiFold2(name)] = true;
        seen[asciiFold2(original)] = true;
        var aliases = [];
        for (var k = 0; k < out.aliases.length; k++) {
          var fa = asciiFold2(out.aliases[k]);
          if (!fa || seen[fa]) continue;
          seen[fa] = true;
          aliases.push(out.aliases[k]);
        }
        if (aliases.length > 8) aliases.length = 8;
        out.aliases = aliases;
        return out;
      });
    }
    function seriesSearchTitles(show) {
      var titles = [];
      function push(t) {
        t = String(t || "").trim();
        if (!t) return;
        for (var k = 0; k < titles.length; k++) {
          if (asciiFold2(titles[k]) === asciiFold2(t)) return;
          if (asciiFold2(titles[k]) === asciiFold2(t).replace(/[^a-z0-9]+/g, " ").trim() && asciiFold2(t).replace(/[^a-z0-9]+/g, " ").trim() === asciiFold2(titles[k]).replace(/[^a-z0-9]+/g, " ").trim()) return;
        }
        titles.push(t);
      }
      push(show && show.title);
      push(show && (show.orig || show.origTitle));
      push(show && show.name);
      var als = show && (show.alt || show.aliases);
      if (als) {
        for (var j = 0; j < als.length; j++) push(als[j]);
      }
      return titles;
    }
    module2.exports = {
      normalizeSeriesId: normalizeSeriesId2,
      resolveSeriesInfo,
      seriesSearchTitles,
      asciiFold: asciiFold2
    };
  }
});

// src/youtube_dizifilm/http.js
var require_http2 = __commonJS({
  "src/youtube_dizifilm/http.js"(exports2, module2) {
    function createSession2(timeoutMs) {
      var deadline = Date.now() + timeoutMs;
      var pending = [];
      var closed = false;
      return {
        remaining: function() {
          return closed ? 0 : Math.max(0, deadline - Date.now());
        },
        request: function(url, options, read, capMs) {
          var ms = Math.min(capMs || timeoutMs, closed ? 0 : deadline - Date.now());
          if (ms <= 0) return Promise.resolve(null);
          return new Promise(function(resolve) {
            var controller = typeof AbortController === "function" ? new AbortController() : null;
            var done = false;
            var timer;
            function finish(value) {
              if (done) return;
              done = true;
              clearTimeout(timer);
              var index = pending.indexOf(cancel);
              if (index !== -1) pending.splice(index, 1);
              resolve(value);
            }
            function cancel() {
              finish(null);
              if (controller) controller.abort();
            }
            pending.push(cancel);
            timer = setTimeout(cancel, ms);
            var opts = Object.assign({}, options || {});
            if (controller) opts.signal = controller.signal;
            Promise.resolve().then(function() {
              if (done) return null;
              return fetch(url, opts);
            }).then(function(res) {
              if (!res) return null;
              if (done || !res.ok) {
                if (res.body && typeof res.body.cancel === "function") res.body.cancel().catch(function() {
                });
                return null;
              }
              return read(res);
            }).then(finish, function() {
              finish(null);
            });
          });
        },
        close: function() {
          closed = true;
          pending.slice().forEach(function(cancel) {
            cancel();
          });
        }
      };
    }
    module2.exports = { createSession: createSession2 };
  }
});

// src/youtube_dizifilm/playback.js
var require_playback = __commonJS({
  "src/youtube_dizifilm/playback.js"(exports2, module2) {
    var { createSession: createSession2 } = require_http2();
    var SAFARI_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Safari/605.1.15";
    var ANDROID_UA = "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip";
    var CLIENTS = [
      { clientName: "WEB", clientVersion: "2.20261002.01.00", userAgent: SAFARI_UA },
      { clientName: "ANDROID", clientVersion: "20.10.38", userAgent: ANDROID_UA }
    ];
    function mediaUrl(url) {
      return typeof url === "string" && /^https:\/\/(?:[a-z0-9-]+\.)*googlevideo\.com\//i.test(url);
    }
    function header(res, name) {
      return res.headers && typeof res.headers.get === "function" ? res.headers.get(name) || "" : "";
    }
    function attributes(line) {
      var out = {};
      var re = /([A-Z0-9-]+)=("[^"]*"|[^,]*)/g;
      var m;
      while (m = re.exec(line)) out[m[1]] = m[2].replace(/^"|"$/g, "");
      return out;
    }
    function absoluteUrl(value, base) {
      if (/^https:\/\//i.test(value)) return value;
      var origin = base.match(/^https:\/\/[^/]+/i);
      if (!origin || /^\/\//.test(value) || /^[a-z]+:/i.test(value)) return "";
      if (value.charAt(0) === "/") return origin[0] + value;
      return base.replace(/[?#].*$/, "").replace(/[^/]*$/, "") + value;
    }
    function compatibleCodecs(codecs) {
      var parts = String(codecs || "").split(",").map(function(s) {
        return s.trim().toLowerCase();
      });
      return parts.length === 2 && parts.some(function(s) {
        return /^avc1\./.test(s);
      }) && parts.some(function(s) {
        return s === "mp4a.40.2";
      });
    }
    function parseHlsVariants(text, base) {
      if (!/^#EXTM3U(?:\s|$)/.test(text.trim())) return [];
      var lines = text.split(/\r?\n/).map(function(s) {
        return s.trim();
      });
      var groups = {};
      lines.forEach(function(line) {
        if (line.indexOf("#EXT-X-MEDIA:") !== 0) return;
        var a2 = attributes(line);
        if (a2.TYPE === "AUDIO") {
          var id = a2["GROUP-ID"];
          if (!groups[id]) groups[id] = [];
          groups[id].push(a2);
        }
      });
      var variants = [];
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].indexOf("#EXT-X-STREAM-INF:") !== 0) continue;
        var a = attributes(lines[i]);
        var resolution = (a.RESOLUTION || "").match(/^(\d+)x(\d+)$/);
        if (!resolution || !compatibleCodecs(a.CODECS)) continue;
        var height = Number(resolution[2]);
        if (height > 1080 || height < 1 || Number(a["FRAME-RATE"] || 0) > 30) continue;
        if (a.AUDIO && (!groups[a.AUDIO] || groups[a.AUDIO].some(function(g) {
          return !!g.URI;
        }))) continue;
        var next = i + 1;
        while (next < lines.length && !lines[next]) next++;
        if (!lines[next] || lines[next].charAt(0) === "#") continue;
        var url = absoluteUrl(lines[next], base);
        if (mediaUrl(url)) variants.push({ url, height, bandwidth: Number(a.BANDWIDTH || 0) });
      }
      return variants.sort(function(a2, b) {
        return b.height - a2.height || b.bandwidth - a2.bandwidth;
      });
    }
    function validateHls(session, url, headers) {
      return __async(this, null, function* () {
        return session.request(url, { headers }, function(res) {
          return __async(this, null, function* () {
            if (/text\/html/i.test(header(res, "content-type"))) return false;
            var text = yield res.text();
            if (!/^#EXTM3U(?:\s|$)/.test(text.trim()) || !/#EXTINF:/.test(text)) return false;
            if (/#EXT-X-KEY:(?![^\r\n]*METHOD=NONE)/.test(text)) return false;
            var segment = text.split(/\r?\n/).map(function(s) {
              return s.trim();
            }).find(function(s) {
              return s && s.charAt(0) !== "#";
            });
            return !!segment && mediaUrl(absoluteUrl(segment, url));
          });
        }, 1200);
      });
    }
    function validateMp4(session, url, headers) {
      return __async(this, null, function* () {
        var probe = url + (url.indexOf("?") === -1 ? "?" : "&") + "range=0-1023";
        return session.request(probe, { headers: Object.assign({}, headers, { Range: "bytes=0-1023" }) }, function(res) {
          return __async(this, null, function* () {
            var type = header(res, "content-type");
            var length = Number(header(res, "content-length"));
            var range = header(res, "content-range");
            var ok = /^video\/mp4(?:;|$)/i.test(type) && (res.status === 206 || length > 0 && length <= 1024);
            if (range && !/^bytes 0-\d+\//i.test(range)) ok = false;
            if (res.body && typeof res.body.cancel === "function") yield res.body.cancel();
            return ok;
          });
        }, 1200);
      });
    }
    function resolveYouTubeStreams2(id, options) {
      return __async(this, null, function* () {
        options = options || {};
        if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return [];
        var session = createSession2(Math.min(4500, options.timeoutMs === void 0 ? 4500 : options.timeoutMs));
        var streams = [];
        try {
          yield Promise.all(CLIENTS.map(function(client) {
            return __async(this, null, function* () {
              var headers = { "User-Agent": client.userAgent };
              var data = yield session.request("https://www.youtube.com/youtubei/v1/player", {
                method: "POST",
                headers: Object.assign({ "Content-Type": "application/json" }, headers),
                body: JSON.stringify({
                  videoId: id,
                  context: { client: Object.assign({ hl: "tr", gl: "TR" }, client) }
                })
              }, function(res) {
                return res.json();
              }, 2e3);
              if (!data || !data.playabilityStatus || data.playabilityStatus.status !== "OK" || !data.streamingData) return;
              var sd = data.streamingData;
              var details = data.videoDetails || {};
              if (details.videoId && details.videoId !== id) return;
              function emit(url, height, isHls) {
                streams.push({
                  url,
                  quality: height ? height + "p" : "Bilinmiyor",
                  height,
                  isHls,
                  format: isHls ? "hls" : "mp4",
                  headers,
                  author: details.author || "",
                  videoTitle: details.title || "",
                  viewCount: details.viewCount || ""
                });
              }
              yield Promise.all([
                (function() {
                  return __async(this, null, function* () {
                    if (!mediaUrl(sd.hlsManifestUrl)) return;
                    var manifest = yield session.request(sd.hlsManifestUrl, { headers }, function(res) {
                      return res.text();
                    }, 1200);
                    if (!manifest) return;
                    var variants = parseHlsVariants(manifest, sd.hlsManifestUrl);
                    var selected = variants.slice(0, 1);
                    var lower = variants.find(function(v) {
                      return v.height <= 720 && selected[0] && v.height < selected[0].height;
                    });
                    if (lower) selected.push(lower);
                    yield Promise.all(selected.map(function(v) {
                      return __async(this, null, function* () {
                        if (yield validateHls(session, v.url, headers)) emit(v.url, v.height, true);
                      });
                    }));
                  });
                })(),
                (function() {
                  return __async(this, null, function* () {
                    var formats = (Array.isArray(sd.formats) ? sd.formats : []).filter(function(f2) {
                      if (!f2 || typeof f2 !== "object") return false;
                      var codec = (f2.mimeType || "").match(/codecs="([^"]+)"/);
                      return mediaUrl(f2.url) && /^video\/mp4\b/.test(f2.mimeType || "") && codec && compatibleCodecs(codec[1]) && !f2.drmFamilies && !f2.signatureCipher && !f2.cipher && Number(f2.height || 0) <= 1080 && Number(f2.fps || 0) <= 30;
                    }).sort(function(a, b) {
                      return Number(b.height || 0) - Number(a.height || 0);
                    });
                    for (var i = 0; i < Math.min(formats.length, 2); i++) {
                      var f = formats[i];
                      if (yield validateMp4(session, f.url, headers)) {
                        emit(f.url, Number(f.height) || 0, false);
                        break;
                      }
                    }
                  });
                })()
              ]);
            });
          }));
        } finally {
          session.close();
        }
        var seen = {};
        return streams.sort(function(a, b) {
          return b.height - a.height || Number(b.isHls) - Number(a.isHls);
        }).filter(function(s) {
          var key = s.format + ":" + s.height;
          if (seen[key]) return false;
          seen[key] = true;
          return true;
        });
      });
    }
    module2.exports = { resolveYouTubeStreams: resolveYouTubeStreams2, parseHlsVariants };
  }
});

// src/youtube_dizifilm/index.js
var { sortStreamsByQuality } = require_quality();
var { loadConfig, val, wrapAll } = require_config();
var { timeoutSignal } = require_http();
var { normalizeSeriesId } = require_turkish_series();
var { resolveYouTubeStreams } = require_playback();
var { createSession } = require_http2();
var _cfgReady = null;
var BETA_LABEL = " \xB7 BETA 1.8.27";
function cfgReady() {
  if (!_cfgReady) {
    var configSession = createSession(500);
    _cfgReady = loadConfig({ fetchJson: function(url, options) {
      return configSession.request(url, options, function(res) {
        return res.json();
      });
    } }).then(function() {
      configSession.close();
      var v;
      v = val("api_keys.tmdb");
      if (v) TMDB_API_KEY = String(v);
      v = val("urls.youtube.innertube_key");
      if (v) INNERTUBE_KEY = String(v);
    });
  }
  return _cfgReady;
}
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";
var INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
var POPULAR_DIZILER = [
  { tmdbId: "34587", name: "Kurtlar Vadisi", year: "2003", poster: "https://image.tmdb.org/t/p/w500/yX6JEIijuH6KNCgO8I2yLKu2Psb.jpg", channel: "Kurtlar Vadisi" },
  { tmdbId: "32519", name: "Ezel", year: "2009", poster: "https://image.tmdb.org/t/p/w500/pHSjh4MINU2JnK7qQvjogQaX3wr.jpg", channel: "Ezel" },
  { tmdbId: "32433", name: "A\u015Fk-\u0131 Memnu", year: "2008", poster: "https://image.tmdb.org/t/p/w500/bJbL2fG6t4b7qH9eE2K3jP0v5a7.jpg", channel: "Kanal D" },
  { tmdbId: "39176", name: "Behzat \xC7.", year: "2010", poster: "https://image.tmdb.org/t/p/w500/iL8P2aX8n7j9t9K8p1v0m5k3b7g.jpg", channel: "Adam Film" },
  { tmdbId: "39352", name: "Leyla ile Mecnun", year: "2011", poster: "https://image.tmdb.org/t/p/w500/8tH8rZ2vG8o1m3k5b7p9q0r1s2t.jpg", channel: "TRT 1" },
  { tmdbId: "43865", name: "Kuzey G\xFCney", year: "2011", poster: "https://image.tmdb.org/t/p/w500/q2m7b9k5p3j8r1v0m5k3b7g9q0r.jpg", channel: "Kuzey G\xFCney" },
  { tmdbId: "32520", name: "Avrupa Yakas\u0131", year: "2004", poster: "https://image.tmdb.org/t/p/w500/v1m5k3b7g9q0r1s2t8h8rZ2vG8o.jpg", channel: "Avrupa Yakas\u0131" },
  { tmdbId: "60682", name: "Karde\u015F Pay\u0131", year: "2014", poster: "https://image.tmdb.org/t/p/w500/3j8r1v0m5k3b7g9q0r1s2t8h8rZ.jpg", channel: "Karde\u015F Pay\u0131" },
  { tmdbId: "32522", name: "Geni\u015F Aile", year: "2009", poster: "https://image.tmdb.org/t/p/w500/8r1v0m5k3b7g9q0r1s2t8h8rZ2v.jpg", channel: "D Productions" },
  { tmdbId: "32521", name: "Cennet Mahallesi", year: "2004", poster: "https://image.tmdb.org/t/p/w500/m5k3b7g9q0r1s2t8h8rZ2vG8o1m.jpg", channel: "Erler Film T\xFCrker \u0130nano\u011Flu" },
  { tmdbId: "32524", name: "Akasya Dura\u011F\u0131", year: "2008", poster: "https://image.tmdb.org/t/p/w500/7g9q0r1s2t8h8rZ2vG8o1m3k5b7.jpg", channel: "Erler Film" },
  { tmdbId: "61483", name: "Medcezir", year: "2013", poster: "https://image.tmdb.org/t/p/w500/9q0r1s2t8h8rZ2vG8o1m3k5b7p9.jpg", channel: "Medcezir" },
  { tmdbId: "68349", name: "\u0130\xE7erde", year: "2016", poster: "https://image.tmdb.org/t/p/w500/r1s2t8h8rZ2vG8o1m3k5b7p9q0r.jpg", channel: "\u0130\xE7erde" },
  { tmdbId: "74431", name: "\xC7ukur", year: "2017", poster: "https://image.tmdb.org/t/p/w500/2t8h8rZ2vG8o1m3k5b7p9q0r1s2.jpg", channel: "\xC7ukur" },
  { tmdbId: "39351", name: "Muhte\u015Fem Y\xFCzy\u0131l", year: "2011", poster: "https://image.tmdb.org/t/p/w500/8h8rZ2vG8o1m3k5b7p9q0r1s2t8.jpg", channel: "Tims Productions" },
  { tmdbId: "32523", name: "Yaprak D\xF6k\xFCm\xFC", year: "2006", poster: "https://image.tmdb.org/t/p/w500/o1m3k5b7p9q0r1s2t8h8rZ2vG8o.jpg", channel: "Kanal D" },
  { tmdbId: "46648", name: "Karaday\u0131", year: "2012", poster: "https://image.tmdb.org/t/p/w500/m3k5b7p9q0r1s2t8h8rZ2vG8o1m.jpg", channel: "Karaday\u0131" },
  { tmdbId: "112454", name: "G\xF6n\xFCl Da\u011F\u0131", year: "2020", poster: "https://image.tmdb.org/t/p/w500/5b7p9q0r1s2t8h8rZ2vG8o1m3k5.jpg", channel: "TRT 1" }
];
var POPULAR_FILMLER = [
  { tmdbId: "38794", name: "Tosun Pa\u015Fa", year: "1976", poster: "https://image.tmdb.org/t/p/w500/aE8cMuRNYltzzW36N2hC3zyZQm2.jpg", channel: "ARZU F\u0130LM" },
  { tmdbId: "16842", name: "Hababam S\u0131n\u0131f\u0131", year: "1975", poster: "https://image.tmdb.org/t/p/w500/q2m7b9k5p3j8r1v0m5k3b7g9q0r.jpg", channel: "ARZU F\u0130LM" },
  { tmdbId: "38795", name: "\u015Eaban O\u011Flu \u015Eaban", year: "1977", poster: "https://image.tmdb.org/t/p/w500/v1m5k3b7g9q0r1s2t8h8rZ2vG8o.jpg", channel: "ARZU F\u0130LM" },
  { tmdbId: "38796", name: "S\xFCt Karde\u015Fler", year: "1976", poster: "https://image.tmdb.org/t/p/w500/3j8r1v0m5k3b7g9q0r1s2t8h8rZ.jpg", channel: "ARZU F\u0130LM" },
  { tmdbId: "38798", name: "Kibar Feyzo", year: "1978", poster: "https://image.tmdb.org/t/p/w500/8r1v0m5k3b7g9q0r1s2t8h8rZ2v.jpg", channel: "ARZU F\u0130LM" },
  { tmdbId: "38797", name: "\xC7\xF6p\xE7\xFCler Kral\u0131", year: "1977", poster: "https://image.tmdb.org/t/p/w500/m5k3b7g9q0r1s2t8h8rZ2vG8o1m.jpg", channel: "ARZU F\u0130LM" },
  { tmdbId: "38799", name: "Ne\u015Feli G\xFCnler", year: "1978", poster: "https://image.tmdb.org/t/p/w500/7g9q0r1s2t8h8rZ2vG8o1m3k5b7.jpg", channel: "ARZU F\u0130LM" },
  { tmdbId: "88451", name: "Davaro", year: "1981", poster: "https://image.tmdb.org/t/p/w500/9q0r1s2t8h8rZ2vG8o1m3k5b7p9.jpg", channel: "G\xFCl\u015Fah Film" },
  { tmdbId: "88452", name: "Z\xFC\u011F\xFCrt A\u011Fa", year: "1985", poster: "https://image.tmdb.org/t/p/w500/r1s2t8h8rZ2vG8o1m3k5b7p9q0r.jpg", channel: "Fanatik Film" },
  { tmdbId: "38800", name: "Kap\u0131c\u0131lar Kral\u0131", year: "1976", poster: "https://image.tmdb.org/t/p/w500/2t8h8rZ2vG8o1m3k5b7p9q0r1s2.jpg", channel: "ARZU F\u0130LM" },
  { tmdbId: "12621", name: "Organize \u0130\u015Fler", year: "2005", poster: "https://image.tmdb.org/t/p/w500/8h8rZ2vG8o1m3k5b7p9q0r1s2t8.jpg", channel: "BKM" },
  { tmdbId: "12620", name: "Vizontele", year: "2001", poster: "https://image.tmdb.org/t/p/w500/o1m3k5b7p9q0r1s2t8h8rZ2vG8o.jpg", channel: "BKM" },
  { tmdbId: "12619", name: "G.O.R.A.", year: "2004", poster: "https://image.tmdb.org/t/p/w500/m3k5b7p9q0r1s2t8h8rZ2vG8o1m.jpg", channel: "BKM" }
];
function asciiFold(s) {
  s = String(s || "");
  try {
    if (typeof s.normalize === "function") s = s.normalize("NFD");
  } catch (e) {
  }
  s = s.replace(/[\u0300-\u036f]/g, "");
  var map = { "\xE7": "c", "\u011F": "g", "\u0131": "i", "\u0130": "i", "\xF6": "o", "\u015F": "s", "\xFC": "u", "\xE2": "a", "\xEE": "i", "\xFB": "u" };
  var out = "";
  var lower = s.toLowerCase();
  for (var i = 0; i < lower.length; i++) {
    var ch = lower.charAt(i);
    out += map[ch] !== void 0 ? map[ch] : ch;
  }
  return out;
}
function cleanTitle(t) {
  return asciiFold(String(t || "")).replace(/[^a-z0-9]+/g, " ").trim();
}
function parseDurationSec(str) {
  if (!str) return 0;
  var parts = String(str).split(":").map(function(p) {
    return parseInt(p, 10);
  });
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}
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
      new RegExp("(?:^|[^0-9])" + ep + "\\s*\\.?\\s*(?:bolum|bolumu|b|episode|ep)(?:[^0-9]|$)", "i"),
      new RegExp("(?:bolum|bolumu|episode|ep)\\s*[:#-]?\\s*" + ep + "(?:[^0-9]|$)", "i"),
      new RegExp("(?:^|[^0-9])b" + ep + "(?:[^0-9]|$)", "i"),
      new RegExp("(?:^|\\s)-?\\s*" + ep + "\\.bolum", "i")
    ];
    if (epRegexes.some(function(r) {
      return r.test(norm);
    })) {
      matchedEp = true;
      break;
    }
  }
  if (!matchedEp) return false;
  if (season >= 1) {
    var otherSeasonRegex = /(?:^|[^0-9])([1-9]\d?)\s*\.?\s*(?:sezon|season)(?:[^0-9]|$)/i;
    var sMatch = norm.match(otherSeasonRegex);
    if (sMatch && parseInt(sMatch[1], 10) !== season) {
      return false;
    }
  }
  return true;
}
var KNOWN_CHANNELS = {
  "arzu film": "2.1M Abone",
  "trt nostalji": "667B Abone",
  "kanal d": "10.5M Abone",
  "show tv": "9.8M Abone",
  "star tv": "7.2M Abone",
  "atv": "12.8M Abone",
  "trt 1": "8.5M Abone",
  "kurtlar vadisi": "3.2M Abone",
  "ezel": "2.4M Abone",
  "bkm": "4.5M Abone",
  "fanatik film": "3.1M Abone",
  "fanatik klasik film": "1.8M Abone",
  "gulsah film": "1.2M Abone",
  "hanimin ciftligi": "197B Abone",
  "leyla ile mecnun": "1.8M Abone",
  "kuzey guney": "1.5M Abone",
  "avrupa yakasi": "1.6M Abone",
  "cukur": "7.8M Abone",
  "icerde": "3.9M Abone",
  "medcezir": "2.9M Abone",
  "karadayi": "1.1M Abone",
  "yaprak dokumu": "1.4M Abone",
  "gonul dagi": "2.3M Abone",
  "kardes payi": "1.9M Abone",
  "genis aile": "1.1M Abone",
  "cennet mahallesi": "1.5M Abone",
  "akasya duragi": "1.7M Abone",
  "muhtesem yuzyil": "3.8M Abone",
  "behzat c.": "1.2M Abone"
};
function getChannelSubscriberBadge(channel, isVerified) {
  if (!channel) return isVerified ? "\u2714" : "";
  var norm = cleanTitle(channel);
  var sub = KNOWN_CHANNELS[norm];
  if (sub) return isVerified ? "\u2714 (" + sub + ")" : "(" + sub + ")";
  return isVerified ? "\u2714" : "";
}
function parseViewCount(str) {
  if (!str) return 0;
  var s = String(str).toLowerCase().replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  var mnMatch = s.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:mn|m|milyon)/i);
  if (mnMatch) return parseFloat(mnMatch[1].replace(",", ".")) * 1e6;
  var bMatch = s.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:b|k|bin)/i);
  if (bMatch) return parseFloat(bMatch[1].replace(",", ".")) * 1e3;
  var clean = s.replace(/[^0-9]/g, "");
  return parseInt(clean, 10) || 0;
}
function formatNumberCompact(n) {
  var num = parseInt(n, 10);
  if (isNaN(num)) return "";
  if (num >= 1e6) return (num / 1e6).toFixed(1).replace(".0", "").replace(".", ",") + " Mn";
  if (num >= 1e3) return (num / 1e3).toFixed(0) + " B";
  return String(num);
}
function matchesTitle(videoTitle, targetTitle) {
  var vNorm = cleanTitle(videoTitle);
  var tNorm = cleanTitle(targetTitle);
  var tWords = tNorm.split(/\s+/).filter(function(w) {
    return w.length > 1;
  });
  var allWords = tWords.length > 0 && tWords.every(function(w) {
    return new RegExp("\\b" + w + "\\b", "i").test(vNorm);
  });
  if (!allWords) return false;
  var spinOffs = ["pusu", "teror", "gladio", "irak", "filistin", "vatan"];
  for (var s = 0; s < spinOffs.length; s++) {
    var sp = spinOffs[s];
    if (tNorm.indexOf(sp) === -1 && new RegExp("\\b" + sp + "\\b", "i").test(vNorm)) {
      return false;
    }
  }
  return true;
}
function searchYouTube(query, parentSession) {
  return __async(this, null, function* () {
    var session = parentSession || createSession(2200);
    try {
      var clients = ["MWEB", "WEB"];
      for (var i = 0; i < clients.length; i++) {
        var data = yield session.request("https://www.youtube.com/youtubei/v1/search?key=" + INNERTUBE_KEY, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, context: { client: {
            clientName: clients[i],
            clientVersion: "2.20261002.01.00",
            hl: "tr",
            gl: "TR"
          } } })
        }, function(res) {
          return res.json();
        }, 1100);
        if (!data) continue;
        var results = clients[i] === "MWEB" ? _parseInnertubeMwebSearch(data) : _parseInnertubeWebSearch(data);
        if (results.length) return results;
      }
      return [];
    } finally {
      if (!parentSession) session.close();
    }
  });
}
function _parseInnertubeMwebSearch(data) {
  var results = [];
  var seenIds = {};
  try {
    var slr = data && data.contents && data.contents.sectionListRenderer && data.contents.sectionListRenderer.contents || [];
    for (var s = 0; s < slr.length; s++) {
      var items = slr[s].itemSectionRenderer && slr[s].itemSectionRenderer.contents || [];
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
        var title = v.headline && v.headline.runs && v.headline.runs[0] && v.headline.runs[0].text || v.title && v.title.runs && v.title.runs[0] && v.title.runs[0].text || v.title && v.title.simpleText || "";
        var channel = v.shortBylineText && v.shortBylineText.runs && v.shortBylineText.runs[0] && v.shortBylineText.runs[0].text || v.ownerText && v.ownerText.runs && v.ownerText.runs[0] && v.ownerText.runs[0].text || "";
        var durText = v.lengthText && v.lengthText.runs && v.lengthText.runs[0] && v.lengthText.runs[0].text || v.lengthText && v.lengthText.simpleText || "";
        var durSec = parseDurationSec(durText);
        var viewsText = v.shortViewCountText && v.shortViewCountText.runs && v.shortViewCountText.runs[0] && v.shortViewCountText.runs[0].text || v.shortViewCountText && v.shortViewCountText.simpleText || v.viewCountText && v.viewCountText.simpleText || "";
        viewsText = viewsText.replace(/\u00a0/g, " ").replace(/\s*görüntüleme\s*/i, "").trim();
        var viewsNum = parseViewCount(viewsText);
        results.push({
          id: vidId,
          title,
          duration: durText,
          durationSec: durSec,
          channel,
          views: viewsText,
          viewsNum,
          isVerified: Array.isArray(v.ownerBadges) && v.ownerBadges.some(function(b) {
            return b.metadataBadgeRenderer && /VERIFIED/.test(b.metadataBadgeRenderer.style || "");
          })
        });
      }
    }
  } catch (e) {
  }
  return results;
}
function _parseInnertubeWebSearch(data) {
  var results = [];
  var seenIds = {};
  try {
    var contents = data && data.contents && data.contents.twoColumnSearchResultsRenderer && data.contents.twoColumnSearchResultsRenderer.primaryContents && data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer && data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents || [];
    for (var s = 0; s < contents.length; s++) {
      var itemSection = contents[s].itemSectionRenderer && contents[s].itemSectionRenderer.contents;
      for (var i = 0; i < (itemSection || []).length; i++) {
        var vr = itemSection[i].videoRenderer;
        if (!vr || !vr.videoId) continue;
        var vid = vr.videoId;
        if (seenIds[vid]) continue;
        seenIds[vid] = true;
        var title = vr.title && vr.title.runs && vr.title.runs[0] && vr.title.runs[0].text || vr.title && vr.title.simpleText || "";
        var duration = vr.lengthText && vr.lengthText.simpleText || vr.lengthText && vr.lengthText.runs && vr.lengthText.runs[0] && vr.lengthText.runs[0].text || "";
        var channel = vr.ownerText && vr.ownerText.runs && vr.ownerText.runs[0] && vr.ownerText.runs[0].text || "";
        var views = vr.shortViewCountText && vr.shortViewCountText.simpleText || vr.viewCountText && vr.viewCountText.simpleText || "";
        views = views.replace(/\u00a0/g, " ").replace(/\s*görüntüleme\s*/i, "").trim();
        var isVerified = false;
        if (Array.isArray(vr.ownerBadges)) {
          isVerified = vr.ownerBadges.some(function(b) {
            return b && b.metadataBadgeRenderer && b.metadataBadgeRenderer.style && b.metadataBadgeRenderer.style.indexOf("VERIFIED") !== -1;
          });
        }
        results.push({
          id: vid,
          title,
          duration,
          durationSec: parseDurationSec(duration),
          channel,
          views,
          viewsNum: parseViewCount(views),
          isVerified
        });
      }
    }
  } catch (e) {
  }
  return results;
}
function toStream(source, name, description) {
  var quality = source.quality || "Bilinmiyor";
  return {
    name,
    title: "\u231C YouTube \u231F | " + name + " (" + quality + " \xB7 " + (source.isHls ? "HLS" : "MP4") + ")",
    description,
    url: source.url,
    quality,
    isHls: source.isHls,
    format: source.format,
    provider: "youtube_dizifilm",
    headers: source.headers,
    behaviorHints: {
      notWebReady: true,
      headers: source.headers,
      proxyHeaders: { request: source.headers }
    }
  };
}
function resolveTitleInfo(rawId, type, session) {
  return __async(this, null, function* () {
    var norm = normalizeSeriesId(rawId);
    var isSeries = type === "tv" || type === "series";
    var kind = isSeries ? "tv" : "movie";
    var id = norm.id;
    var fallback = (isSeries ? POPULAR_DIZILER : POPULAR_FILMLER).find(function(v) {
      return v.tmdbId === id;
    });
    var result = { title: fallback ? fallback.name : norm.kind === "title" ? id : "", seasons: [] };
    function json(path) {
      return __async(this, null, function* () {
        return session.request(
          "https://api.themoviedb.org/3/" + path + (path.indexOf("?") === -1 ? "?" : "&") + "api_key=" + TMDB_API_KEY + "&language=tr-TR",
          {},
          function(res) {
            return res.json();
          },
          1e3
        );
      });
    }
    if (norm.kind === "imdb") {
      var found = yield json("find/" + id + "?external_source=imdb_id");
      var hits = found && found[isSeries ? "tv_results" : "movie_results"];
      if (!hits || !hits.length) return result;
      id = String(hits[0].id);
      result.title = hits[0].name || hits[0].title || result.title;
    } else if (norm.kind === "title") {
      return result;
    }
    var data = yield json(kind + "/" + id);
    if (data) {
      result.title = data.name || data.title || result.title;
      result.seasons = data.seasons || [];
    }
    return result;
  });
}
function getStreams(tmdbIdOrArgs, mediaType, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    var session = createSession(9e3);
    try {
      yield cfgReady();
      return yield getStreamsInternal(tmdbIdOrArgs, mediaType, seasonNum, episodeNum, session);
    } finally {
      session.close();
    }
  });
}
function getStreamsInternal(tmdbIdOrArgs, mediaType, seasonNum, episodeNum, session) {
  return __async(this, null, function* () {
    try {
      var includeEmbed = !!(tmdbIdOrArgs && typeof tmdbIdOrArgs === "object" && tmdbIdOrArgs.client === "stremio");
      var rawId = tmdbIdOrArgs;
      var sNum = seasonNum || 1;
      var eNum = episodeNum || 1;
      var mType = mediaType || "movie";
      if (typeof tmdbIdOrArgs === "object" && tmdbIdOrArgs !== null) {
        rawId = tmdbIdOrArgs.id || tmdbIdOrArgs.url || "";
        mType = tmdbIdOrArgs.type || tmdbIdOrArgs.mediaType || mType;
        sNum = tmdbIdOrArgs.season || tmdbIdOrArgs.seasonNum || sNum;
        eNum = tmdbIdOrArgs.episode || tmdbIdOrArgs.episodeNum || eNum;
      }
      sNum = Math.max(1, parseInt(sNum, 10) || 1);
      eNum = Math.max(1, parseInt(eNum, 10) || 1);
      rawId = String(rawId || "").trim();
      var directYtId = null;
      if (/^[a-zA-Z0-9_-]{11}$/.test(rawId)) {
        directYtId = rawId;
      } else if (rawId.startsWith("youtube:video:")) {
        var suppliedId = rawId.replace("youtube:video:", "");
        if (!/^[a-zA-Z0-9_-]{11}$/.test(suppliedId)) return [];
        directYtId = suppliedId;
      } else if (rawId.includes("youtube.com/") || rawId.includes("youtu.be/")) {
        var m = rawId.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (m) directYtId = m[1];
      }
      if (directYtId) {
        var streams = [];
        var directStreams = yield resolveYouTubeStreams(directYtId, { timeoutMs: session.remaining() });
        var streamData = directStreams[0];
        var chName = streamData && streamData.author || "YouTube";
        var streamName = "\u{1F4FA} " + chName + BETA_LABEL;
        var vTitle = streamData && streamData.videoTitle || "";
        var vViews = streamData && streamData.viewCount ? formatNumberCompact(streamData.viewCount) : "";
        var viewsTag = vViews ? " \xB7 \u{1F441} " + vViews : "";
        directStreams.forEach(function(resolved2) {
          streams.push(toStream(resolved2, streamName, vTitle + viewsTag));
        });
        if (includeEmbed) streams.push({
          name: streamName,
          title: "\u231C YouTube \u231F | " + streamName + " (YouTube Embed)",
          description: vTitle + viewsTag,
          ytId: directYtId,
          provider: "youtube_dizifilm"
        });
        return sortStreamsByQuality(streams.filter(function(s2) {
          return !!s2.url;
        })).concat(streams.filter(function(s2) {
          return !!s2.ytId;
        }));
      }
      if (rawId.startsWith("youtube:")) {
        var parts = rawId.split(":");
        if (parts[1] === "tv" || parts[1] === "series" || parts[1] === "movie") {
          mType = parts[1] === "movie" ? "movie" : "series";
          rawId = parts[2];
          if (parts[3]) sNum = parseInt(parts[3], 10) || sNum;
          if (parts[4]) eNum = parseInt(parts[4], 10) || eNum;
        }
      } else {
        var idNorm = normalizeSeriesId(rawId);
        if (idNorm.id) rawId = idNorm.id;
        if (!seasonNum && idNorm.season > 0) sNum = idNorm.season;
        if (!episodeNum && idNorm.episode > 0) eNum = idNorm.episode;
      }
      var isSeries = mType === "tv" || mType === "series";
      var info = yield resolveTitleInfo(rawId, mType, session);
      var targetTitle = info.title;
      if (!targetTitle || session.remaining() <= 0) return [];
      var cumEpisode = eNum;
      if (isSeries && sNum > 1 && Array.isArray(info.seasons) && info.seasons.length > 0) {
        var sum = 0;
        for (var s = 0; s < info.seasons.length; s++) {
          var sn = info.seasons[s].season_number;
          if (sn > 0 && sn < sNum) {
            sum += info.seasons[s].episode_count || 0;
          }
        }
        if (sum > 0) cumEpisode = sum + eNum;
      }
      var searchQueries = [];
      if (isSeries) {
        var epTarget = cumEpisode && cumEpisode !== eNum ? cumEpisode : eNum;
        searchQueries.push(targetTitle + " " + epTarget + ". B\xF6l\xFCm");
        if (sNum > 1 && epTarget === eNum) {
          searchQueries.push(targetTitle + " " + sNum + ". Sezon " + eNum + ". B\xF6l\xFCm");
        }
      } else {
        searchQueries.push(targetTitle + " Full \u0130zle");
        searchQueries.push(targetTitle + " Tek Par\xE7a");
      }
      var searchResultsArr = yield Promise.all(searchQueries.map(function(q) {
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
          if (vid.durationSec > 0 && vid.durationSec < minDuration) continue;
          if (!matchesTitle(vid.title, targetTitle)) continue;
          if (isSeries && !matchesEpisode(vid.title, sNum, eNum, cumEpisode)) continue;
          candidateVideos.push(vid);
          if (candidateVideos.length >= 4) break;
        }
        if (candidateVideos.length >= 4) break;
      }
      if (candidateVideos.length === 0) return [];
      candidateVideos.sort(function(x, y) {
        return (y.viewsNum || 0) - (x.viewsNum || 0);
      });
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
      var resolvedArr = yield Promise.all(topCandidates.map(function(tc) {
        return resolveYouTubeStreams(tc.id, { timeoutMs: session.remaining() }).catch(function() {
          return [];
        });
      }));
      var streams = [];
      for (var i = 0; i < topCandidates.length; i++) {
        var candObj = topCandidates[i];
        var resolved = resolvedArr[i];
        var badge2 = getChannelSubscriberBadge(candObj.channel, candObj.isVerified);
        var streamName2 = "\u{1F4FA} " + (candObj.channel || "YouTube") + (badge2 ? " " + badge2 : "") + BETA_LABEL;
        var viewsLabel = candObj.views ? " \xB7 \u{1F441} " + candObj.views : "";
        (resolved || []).forEach(function(source) {
          streams.push(toStream(source, streamName2, candObj.title + viewsLabel));
        });
        if (includeEmbed) streams.push({
          name: streamName2,
          title: "\u231C YouTube \u231F | " + streamName2 + " (YouTube Embed)",
          description: candObj.title + viewsLabel,
          ytId: candObj.id,
          provider: "youtube_dizifilm"
        });
      }
      return sortStreamsByQuality(streams.filter(function(s2) {
        return !!s2.url;
      })).concat(streams.filter(function(s2) {
        return !!s2.ytId;
      }));
    } catch (e) {
      return [];
    }
  });
}
function getCatalog(args) {
  return __async(this, null, function* () {
    try {
      var catalogId = args && args.id || "anthology_youtube_diziler";
      var searchQuery = args && (args.search || args.extra && args.extra.search) || "";
      if (searchQuery) {
        var searchResults = yield searchYouTube(searchQuery + " Full");
        var searchMetas = searchResults.filter(function(v) {
          return v.durationSec >= 600;
        }).slice(0, 20).map(function(v) {
          return {
            id: "youtube:video:" + v.id,
            type: catalogId.includes("dizi") ? "series" : "movie",
            name: v.title,
            poster: "https://i.ytimg.com/vi/" + v.id + "/hqdefault.jpg",
            description: (v.channel ? v.channel + " \xB7 " : "") + v.duration + (v.views ? " \xB7 " + v.views : ""),
            releaseInfo: v.duration
          };
        });
        return { metas: searchMetas };
      }
      var isSeries = catalogId.includes("dizi");
      var pool = isSeries ? POPULAR_DIZILER : POPULAR_FILMLER;
      var metas = pool.map(function(item) {
        return {
          id: "youtube:" + (isSeries ? "tv" : "movie") + ":" + item.tmdbId,
          type: isSeries ? "series" : "movie",
          name: item.name,
          poster: item.poster,
          description: "YouTube Resm\xEE Yay\u0131nc\u0131: " + item.channel,
          releaseInfo: item.year
        };
      });
      return { metas };
    } catch (e) {
      return { metas: [] };
    }
  });
}
function getMeta(id) {
  return __async(this, null, function* () {
    try {
      var rawId = String(id || "").trim();
      if (rawId.startsWith("youtube:video:")) {
        var vid = rawId.replace("youtube:video:", "");
        return {
          meta: {
            id: rawId,
            type: "movie",
            name: "YouTube Video (" + vid + ")",
            poster: "https://i.ytimg.com/vi/" + vid + "/hqdefault.jpg",
            background: "https://i.ytimg.com/vi/" + vid + "/maxresdefault.jpg",
            description: "Do\u011Frudan YouTube video ak\u0131\u015F\u0131"
          }
        };
      }
      if (rawId.startsWith("youtube:")) {
        var parts = rawId.split(":");
        var mType = parts[1];
        var tmdbId = parts[2];
        if (mType === "movie") {
          var resM = yield fetch("https://api.themoviedb.org/3/movie/" + tmdbId + "?api_key=" + TMDB_API_KEY + "&language=tr-TR", { signal: timeoutSignal(6e3) });
          if (resM.ok) {
            var dm = yield resM.json();
            return {
              meta: {
                id: rawId,
                type: "movie",
                name: dm.title || dm.name,
                poster: dm.poster_path ? "https://image.tmdb.org/t/p/w500" + dm.poster_path : void 0,
                background: dm.backdrop_path ? "https://image.tmdb.org/t/p/original" + dm.backdrop_path : void 0,
                description: dm.overview || "",
                releaseInfo: (dm.release_date || "").slice(0, 4)
              }
            };
          }
        } else if (mType === "tv") {
          var resTv = yield fetch("https://api.themoviedb.org/3/tv/" + tmdbId + "?api_key=" + TMDB_API_KEY + "&language=tr-TR", { signal: timeoutSignal(6e3) });
          if (resTv.ok) {
            var dt = yield resTv.json();
            var videos = [];
            if (Array.isArray(dt.seasons)) {
              for (var s = 0; s < dt.seasons.length; s++) {
                var sObj = dt.seasons[s];
                var sNum = sObj.season_number;
                if (sNum <= 0) continue;
                var epCount = sObj.episode_count || 0;
                for (var e = 1; e <= epCount; e++) {
                  videos.push({
                    id: "youtube:tv:" + tmdbId + ":" + sNum + ":" + e,
                    season: sNum,
                    episode: e,
                    title: sNum + ". Sezon " + e + ". B\xF6l\xFCm",
                    name: sNum + ". Sezon " + e + ". B\xF6l\xFCm",
                    releaseInfo: sNum + "x" + (e < 10 ? "0" + e : e)
                  });
                }
              }
            }
            return {
              meta: {
                id: rawId,
                type: "series",
                name: dt.name,
                poster: dt.poster_path ? "https://image.tmdb.org/t/p/w500" + dt.poster_path : void 0,
                background: dt.backdrop_path ? "https://image.tmdb.org/t/p/original" + dt.backdrop_path : void 0,
                description: dt.overview || "",
                releaseInfo: (dt.first_air_date || "").slice(0, 4),
                videos
              }
            };
          }
        }
      }
      return null;
    } catch (e2) {
      return null;
    }
  });
}
var _exports = wrapAll({ getCatalog, getMeta }, cfgReady);
_exports.getStreams = getStreams;
if (typeof module !== "undefined" && module.exports) {
  module.exports = _exports;
}
if (typeof globalThis !== "undefined") {
  globalThis.getStreams = _exports.getStreams;
  globalThis.getCatalog = _exports.getCatalog;
  globalThis.getMeta = _exports.getMeta;
}

if (typeof globalThis !== 'undefined' && typeof module !== 'undefined' && module.exports) {
    if (module.exports.getStreams) globalThis.getStreams = module.exports.getStreams;
    if (module.exports.getCatalog) globalThis.getCatalog = module.exports.getCatalog;
    if (module.exports.getMeta) globalThis.getMeta = module.exports.getMeta;
    if (module.exports.getSubtitles) globalThis.getSubtitles = module.exports.getSubtitles;
}

