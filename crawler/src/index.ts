import { Hono } from "hono";
import { populate, start } from "./crawler/crawler";
import index from "./indexer";

const app = new Hono();

/**
 * Main function to run the crawler and indexer
 */
async function main() {
  console.log("Starting crawler process...");
  try {
    console.log("Running crawler...");
    // await populate();
    // await start();
    console.log("Running indexer...");
    await index();

    console.log("Process completed successfully");
  } catch (error) {
    console.error("Error in crawler process:", error);
    process.exit(1);
  }
}

// Execute the main function directly
main().catch((error) => {
  console.error("Unhandled error in main process:", error);
  process.exit(1);
});

// app.get('/', (c) => {
//   return c.text('Hello Hono!')
// })

// export default app
