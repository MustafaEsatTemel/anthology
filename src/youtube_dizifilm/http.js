// Per-call deadline, including response bodies. Some QuickJS hosts ignore signals
// or do not expose AbortController; the timer still bounds the returned promise.
function createSession(timeoutMs) {
    var deadline = Date.now() + timeoutMs;
    var pending = [];
    var closed = false;
    return {
        remaining: function () { return closed ? 0 : Math.max(0, deadline - Date.now()); },
        request: function (url, options, read, capMs) {
            var ms = Math.min(capMs || timeoutMs, closed ? 0 : deadline - Date.now());
            if (ms <= 0) return Promise.resolve(null);
            return new Promise(function (resolve) {
                var controller = typeof AbortController === 'function' ? new AbortController() : null;
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
                Promise.resolve().then(function () {
                    if (done) return null;
                    return fetch(url, opts);
                }).then(function (res) {
                    if (!res) return null;
                    if (done || !res.ok) {
                        if (res.body && typeof res.body.cancel === 'function') res.body.cancel().catch(function () {});
                        return null;
                    }
                    return read(res);
                }).then(finish, function () { finish(null); });
            });
        },
        close: function () {
            closed = true;
            pending.slice().forEach(function (cancel) { cancel(); });
        }
    };
}
module.exports = { createSession: createSession };
