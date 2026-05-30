import { createClient } from "@libsql/client";
import { createLogger } from "@dentaliq/logger";
import path from "path";

const logger = createLogger("test-libsql");

async function main() {
  try {
    const dbPath = path.resolve(__dirname, "./dentaliq.db");
    const url = `file:${dbPath}`;

    logger.info(`Testing libsql with: ${url}`);

    const client = createClient({ url });

    // Try a simple insert/select
    logger.info("Testing insert...");
    const result1 = await client.execute({
      sql: "INSERT INTO tenant_vbvwpxu9_patients (id, first_name, last_name) VALUES (?, ?, ?)",
      args: ["test-123", "John", "Doe"],
    });
    logger.info(`Insert result: ${JSON.stringify(result1)}`);

    // Try to select it back
    logger.info("Testing select...");
    const result2 = await client.execute({
      sql: "SELECT COUNT(*) as count FROM tenant_vbvwpxu9_patients WHERE id = ?",
      args: ["test-123"],
    });
    logger.info(`Select result: ${JSON.stringify(result2)}`);

    // Try a direct count
    const result3 = await client.execute({
      sql: "SELECT COUNT(*) as count FROM tenant_vbvwpxu9_patients",
    });
    logger.info(`Total count: ${JSON.stringify(result3)}`);
  } catch (err) {
    logger.error({ err }, "Test failed");
  }
}

main();
