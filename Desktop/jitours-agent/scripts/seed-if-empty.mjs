import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
let needsSeed;

try {
  needsSeed = !(await db.companyInfo.findUnique({ where: { id: "company" } }));
} finally {
  await db.$disconnect();
}

if (needsSeed) {
  const cli = resolve("node_modules/tsx/dist/cli.mjs");
  if (!existsSync(cli)) throw new Error("The tsx seed runner is missing from node_modules.");
  for (const script of ["prisma/seed.ts", "prisma/import-programmes.ts"]) {
    const result = spawnSync(process.execPath, [cli, script], { stdio: "inherit", env: process.env });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
} else {
  console.log("Database already contains company data; skipping sample seed.");
}
