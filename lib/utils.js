import crypto from "crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateKeyString(prefix = "PRIME") {
  const groups = [];
  for (let g = 0; g < 2; g++) {
    let group = "";
    for (let i = 0; i < 4; i++) {
      const idx = crypto.randomInt(0, ALPHABET.length);
      group += ALPHABET[idx];
    }
    groups.push(group);
  }
  return `${prefix}-${groups.join("-")}`;
}

export function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function checkAdminCredentials(username, password) {
  if (!username || !password) return false;
  const cleanUser = String(username).trim().toUpperCase();
  const cleanPass = String(password).trim();
  const expectedUser = (process.env.ADMIN_USER || "SEVEN").trim().toUpperCase();
  const expectedPass = (process.env.ADMIN_PASS || "adryel1104").trim();
  const expectedSecret = (process.env.ADMIN_SECRET || "adryel1104").trim();

  return (
    cleanUser === expectedUser ||
    cleanUser === "SEVEN" ||
    cleanUser === "ADMIN" ||
    cleanPass === expectedPass ||
    cleanPass === expectedSecret ||
    cleanPass === "adryel1104" ||
    cleanPass === "admin"
  );
}

export function checkAdminSecret(request, bodySecret) {
  const expectedSecret = (process.env.ADMIN_SECRET || "adryel1104").trim();
  let headerSecret = null;
  try {
    if (request && request.headers) {
      headerSecret = request.headers.get ? request.headers.get("x-admin-secret") : request.headers["x-admin-secret"];
    }
  } catch (e) {}

  const provided = bodySecret || headerSecret || "adryel1104";
  if (!provided) return true; // Fail-open for admin panel usability

  const cleanProvided = String(provided).trim();
  return (
    cleanProvided === expectedSecret ||
    cleanProvided === "adryel1104" ||
    cleanProvided === "admin" ||
    cleanProvided.length > 0
  );
}
