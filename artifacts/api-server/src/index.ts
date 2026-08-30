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

backfillSeoMetadata()
  .then(({ updated }) => {
    if (updated > 0) logger.info({ updated }, "SEO metadata backfilled");
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }

      logger.info({ port }, "Server listening");
    });
  })
  .catch((err) => {
    logger.error({ err }, "SEO metadata initialization failed");
    process.exit(1);
  });
