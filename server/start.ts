// server/start.ts
import "dotenv/config";
import { createServer } from "./index.js";

const port = process.env.PORT || 3001;
const app = createServer();

app.listen(port, () => {
  console.log(`✅ Server started on http://localhost:${port}`);
  console.log(`📡 API endpoint: http://localhost:${port}/api`);
  console.log(`🏓 Health check: http://localhost:${port}/api/ping`);
});