const express = require("express");
const app = express();

app.use(express.json());

app.use("/api/auth", require("./modules/auth/auth.routes"));
app.use("/api/content", require("./modules/ai/ai.routes"));

module.exports = app;