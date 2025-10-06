import { verifyToken } from "../utils/jwt.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization header missing" });
  }

  const token = header.substring("Bearer ".length);

  try {
    const user = verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    console.error("JWT verification failed", error);
    res.status(401).json({ message: "Invalid or expired token" });
  }
}
