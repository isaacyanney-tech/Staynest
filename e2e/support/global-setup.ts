import { execFileSync } from "node:child_process";

/** Rebuilds the e2e database so every run starts from the same data. */
export default function globalSetup() {
  execFileSync("./scripts/e2e-db.sh", { stdio: "inherit", env: process.env });
}
