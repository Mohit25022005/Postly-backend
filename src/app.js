const express = require("express");
const app = express();

app.use(express.json());

app.use("/api/user", require("./modules/user/user.routes"));
app.use("/api/auth", require("./modules/auth/auth.routes"));
app.use("/api/content", require("./modules/ai/ai.routes"));
app.use("/api/posts", require("./modules/post/post.routes"));
app.use("/api/dashboard", require("./modules/dashboard/dashboard.routes"));
app.use("/api/auth/twitter", require("./modules/auth/twitter.routes"));

module.exports = app;