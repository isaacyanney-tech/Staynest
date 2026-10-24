// A stand-in for the parts of the Paystack API the app uses, for local
// browser tests only. It keeps transactions in memory, serves a bare checkout
// page with "Pay" and "Cancel" buttons, and answers /transaction/verify the
// way Paystack does. Never deploy this.
import http from "node:http";

const PORT = Number(process.env.FAKE_PAYSTACK_PORT ?? 54330);
const SECRET = process.env.FAKE_PAYSTACK_SECRET ?? "sk_test_e2e_only_not_a_real_key";
const BASE = `http://127.0.0.1:${PORT}`;
const transactions = new Map();
let nextId = 1;

const send = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};
const readBody = (req) =>
  new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });
const escape = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function settle(tx, status, amount = tx.amount) {
  tx.status = status;
  tx.paidAmount = amount;
  tx.gateway_response = status === "success" ? "Approved" : "The transaction was not completed";
  tx.paid_at = status === "success" ? new Date().toISOString() : null;
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, BASE);
    const path = url.pathname;

    // Browser-facing checkout page.
    const page = path.match(/^\/checkout\/([\w-]+)$/);
    if (page && req.method === "GET") {
      const tx = transactions.get(page[1]);
      if (!tx) return send(res, 404, { status: false, message: "Unknown checkout" });
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Test checkout</title></head><body>
<main><h1>Test checkout</h1><p>Pay ${escape(tx.currency)} ${(tx.amount / 100).toFixed(2)} to StayNest (${escape(tx.email)})</p>
<form method="post" action="/checkout/${escape(tx.reference)}/pay"><button>Pay</button></form>
<form method="post" action="/checkout/${escape(tx.reference)}/underpay"><button>Pay less than asked</button></form>
<form method="post" action="/checkout/${escape(tx.reference)}/cancel"><button>Cancel payment</button></form></main></body></html>`);
    }
    const act = path.match(/^\/checkout\/([\w-]+)\/(pay|underpay|cancel)$/);
    if (act && req.method === "POST") {
      const tx = transactions.get(act[1]);
      if (!tx) return send(res, 404, { status: false });
      if (act[2] === "pay") settle(tx, "success");
      if (act[2] === "underpay") settle(tx, "success", tx.amount - 100);
      if (act[2] === "cancel") settle(tx, "abandoned");
      const back = new URL(tx.callback_url);
      back.searchParams.set("trxref", tx.reference);
      back.searchParams.set("reference", tx.reference);
      res.writeHead(303, { location: back.toString() });
      return res.end();
    }

    // Test-only: mark a transaction paid without the browser, for webhook tests.
    const complete = path.match(/^\/__test\/complete\/([\w-]+)$/);
    if (complete && req.method === "POST") {
      const tx = transactions.get(complete[1]);
      if (!tx) return send(res, 404, { status: false });
      settle(tx, "success");
      return send(res, 200, { status: true });
    }
    if (path === "/__test/transactions" && req.method === "GET") {
      return send(res, 200, [...transactions.values()].map(({ reference, amount, currency, email, status, metadata }) => ({ reference, amount, currency, email, status, metadata })));
    }

    // Server API, which needs the secret key like the real one.
    if (req.headers.authorization !== `Bearer ${SECRET}`) return send(res, 401, { status: false, message: "Invalid key" });

    if (path === "/transaction/initialize" && req.method === "POST") {
      const body = JSON.parse((await readBody(req)) || "{}");
      if (!body.email || !Number.isInteger(body.amount) || !body.reference || !body.callback_url) {
        return send(res, 400, { status: false, message: "Missing fields" });
      }
      if (transactions.has(body.reference)) return send(res, 400, { status: false, message: "Duplicate Transaction Reference" });
      transactions.set(body.reference, { ...body, id: nextId++, status: "ongoing", paidAmount: body.amount, gateway_response: null, paid_at: null });
      return send(res, 200, {
        status: true,
        message: "Authorization URL created",
        data: { authorization_url: `${BASE}/checkout/${body.reference}`, access_code: `ac_${body.reference}`, reference: body.reference },
      });
    }

    const verify = path.match(/^\/transaction\/verify\/([\w-]+)$/);
    if (verify && req.method === "GET") {
      const tx = transactions.get(verify[1]);
      if (!tx) return send(res, 400, { status: false, message: "Transaction reference not found" });
      return send(res, 200, {
        status: true,
        message: "Verification successful",
        data: {
          id: tx.id,
          reference: tx.reference,
          status: tx.status,
          amount: tx.paidAmount,
          currency: tx.currency,
          gateway_response: tx.gateway_response,
          channel: "card",
          paid_at: tx.paid_at,
          customer: { email: tx.email },
          authorization: { last4: "4081", reusable: true },
        },
      });
    }
    send(res, 404, { status: false, message: `fake-paystack: ${req.method} ${path} not implemented` });
  })
  .listen(PORT, "127.0.0.1", () => console.log(`fake-paystack on ${BASE}`));
