// utils/encryption.js
const crypto = require("crypto");

// Use ENCRYPTION_KEY from env, fallback to JWT_SECRET-derived key
const getKey = () => {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey && envKey.length >= 32) {
    return Buffer.from(envKey.slice(0, 32), "utf8");
  }
  // Derive from JWT_SECRET if ENCRYPTION_KEY not set
  return crypto.createHash("sha256").update(process.env.JWT_SECRET).digest();
};

const key = getKey();

exports.encrypt = (text) => {
  if (!text) return "";
  
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
};

exports.decrypt = (data) => {
  if (!data) return "";
  
  const parts = data.split(":");
  if (parts.length !== 3) {
    // Handle legacy CBC format for backward compatibility
    return exports.decryptLegacy(data);
  }
  
  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};

// Legacy decryption for backward compatibility with old CBC-encrypted data
exports.decryptLegacy = (data) => {
  try {
    const [ivHex, encrypted] = data.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return "";
  }
};