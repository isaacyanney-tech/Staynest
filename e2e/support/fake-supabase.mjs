// A small stand-in for the Supabase API, used only by local browser tests when
// the real project is unreachable. /rest/v1 is proxied to a local PostgREST
// running on the e2e database; /auth/v1 implements just enough of GoTrue for
// password sign-in, sign-up and session checks, and /storage/v1 keeps files on
// disk while checking every write against the real storage.objects policies.
// Never deploy this.
import { createHmac, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, normalize } from "node:path";
import http from "node:http";

const PORT = Number(process.env.FAKE_SUPABASE_PORT ?? 54321);
const REST = process.env.POSTGREST_URL ?? "http://127.0.0.1:54322";
export const JWT_SECRET = process.env.E2E_JWT_SECRET ?? "e2e-only-secret-not-used-anywhere-else-000";
const PASSWORD = "Password1234";
const DB = process.env.E2E_DB_NAME ?? "staynest_e2e";
const FILES = process.env.FAKE_STORAGE_DIR ?? join(tmpdir(), "staynest-e2e-storage");
rmSync(FILES, { recursive: true, force: true });
mkdirSync(FILES, { recursive: true });

const b64 = (v) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");
export function sign(claims) {
  const head = b64({ alg: "HS256", typ: "JWT" });
  const body = b64(claims);
  const sig = createHmac("sha256", JWT_SECRET).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}
function verify(token) {
  const [head, body, sig] = (token ?? "").split(".");
  if (!sig) return null;
  const want = createHmac("sha256", JWT_SECRET).update(`${head}.${body}`).digest("base64url");
  if (want !== sig) return null;
  const claims = JSON.parse(Buffer.from(body, "base64url").toString());
  return claims.exp && claims.exp * 1000 < Date.now() ? null : claims;
}

function sql(query, ...params) {
  // Parameters are passed as psql variables, never interpolated into SQL text.
  const args = ["-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1", "-d", DB];
  params.forEach((p, i) => args.push("-v", `p${i}=${p}`));
  return execFileSync("psql", args, { input: query }).toString().trim();
}

function userByEmail(email) {
  const row = sql(`select json_build_object('id', id, 'email', email, 'meta', raw_user_meta_data) from auth.users where email = :'p0'`, email);
  return row ? JSON.parse(row) : null;
}
function userById(id) {
  const row = sql(`select json_build_object('id', id, 'email', email, 'meta', raw_user_meta_data) from auth.users where id = :'p0'::uuid`, id);
  return row ? JSON.parse(row) : null;
}

function toUser(u) {
  return {
    id: u.id,
    aud: "authenticated",
    role: "authenticated",
    email: u.email,
    email_confirmed_at: new Date().toISOString(),
    app_metadata: { provider: "email" },
    user_metadata: u.meta ?? {},
    created_at: new Date().toISOString(),
  };
}

function session(u) {
  const now = Math.floor(Date.now() / 1000);
  const access = sign({ sub: u.id, email: u.email, role: "authenticated", aud: "authenticated", iat: now, exp: now + 3600 });
  return { access_token: access, token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: `r.${u.id}`, user: toUser(u) };
}

const send = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(body === undefined ? "" : JSON.stringify(body));
};
const readBody = (req) =>
  new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });

async function auth(req, res, url) {
  const path = url.pathname.replace("/auth/v1", "");
  const raw = await readBody(req);
  const body = raw ? JSON.parse(raw) : {};
  const bearer = req.headers.authorization?.replace(/^Bearer /, "");

  if (path === "/token" && url.searchParams.get("grant_type") === "password") {
    const u = userByEmail(String(body.email ?? "").toLowerCase());
    if (!u || body.password !== PASSWORD) return send(res, 400, { code: "invalid_credentials", error_code: "invalid_credentials", msg: "Invalid login credentials" });
    return send(res, 200, session(u));
  }
  if (path === "/token" && url.searchParams.get("grant_type") === "refresh_token") {
    const id = String(body.refresh_token ?? "").replace(/^r\./, "");
    const u = /^[0-9a-f-]{36}$/.test(id) ? userById(id) : null;
    return u ? send(res, 200, session(u)) : send(res, 400, { error_code: "refresh_token_not_found", msg: "Invalid Refresh Token" });
  }
  if (path === "/user" && req.method === "GET") {
    const claims = verify(bearer);
    const u = claims ? userById(claims.sub) : null;
    return u ? send(res, 200, toUser(u)) : send(res, 401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
  }
  if (path === "/user" && req.method === "PUT") {
    // Password changes are accepted but not stored: every test account keeps PASSWORD.
    const claims = verify(bearer);
    const u = claims ? userById(claims.sub) : null;
    if (!u) return send(res, 401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
    if (body.password === PASSWORD) return send(res, 422, { code: 422, error_code: "same_password", msg: "New password should be different from the old password." });
    return send(res, 200, toUser(u));
  }
  if (path === "/signup") {
    const email = String(body.email ?? "").toLowerCase();
    if (!userByEmail(email)) {
      sql(`insert into auth.users (id, email, raw_user_meta_data) values (:'p0'::uuid, :'p1', :'p2'::jsonb)`, randomUUID(), email, JSON.stringify(body.data ?? {}));
    }
    // Behaves like a project with email confirmation on: no session yet.
    return send(res, 200, { ...toUser(userByEmail(email)), identities: [{}] });
  }
  if (path === "/logout") return send(res, 204);
  if (path === "/recover") return send(res, 200, {});
  return send(res, 404, { msg: `fake-supabase: ${req.method} ${path} not implemented` });
}

const readRaw = (req) =>
  new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });

/** Runs SQL as the signed-in user so storage.objects row-level security applies. */
function sqlAs(claims, query, ...params) {
  return sql(`begin;\nset local role authenticated;\nselect set_config('request.jwt.claims', :'p0', true) \\g /dev/null\n${query}\ncommit;`, JSON.stringify(claims), ...params);
}

function filePath(bucket, name) {
  const p = normalize(join(FILES, bucket, name));
  if (!p.startsWith(join(FILES, bucket) + "/")) throw new Error("bad path");
  return p;
}

async function storage(req, res, url) {
  const path = decodeURIComponent(url.pathname.replace("/storage/v1", ""));
  const claims = verify(req.headers.authorization?.replace(/^Bearer /, ""));

  const pub = path.match(/^\/object\/public\/([\w-]+)\/(.+)$/);
  if (pub && req.method === "GET") {
    const [, bucket, name] = pub;
    const isPublic = sql(`select public from storage.buckets where id = :'p0'`, bucket) === "t";
    const file = isPublic ? filePath(bucket, name) : null;
    if (!file || !existsSync(file)) return send(res, 400, { statusCode: "404", error: "not_found", message: "Object not found" });
    res.writeHead(200, { "content-type": readFileSync(`${file}.type`, "utf8"), "cache-control": "public, max-age=3600" });
    return res.end(readFileSync(file));
  }

  // Signed links to private files: the caller must be able to read the object
  // under storage RLS, and the link carries a short-lived token for that path.
  const signMany = path.match(/^\/object\/sign\/([\w-]+)$/);
  if (signMany && req.method === "POST") {
    const [, bucket] = signMany;
    const { paths = [], expiresIn = 60 } = JSON.parse((await readRaw(req)).toString() || "{}");
    if (!claims) return send(res, 400, { statusCode: "403", error: "Unauthorized", message: "Missing or invalid token" });
    const exp = Math.floor(Date.now() / 1000) + Number(expiresIn);
    return send(
      res,
      200,
      paths.map((name) => {
        const visible = sqlAs(claims, `select count(*) from storage.objects where bucket_id = :'p1' and name = :'p2';`, bucket, name).endsWith("1");
        return visible
          ? { path: name, error: null, signedURL: `/object/sign/${bucket}/${name}?token=${sign({ url: `${bucket}/${name}`, exp })}` }
          : { path: name, error: "Either the object does not exist or you do not have access to it", signedURL: null };
      }),
    );
  }
  const signed = path.match(/^\/object\/sign\/([\w-]+)\/(.+)$/);
  if (signed && req.method === "GET") {
    const [, bucket, name] = signed;
    const token = verify(url.searchParams.get("token"));
    const file = token?.url === `${bucket}/${name}` ? filePath(bucket, name) : null;
    if (!file || !existsSync(file)) return send(res, 400, { statusCode: "400", error: "InvalidJWT", message: "Invalid or expired link" });
    res.writeHead(200, { "content-type": readFileSync(`${file}.type`, "utf8"), "cache-control": "private, no-store" });
    return res.end(readFileSync(file));
  }

  const upload = path.match(/^\/object\/([\w-]+)\/(.+)$/);
  if (upload && req.method === "POST") {
    const [, bucket, name] = upload;
    const data = await readRaw(req);
    if (!claims) return send(res, 400, { statusCode: "403", error: "Unauthorized", message: "Missing or invalid token" });
    try {
      sqlAs(claims, `insert into storage.objects (bucket_id, name, owner) values (:'p1', :'p2', :'p3'::uuid);`, bucket, name, claims.sub);
    } catch {
      return send(res, 400, { statusCode: "403", error: "Unauthorized", message: "new row violates row-level security policy" });
    }
    const file = filePath(bucket, name);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, data);
    writeFileSync(`${file}.type`, String(req.headers["content-type"] ?? "application/octet-stream"));
    return send(res, 200, { Key: `${bucket}/${name}`, Id: randomUUID() });
  }

  const remove = path.match(/^\/object\/([\w-]+)$/);
  if (remove && req.method === "DELETE") {
    const [, bucket] = remove;
    const { prefixes = [] } = JSON.parse((await readRaw(req)).toString() || "{}");
    if (!claims) return send(res, 200, []);
    const removed = [];
    for (const name of prefixes) {
      const out = sqlAs(claims, `delete from storage.objects where bucket_id = :'p1' and name = :'p2' returning name;`, bucket, name);
      if (out.includes(name)) {
        rmSync(filePath(bucket, name), { force: true });
        rmSync(`${filePath(bucket, name)}.type`, { force: true });
        removed.push({ name, bucket_id: bucket });
      }
    }
    return send(res, 200, removed);
  }
  return send(res, 404, { message: `fake-supabase: ${req.method} storage ${path} not implemented` });
}

function rest(req, res, url) {
  const target = new URL(url.pathname.replace("/rest/v1", "") + url.search, REST);
  const headers = { ...req.headers, host: target.host };
  // PostgREST rejects tokens it cannot verify; the anon key is not a JWT here.
  if (!verify(headers.authorization?.replace(/^Bearer /, ""))) delete headers.authorization;
  const upstream = http.request(target, { method: req.method, headers }, (up) => {
    res.writeHead(up.statusCode ?? 502, up.headers);
    up.pipe(res);
  });
  upstream.on("error", (e) => send(res, 502, { message: e.message }));
  req.pipe(upstream);
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/auth/v1")) return void auth(req, res, url).catch((e) => send(res, 500, { msg: e.message }));
    if (url.pathname.startsWith("/rest/v1")) return rest(req, res, url);
    if (url.pathname.startsWith("/storage/v1")) return void storage(req, res, url).catch((e) => send(res, 500, { message: e.message }));
    send(res, 404, {});
  })
  .listen(PORT, "127.0.0.1", () => console.log(`fake-supabase on http://127.0.0.1:${PORT} -> ${REST}`));
