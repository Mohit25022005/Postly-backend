// user.controller.js
const userService = require("./user.service");

exports.getProfile = async (req, res) => {
  const user = await userService.getProfile(req.user.id);
  res.json({ data: user });
};

exports.updateProfile = async (req, res) => {
  const user = await userService.updateProfile(req.user.id, req.body);
  res.json({ data: user });
};

exports.addSocial = async (req, res) => {
  const acc = await userService.addSocialAccount(req.user.id, req.body);
  res.json({ data: acc });
};

exports.getSocial = async (req, res) => {
  const accs = await userService.getSocialAccounts(req.user.id);
  res.json({ data: accs });
};

exports.deleteSocial = async (req, res) => {
  await userService.deleteSocialAccount(req.user.id, req.params.id);
  res.json({ message: "Deleted" });
};

exports.saveAIKeys = async (req, res) => {
  const keys = await userService.saveAIKeys(req.user.id, req.body);
  res.json({ data: keys });
};