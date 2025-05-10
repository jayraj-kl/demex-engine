import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const db = drizzle({
  connection: {
    connectionString: process.env.DATABASE_URL!,
    // ssl: true,
  },
});

async function main() {}

main();
