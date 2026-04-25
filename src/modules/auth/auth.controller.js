const authService = require("./auth.service");

exports.register = async (req, res) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({ data: user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const tokens = await authService.login(req.body);
    res.json({ data: tokens });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    const tokens = await authService.refresh(refresh_token);
    res.json({ data: tokens });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
};

exports.logout = async (req, res) => {
  try {
    await authService.logout(req.user.id);
    res.json({ message: "Logged out" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.me = async (req, res) => {
  res.json({ data: req.user });
};