import { pool } from "@workspace/db";
import { updateLegacySamples } from "./safemap-samples";
try {
  await updateLegacySamples();
} finally {
  await pool.end();
}