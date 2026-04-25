require("dotenv").config();
require("./modules/bot/bot");
require("./modules/queue/worker");

const app = require("./app");

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});