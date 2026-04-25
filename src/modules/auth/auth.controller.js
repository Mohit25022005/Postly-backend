// src/modules/auth/auth.controller.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../../config/db");

exports.register = async (req, res) => {
  const { email, password, name } = req.body;

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      password_hash: hashed,
      name,
    },
  });

  res.json({ data: user });
};