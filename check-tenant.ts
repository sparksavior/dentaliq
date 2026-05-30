import { getDb, users, tenants } from "@dentaliq/db";
import { eq } from "drizzle-orm";

async function main() {
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, "demo@dentaliq.ca"));
  if (!user) {
    console.log("No user demo@dentaliq.ca");
    process.exit(1);
  }
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, user.tenantId));
  console.log("User tenant:", tenant.slug, tenant.schemaName);
  process.exit(0);
}
main();
