import { prisma } from "../lib/prisma";
import fs from "fs";
import path from "path";

async function runMigration() {
  console.log("Starting Subscription Engine Database Migration...");
  const sqlPath = path.join(__dirname, "../../prisma/migrations/subscription_engine_tables.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  try {
    // Split on semicolon statements and execute
    await prisma.$executeRawUnsafe(sql);
    console.log("✅ Subscription Engine migration executed successfully!");
  } catch (err: any) {
    console.error("Migration error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();

