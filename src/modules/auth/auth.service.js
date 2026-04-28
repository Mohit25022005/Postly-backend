const bcrypt = require("bcrypt");
const crypto = require("crypto");
const prisma = require("../../config/db");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../../utils/jwt");

exports.register = async ({ email, password, name }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("User already exists");

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      password_hash: hashed,
      name,
    },
  });

  return user;
};

exports.login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Invalid credentials");

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error("Invalid credentials");

  const accessToken = generateAccessToken(user);
  const { rawToken, hash } = generateRefreshToken();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      token_hash: hash,
      user_id: user.id,
      expires_at: expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken: rawToken,
  };
};

exports.refresh = async (refreshToken) => {
  // 1. Hash incoming token
  const hash = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  // 2. Find token in DB
  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { token_hash: hash },
  });

  if (!tokenRecord) throw new Error("Invalid refresh token");

  // 3. Check expiry
  if (tokenRecord.expires_at < new Date()) {
    throw new Error("Refresh token expired");
  }

  // 4. (Optional but good) check revoked
  if (tokenRecord.revoked) {
    throw new Error("Refresh token revoked");
  }

  // 5. Get user
  const user = await prisma.user.findUnique({
    where: { id: tokenRecord.user_id },
  });

  if (!user) throw new Error("User not found");

  // 6. DELETE old token (rotation)
  await prisma.refreshToken.delete({
    where: { id: tokenRecord.id },
  });

  // 7. Generate new tokens
  const newAccessToken = generateAccessToken({
    id: user.id,
    email: user.email,
  });

  const { rawToken, hash: newHash } = generateRefreshToken();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // 8. Store new token
  await prisma.refreshToken.create({
    data: {
      token_hash: newHash,
      user_id: user.id,
      expires_at: expiresAt,
    },
  });

  // 9. Return tokens
  return {
    accessToken: newAccessToken,
    refreshToken: rawToken,
  };
};

exports.logout = async (refreshToken) => {
  const hash = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  await prisma.refreshToken.deleteMany({
    where: { token_hash: hash },
  });
};