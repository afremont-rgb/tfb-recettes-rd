const ALLOWED_PREFIXES = [
    "/public/v2/recipes",
    "/public/v2/recipe-categories",
    "/public/v2/kitchen-products",
    "/public/v2/products",
    "/public/v2/ingredients",
    "/public/v2/supplier-products",
    "/public/v2/suppliers",
    "/public/v2/categories",
    "/public/v2/stores",
    "/public/v2/allergens",
    "/public/v2/units"
  ];

exports.handler = async (event) => {
    const headers = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Content-Type": "application/json"
    };

    if (event.httpMethod === "OPTIONS") {
          return { statusCode: 200, headers, body: "" };
    }
    if (event.httpMethod !== "GET") {
          return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
    }

    const params = event.queryStringParameters || {};
    const endpoint = params.endpoint;
    if (!endpoint) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing endpoint" }) };
    }
    if (!ALLOWED_PREFIXES.some((p) => endpoint.startsWith(p))) {
          return { statusCode: 403, headers, body: JSON.stringify({ error: "Endpoint non autorise: " + endpoint }) };
    }

    const API_KEY = process.env.INPULSE_API_KEY;
    if (!API_KEY) {
          return { statusCode: 500, headers, body: JSON.stringify({ error: "INPULSE_API_KEY manquante sur le site Netlify" }) };
    }

    const qs = Object.keys(params)
      .filter((k) => k !== "endpoint")
      .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(params[k]))
      .join("&");

    const url = "https://api.inpulse.ai" + endpoint + (qs ? "?" + qs : "");

    try {
          const r = await fetch(url, {
                  method: "GET",
                  headers: { "x-api-key": API_KEY, Accept: "application/json" }
          });
          const text = await r.text();
          let data;
          try {
                  data = JSON.parse(text);
          } catch (e) {
                  data = { raw: text };
          }
          return { statusCode: r.status, headers, body: JSON.stringify(data) };
    } catch (err) {
          return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
};
