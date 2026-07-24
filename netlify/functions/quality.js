const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
    const headers = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
          "Content-Type": "application/json"
    };

    if (event.httpMethod === "OPTIONS") {
          return { statusCode: 200, headers, body: "" };
    }

    const store = getStore("qualite-matieres");

    if (event.httpMethod === "GET") {
          const list = (await store.get("data", { type: "json" })) || {};
          return { statusCode: 200, headers, body: JSON.stringify(list) };
    }

    if (event.httpMethod === "POST") {
          let body = {};
          try {
                  body = JSON.parse(event.body || "{}");
          } catch (e) {
                  return { statusCode: 400, headers, body: JSON.stringify({ error: "JSON invalide" }) };
          }
          const id = body.id;
          if (!id) {
                  return { statusCode: 400, headers, body: JSON.stringify({ error: "id manquant" }) };
          }
          const list = (await store.get("data", { type: "json" })) || {};
          list[id] = Object.assign({}, list[id], body, { updatedAt: new Date().toISOString() });
          await store.setJSON("data", list);
          return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (event.httpMethod === "DELETE") {
          const params = event.queryStringParameters || {};
          const id = params.id;
          if (!id) {
                  return { statusCode: 400, headers, body: JSON.stringify({ error: "id manquant" }) };
          }
          const list = (await store.get("data", { type: "json" })) || {};
          delete list[id];
          await store.setJSON("data", list);
          return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
};
