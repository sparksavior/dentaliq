import { defineConfig } from "drizzle-kit";
import path from "path";
import * as dotenv from "dotenv";

// 1. Load the .env file from the root folder
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export default defineConfig({
  schema: "./src/schema/*",
  out: "./src/migrations",
  dialect: "sqlite",
  dbCredentials: {
    // 2. Resolve the path relative to the root, using the .env variable if it exists
    url: `file:${path.resolve(__dirname, "../../", process.env.DATABASE_PATH ?? "dentaliq.db")}`,
  },
});
