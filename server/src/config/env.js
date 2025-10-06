import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? "super-secret-key",
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  databaseUrl: process.env.DATABASE_URL ?? "file:./dev.db"
};

if (!process.env.JWT_SECRET) {
  console.warn("Warning: JWT_SECRET is not set. Falling back to insecure default.");
}
