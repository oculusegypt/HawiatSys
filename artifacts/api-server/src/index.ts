import app from "./app";
import { logger } from "./lib/logger";
import { backfillSeoMetadata } from "./lib/seoMetadata";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const startServer = () => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
};

backfillSeoMetadata()
  .then(({ updated }) => {
    if (updated > 0) logger.info({ updated }, "SEO metadata backfilled");
    startServer();
  })
  .catch((err) => {
    // Backfill is a repair aid, not a startup dependency. The API should
    // remain available if a legacy table or row cannot be inspected.
    logger.error({ err }, "SEO metadata initialization failed; starting API");
    startServer();
  });
