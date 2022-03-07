require("dotenv").config();
const bot = require("./bot");
const express = require("express");

const app = express();

const PORT = 6969;

app.get("/", (req, res) => {
  res.send("Bot is live");
});
app.listen(PORT, () => console.log("Bot is live"));
bot.launch();
