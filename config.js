require("dotenv").config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  },
  prefix: "!",
  radioStations: {
    elsol:
      "https://us-b4-p-e-qg12-audio.cdn.mdstrm.com/live-audio-aw/632cb6ecaa9ace684913bf19",
  },
};
