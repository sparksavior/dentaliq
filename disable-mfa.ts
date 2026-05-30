import { getDb, users } from "@dentaliq/db";
import { eq } from "drizzle-orm";

async function main() {
  const db = getDb();

  try {
    const result = await db
      .update(users)
      .set({ mfaEnabled: 0 }) // using the schema's field name, wait let's use SQL to be safe if Drizzle schema maps to mfa_enabled
      .where(eq(users.email, "demo@dentaliq.ca"));

    console.log("Successfully disabled MFA for demo@dentaliq.ca");
    process.exit(0);
  } catch (error) {
    console.error("Failed:", error);
    process.exit(1);
  }
}

main();
