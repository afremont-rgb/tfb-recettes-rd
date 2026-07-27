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

function hiddenRecipeGetAll() {
  return fetch("/api/hidden-recipes").then(function(r){ return r.json(); });
}
function hiddenRecipeSet(id, data) {
  const body = Object.assign({ id: id }, data);
  return fetch("/api/hidden-recipes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(function(r){ return r.json(); });
}
function hiddenRecipeDelete(id) {
  return fetch("/api/hidden-recipes?id=" + encodeURIComponent(id), { method: "DELETE" }).then(function(r){ return r.json(); });
}

// ==== Shared core (Inpulse-only data and classification) ====
var ENDPOINTS = { recipes: "/public/v2/recipes", products: "/public/v2/products", ingredients: "/public/v2/ingredients", supplierProducts: "/public/v2/supplier-products" };
var SHARED_CACHE_KEY = "tfb_shared_core_v1";
var SHARED_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;
function fetchAllPages(endpoint) {
    return apiGet(endpoint, { limit: 100, skip: 0 }).then(function (first) {
        var total = first.total || (first.data || []).length;
        var data = (first.data || []).slice();
        var calls = [];
        for (var skip = 100; skip < total; skip += 100) calls.push(apiGet(endpoint, { limit: 100, skip: skip }));
        if (!calls.length) return data;
        return Promise.all(calls).then(function (pages) {
            pages.forEach(function (p) { data = data.concat(p.data || []); });
            return data;
        });
    });
}
function fetchJson(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); });
}
function sharedReadCache() {
    try {
        var raw = localStorage.getItem(SHARED_CACHE_KEY);
        if (!raw) return null;
        var obj = JSON.parse(raw);
        if (!obj || !obj._savedAt) return null;
        return obj;
    } catch (e) { return null; }
}
function sharedSaveCache(obj) {
    try {
        obj._savedAt = Date.now();
        localStorage.setItem(SHARED_CACHE_KEY, JSON.stringify(obj));
    } catch (e) { }
}

function coreGetName(r) { return r.name || "(sans nom)"; }
function coreGetCategory(r) { return r.category || "Sans categorie"; }
function coreGetUnitLabel(u) { if (!u) return ""; if (u === "unit") return "unite"; return u; }
function coreGetCostTotal(r) { return (Number(r.costOnSite) || 0) * (Number(r.quantity) || 1); }
function coreIsActive(r) { return r.status === "active"; }
function coreIsCuisson(r) {
    return coreGetCategory(r).toUpperCase().indexOf("CUISSON") !== -1;
}
function coreIsSousRecette(r) {
    var c = coreGetCategory(r).toUpperCase().replace(/[-\u2013]/g, " ").replace(/\s+/g, " ").trim();
    return c === "SR" || c.indexOf("SR ") === 0;
}
function coreGetProduct(r, productsByEntity) { return productsByEntity[r.id] || null; }
function coreOwnPrice(r, productsByEntity) {
    var p = coreGetProduct(r, productsByEntity);
    if (!p || !p.priceWithTaxes) return null;
    var vat = Number(p.vatRate) || 0;
    return { ttc: p.priceWithTaxes, ht: p.priceWithTaxes / (1 + vat / 100), vat: vat };
}
function coreGetFoodCostPct(r, productsByEntity) {
    var pi = coreOwnPrice(r, productsByEntity);
    if (!pi || !pi.ht) return null;
    var cost = coreGetCostTotal(r);
    return (cost / pi.ht) * 100;
}
var CORE_MACRO_ORDER = ["Snacking", "Patisserie", "Viennoiserie", "Pain", "Boisson", "SousRecette", "Autres"];
var CORE_MACRO_LABELS = { Snacking: "Snacking", Patisserie: "Patisseries", Viennoiserie: "Viennoiseries", Pain: "Pains", Boisson: "Boissons", SousRecette: "Sous-recettes", Autres: "Autres" };
function coreMacroOf(r) {
    if (coreIsSousRecette(r)) return "SousRecette";
    var c = coreGetCategory(r).toUpperCase();
    if (c.indexOf("SNACKING") !== -1) return "Snacking";
    if (c.indexOf("PATISSERIE") !== -1) return "Patisserie";
    if (c.indexOf("VIENNOISERIE") !== -1 || c.indexOf("VIENOISERIE") !== -1) return "Viennoiserie";
    if (c.indexOf("BOULANGERIE") !== -1) return "Pain";
    if (c.indexOf("BOISSON") !== -1) return "Boisson";
    return "Autres";
}
function coreSiteOf(r) {
    var c = coreGetCategory(r).toUpperCase();
    var n = coreGetName(r).toUpperCase();
    if (c.indexOf("BORDEAUX") !== -1) return "Bordeaux";
    if (n.indexOf("(BDX)") !== -1 || n.indexOf(" BDX") !== -1) return "Bordeaux";
    return "Paris";
}
function coreClassify(r, productsByEntity) {
    if (coreIsCuisson(r)) return "hidden";
    if (coreIsSousRecette(r)) return "sous-recette";
    return coreOwnPrice(r, productsByEntity) ? "existante" : "rd";
}

function coreBuildUsageGraph(all, getDetail, onProgress) {
    var usersMap = {};
    var total = all.length;
    var done = 0;
    function addEdge(childId, parentId) {
        if (!childId) return;
        if (!usersMap[childId]) usersMap[childId] = {};
        usersMap[childId][parentId] = true;
    }
    var idx = 0;
    var BATCH = 6;
    return new Promise(function (resolve) {
        function step() {
            if (idx >= total) { resolve(usersMap); return; }
            var batch = all.slice(idx, idx + BATCH);
            idx += BATCH;
            Promise.all(batch.map(function (r) {
                return getDetail(r.id).then(function (det) {
                    if (det && det.ok && det.data && Array.isArray(det.data.composition)) {
                        det.data.composition.forEach(function (c) { addEdge(c.id, r.id); });
                    }
                }).catch(function () { });
            })).then(function () {
                done += batch.length;
                if (onProgress) onProgress(done, total, usersMap);
                step();
            });
        }
        step();
    });
}
function coreUsageBuckets(id, usersMap, recipeById, productsByEntity, visited) {
    visited = visited || {};
    if (visited[id]) return {};
    visited[id] = true;
    var parents = usersMap[id] ? Object.keys(usersMap[id]) : [];
    var buckets = {};
    parents.forEach(function (pid) {
        var pr = recipeById[pid];
        if (!pr) return;
        var cls = coreClassify(pr, productsByEntity);
        if (cls === "existante") buckets.existante = true;
        else if (cls === "rd") buckets.rd = true;
        else if (cls === "sous-recette") {
            var sub = coreUsageBuckets(pid, usersMap, recipeById, productsByEntity, visited);
            Object.keys(sub).forEach(function (k) { buckets[k] = true; });
        }
    });
    if (!Object.keys(buckets).length) buckets.rd = true;
    return buckets;
}

function coreMakeIngredientHelpers(state) {
    function getRecipeDetail(id) {
        if (state.DETAIL_CACHE[id]) return state.DETAIL_CACHE[id];
        if (state.RECIPE_DETAIL_DATA[id]) { state.DETAIL_CACHE[id] = Promise.resolve(state.RECIPE_DETAIL_DATA[id]); return state.DETAIL_CACHE[id]; }
        var p = apiGet("/public/v2/recipes/" + id, { compositionDetailsLevel: "full" }).then(function (resp) {
            var out = { ok: true, data: resp.data };
            state.RECIPE_DETAIL_DATA[id] = out;
            return out;
        }).catch(function () { return { ok: false, data: null }; });
        state.DETAIL_CACHE[id] = p;
        return p;
    }
    function getSupplierName(id) {
        var ing = state.INGR_BY_ID[id];
        if (!ing || !ing.supplierProducts || !ing.supplierProducts.length) return null;
        var sp = state.SUPPRODUCT_BY_ID[ing.supplierProducts[0].id];
        if (sp && sp.supplier && sp.supplier.name) return sp.supplier.name;
        return null;
    }
    function leafFromLine(line, qty) {
        var unitCost = (typeof line.costOnSite === "number") ? line.costOnSite : (typeof line.cost === "number" ? line.cost : 0);
        var lineCost = unitCost * qty;
        var ing = state.INGR_BY_ID[line.id];
        var opaque = !ing;
        var supplierName = getSupplierName(line.id);
        var optim = ing ? getBestSupplierOption(ing) : null;
        return { id: line.id, name: line.name, quantity: qty, unit: coreGetUnitLabel(line.unit), unitCost: unitCost, lineCost: lineCost, supplier: supplierName || (opaque ? "Fabrication interne" : "Non renseigne"), opaque: opaque, optim: optim };
    }
    function expandLine(line, ratio, depth) {
        var qty = (Number(line.quantity) || 0) * ratio;
        if (depth > 6) return Promise.resolve([leafFromLine(line, qty)]);
        return getRecipeDetail(line.id).then(function (det) {
            if (det.ok && det.data && Array.isArray(det.data.composition) && det.data.composition.length) {
                var yieldQty = Number(det.data.quantity) || 1;
                var subRatio = qty / yieldQty;
                return Promise.all(det.data.composition.map(function (child) { return expandLine(child, subRatio, depth + 1); })).then(function (childResults) {
                    return [].concat.apply([], childResults);
                });
            }
            return [leafFromLine(line, qty)];
        });
    }
    function getFlatIngredients(recipe) {
        return getRecipeDetail(recipe.id).then(function (det) {
            if (!det.ok || !det.data || !Array.isArray(det.data.composition)) return [];
            return Promise.all(det.data.composition.map(function (child) { return expandLine(child, 1, 1); })).then(function (results) {
                var flat = [].concat.apply([], results);
                var map = {};
                var order = [];
                flat.forEach(function (row) {
                    var key = row.id || (row.name + "|" + row.unit);
                    if (!map[key]) { map[key] = Object.assign({}, row); order.push(key); }
                    else { map[key].quantity += row.quantity; map[key].lineCost += row.lineCost; }
                });
                return order.map(function (k) { return map[k]; });
            });
        });
    }
    return { getRecipeDetail: getRecipeDetail, getSupplierName: getSupplierName, getFlatIngredients: getFlatIngredients };
}
