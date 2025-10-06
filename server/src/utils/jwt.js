import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

const EXPIRES_IN = "7d";

export function signToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}
