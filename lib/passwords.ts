import { createHash, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string, hash: string) {
  const passwordHash = hashPassword(password);
  const left = Buffer.from(passwordHash);
  const right = Buffer.from(hash);

  return left.length === right.length && timingSafeEqual(left, right);
}
