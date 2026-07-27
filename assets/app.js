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
function priceOverrideGetAll() {
    return fetch("/api/price-override").then(function(r){ return r.json(); });
}
function priceOverrideSet(id, data) {
    const body = Object.assign({ id: id }, data);
    return fetch("/api/price-override", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(function(r){ return r.json(); });
}
function priceOverrideDelete(id) {
    return fetch("/api/price-override?id=" + encodeURIComponent(id), { method: "DELETE" }).then(function(r){ return r.json(); });
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
function normalizeName(s) {
    return String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
function normApitic(s) {
    var n = normalizeName(s);
    ["vte","pce","kg","cuisson","bdx","individuel","1p","4p","6p","8p","ft"].forEach(function(tok){
        n = n.replace(new RegExp("\\b" + tok + "\\b", "g"), "");
    });
    return n.replace(/\s+/g, " ").trim();
}
function scoreMatch(a, b) {
    var wa = a.split(" ").filter(Boolean);
    var wb = b.split(" ").filter(Boolean);
    if (!wa.length || !wb.length) return 0;
    var setB = {}; wb.forEach(function(w){ setB[w] = true; });
    var inter = 0;
    wa.forEach(function(w){ if (setB[w]) inter++; });
    var union = {};
    wa.concat(wb).forEach(function(w){ union[w] = true; });
    var unionSize = Object.keys(union).length;
    return unionSize ? inter / unionSize : 0;
}
function basePkgOf(sp) {
    if (!sp || !Array.isArray(sp.packagings) || !sp.packagings.length) return null;
    var pkg = sp.packagings.filter(function(p){ return !p.parentSupplierProductPackagingId; })[0];
    return pkg || sp.packagings[0];
}
function unitCostOf(sp) {
    if (!sp) return null;
    var pkg = basePkgOf(sp);
    var price = Number(sp.price);
    if (!pkg || !isFinite(price) || price <= 0) return null;
    var qty = Number(pkg.quantity);
    var unit = (pkg.unit || "").toLowerCase();
    if (!qty || qty <= 0) return null;
    if (unit === "kg" || unit === "l") return price / (qty * 1000);
    return price / qty;
}
function findFuzzySupplierCost(name) {
    var target = normalizeName(name);
    if (!target || typeof SUPPRODUCT_BY_ID === "undefined") return null;
    var best = null;
    Object.keys(SUPPRODUCT_BY_ID).forEach(function (id) {
        var sp = SUPPRODUCT_BY_ID[id];
        if (!sp || sp.status !== "active" || !sp.name) return;
        var n = normalizeName(sp.name);
        var match = (n === target) || (target.length > 3 && (n.indexOf(target) === 0 || target.indexOf(n) === 0));
        if (!match) return;
        var uc = unitCostOf(sp);
        if (uc == null) return;
        if (!best || uc < best.cost) best = { cost: uc, supplierProduct: sp };
    });
    return best;
}
function getBestSupplierOption(ing) {
    if (!ing || !Array.isArray(ing.supplierProducts) || ing.supplierProducts.length < 2 || typeof SUPPRODUCT_BY_ID === "undefined") return null;
    var current = Number(ing.cost);
    var best = null;
    ing.supplierProducts.forEach(function (ref) {
        var sp = SUPPRODUCT_BY_ID[ref.id];
        if (!sp || sp.status !== "active") return;
        var uc = unitCostOf(sp);
        if (uc == null) return;
        if (!best || uc < best.cost) best = { cost: uc, supplierProduct: sp };
    });
    if (!best || !isFinite(current) || current <= 0) return null;
    if (best.cost < current * 0.97) {
        return {
            current: current,
            best: best.cost,
            savingsPct: (1 - best.cost / current) * 100,
            supplierName: (best.supplierProduct.supplier && best.supplierProduct.supplier.name) || "?",
            supplierProductName: best.supplierProduct.name
        };
    }
    return null;
}
