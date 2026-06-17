import dotenv from "dotenv";
dotenv.config();

import app from "./src/app.js";
import { getPool } from "./src/config/db.js";

const PORT = process.env.PORT || 5050;

try {
  await getPool(); // ensures DB is connected before server starts
  console.log("Database connected successfully");

  app.listen(PORT, () => console.log(` Server running on port ${PORT}`));
} catch (err) {
  console.error("Failed to connect to database:", err);
  //   process.exit(1); // stop server
}
