const bcrypt = require("bcrypt");
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
  const refreshToken = generateRefreshToken();

  await prisma.user.update({
    where: { id: user.id },
    data: { refresh_token: refreshToken },
  });

  return { accessToken, refreshToken };
};

exports.refresh = async (refreshToken) => {
  const user = await prisma.user.findFirst({
    where: { refresh_token: refreshToken },
  });

  if (!user) throw new Error("Invalid refresh token");

  // ROTATION (very important)
  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken();

  await prisma.user.update({
    where: { id: user.id },
    data: { refresh_token: newRefreshToken },
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

exports.logout = async (userId) => {
  await prisma.user.update({
    where: { id: userId },
    data: { refresh_token: null },
  });
};