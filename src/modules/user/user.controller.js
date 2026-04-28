// user.controller.js
const userService = require("./user.service");

exports.getProfile = async (req, res) => {
  try {
    const user = await userService.getProfile(req.user.id);
    res.json({ data: user, meta: null, error: null });
  } catch (err) {
    console.error(`[getProfile] ${err.message}`);
    res.status(500).json({ data: null, meta: null, error: { message: err.message } });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await userService.updateProfile(req.user.id, req.body);
    res.json({ data: user, meta: null, error: null });
  } catch (err) {
    console.error(`[updateProfile] ${err.message}`);
    res.status(500).json({ data: null, meta: null, error: { message: err.message } });
  }
};

exports.addSocial = async (req, res) => {
  try {
    const acc = await userService.addSocialAccount(req.user.id, req.body);
    res.json({ data: acc, meta: null, error: null });
  } catch (err) {
    console.error(`[addSocial] ${err.message}`);
    res.status(500).json({ data: null, meta: null, error: { message: err.message } });
  }
};

exports.getSocial = async (req, res) => {
  try {
    const accs = await userService.getSocialAccounts(req.user.id);
    res.json({ data: accs, meta: null, error: null });
  } catch (err) {
    console.error(`[getSocial] ${err.message}`);
    res.status(500).json({ data: null, meta: null, error: { message: err.message } });
  }
};

exports.deleteSocial = async (req, res) => {
  try {
    await userService.deleteSocialAccount(req.user.id, req.params.id);
    res.json({ data: { message: "Deleted" }, meta: null, error: null });
  } catch (err) {
    console.error(`[deleteSocial] ${err.message}`);
    res.status(500).json({ data: null, meta: null, error: { message: err.message } });
  }
};

exports.saveAIKeys = async (req, res) => {
  try {
    const keys = await userService.saveAIKeys(req.user.id, req.body);
    res.json({ data: keys, meta: null, error: null });
  } catch (err) {
    console.error(`[saveAIKeys] ${err.message}`);
    res.status(500).json({ data: null, meta: null, error: { message: err.message } });
  }
};
