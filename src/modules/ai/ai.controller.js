const aiService = require("./ai.service");

exports.generate = async (req, res) => {
  try {
    const result = await aiService.generateContent(req.body);

    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};