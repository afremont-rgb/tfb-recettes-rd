function apiGet(endpoint, params) {
    params = params || {};
    const all = Object.assign({ endpoint: endpoint }, params);
    const qs = Object.keys(all).map(function(k){ return encodeURIComponent(k) + "=" + encodeURIComponent(all[k]); }).join("&");
    return fetch("/api/proxy?" + qs).then(function(r){
          return r.json().catch(function(){ return {}; }).then(function(data){
                  if (!r.ok) throw new Error((data && data.error) || ("Erreur API " + r.status));
                  return data;
          });
    });
}
function qualityGetAll() {
    return fetch("/api/quality").then(function(r){ return r.json(); });
}
function qualitySet(id, data) {
    const body = Object.assign({ id: id }, data);
    return fetch("/api/quality", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(function(r){ return r.json(); });
}
function qualityDelete(id) {
    return fetch("/api/quality?id=" + encodeURIComponent(id), { method: "DELETE" }).then(function(r){ return r.json(); });
}
function draftsGetAll() {
    return fetch("/api/drafts").then(function(r){ return r.json(); });
}
function draftsSave(draft) {
    return fetch("/api/drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) }).then(function(r){ return r.json(); });
}
function draftsDelete(id) {
    return fetch("/api/drafts?id=" + encodeURIComponent(id), { method: "DELETE" }).then(function(r){ return r.json(); });
}
function fmtEUR(n) {
    n = Number(n) || 0;
    return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " \u20ac";
}
function fmtPct(n) {
    n = Number(n) || 0;
    return n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " %";
}
function fmtNum(n) {
    n = Number(n) || 0;
    return n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}
function escapeHtml(s) {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(c) { return map[c]; });
}
function toast(msg) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function(){ el.remove(); }, 3500);
}
function debounce(fn, delay) {
    let t;
    return function() {
          clearTimeout(t);
          const args = arguments, ctx = this;
          t = setTimeout(function(){ fn.apply(ctx, args); }, delay || 300);
    };
}
