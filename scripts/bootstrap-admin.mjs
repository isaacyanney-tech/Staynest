#!/usr/bin/env node
// Creates or promotes the first StayNest administrator.
//
//   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
//     npm run admin:bootstrap -- --email you@example.com
//
// - If the email has no account, one is created with a random password that is
//   printed once. Sign in at /admin/login and change it straight away.
// - If the account exists, it is promoted to admin.
// - Refuses to run when an administrator already exists, unless --force is given.
//   Later admins should be promoted from the admin dashboard instead.
//
// The service role key bypasses row-level security. Run this from your own
// machine, never from the browser, and never commit the key.
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const email = arg("email")?.trim().toLowerCase();
const name = arg("name") ?? "";
const force = process.argv.includes("--force");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("Usage: npm run admin:bootstrap -- --email you@example.com [--name \"Your Name\"] [--force]");
  process.exit(1);
}
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment first.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { count, error: countError } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
if (countError) {
  console.error(`Could not read profiles: ${countError.message}`);
  process.exit(1);
}
if ((count ?? 0) > 0 && !force) {
  console.error(`An administrator already exists (${count}). Promote others from the admin dashboard, or pass --force.`);
  process.exit(1);
}

async function findUser(address) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === address);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

let user = await findUser(email);
let password = null;
if (!user) {
  password = randomBytes(18).toString("base64url");
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error) {
    console.error(`Could not create the account: ${error.message}`);
    process.exit(1);
  }
  user = data.user;
}

const { error: roleError } = await supabase.from("profiles").update({ role: "admin", is_suspended: false }).eq("id", user.id);
if (roleError) {
  console.error(`Could not set the admin role: ${roleError.message}`);
  process.exit(1);
}
await supabase.rpc("write_audit", { p_action: "admin.bootstrap", p_entity: "profiles", p_entity_id: user.id, p_details: { email } }).then(
  () => {},
  () => {},
);

console.log(`\n${email} is now an administrator.`);
if (password) {
  console.log(`Temporary password (shown once): ${password}`);
  console.log("Sign in at /admin/login, then change it with 'Forgot your password' on /sign-in.");
} else {
  console.log("Sign in at /admin/login with the account's existing password.");
}
