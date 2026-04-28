const authService = require("./auth.service");

exports.register = async (req, res) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({ data: user, meta: null, error: null });
  } catch (err) {
    console.error(`[register] ${err.message}`);
    res.status(400).json({ data: null, meta: null, error: { message: err.message } });
  }
};

exports.login = async (req, res) => {
  try {
    const tokens = await authService.login(req.body);
    res.json({
      data: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      },
      meta: null,
      error: null,
    });
  } catch (err) {
    console.error(`[login] ${err.message}`);
    res.status(401).json({ data: null, meta: null, error: { message: err.message } });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    const tokens = await authService.refresh(refresh_token);
    res.json({
      data: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      },
      meta: null,
      error: null,
    });
  } catch (err) {
    console.error(`[refresh] ${err.message}`);
    res.status(401).json({ data: null, meta: null, error: { message: err.message } });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    await authService.logout(refresh_token);
    res.json({ data: { message: "Logged out" }, meta: null, error: null });
  } catch (err) {
    console.error(`[logout] ${err.message}`);
    res.status(400).json({ data: null, meta: null, error: { message: err.message } });
  }
};

exports.me = async (req, res) => {
  try {
    res.json({ data: req.user, meta: null, error: null });
  } catch (err) {
    console.error(`[me] ${err.message}`);
    res.status(500).json({ data: null, meta: null, error: { message: err.message } });
  }
};
