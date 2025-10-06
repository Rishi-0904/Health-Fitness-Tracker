import { env } from "./config/env.js";
import { app } from "./server.js";

const port = env.port;

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
