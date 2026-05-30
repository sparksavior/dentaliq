import { getDb } from "@dentaliq/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb() as any;

  try {
    await db.run(
      sql.raw(
        `ALTER TABLE users ADD COLUMN demo_account INTEGER NOT NULL DEFAULT 0`,
      ),
    );
    console.log("✓ Column added successfully");
  } catch (err: any) {
    if (err.message?.includes("duplicate")) {
      console.log("✓ Column already exists");
    } else {
      console.error("Error:", err.message);
    }
  }

  process.exit(0);
}

main();
