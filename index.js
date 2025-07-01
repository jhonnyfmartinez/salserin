const { Client, GatewayIntentBits, Collection } = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
} = require("@discordjs/voice");
const config = require("./config");
const MusicService = require("./services/MusicService");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.commands = new Collection();
client.musicService = new MusicService();

client.once("ready", () => {
  console.log(`✅ ${client.user.tag} is online!`);
});

client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(config.prefix) || message.author.bot) return;

  const args = message.content.slice(config.prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  try {
    switch (commandName) {
      case "help":
        await handleHelp(message);
        break;
      case "play":
        await handlePlay(message, args);
        break;
      case "pause":
        await handlePause(message);
        break;
      case "resume":
        await handleResume(message);
        break;
      case "skip":
        await handleSkip(message);
        break;
      case "previous":
        await handlePrevious(message);
        break;
      case "stop":
        await handleStop(message);
        break;
      case "queue":
        await handleQueue(message);
        break;
      case "search":
        await handleSearch(message, args);
        break;
      case "youtube":
        await handleYouTube(message, args);
        break;
      case "spotify":
        await handleSpotify(message, args);
        break;
      case "searchall":
        await handleSearchAll(message, args);
        break;
      case "playlist":
        await handlePlaylist(message, args);
        break;
      case "radio":
        await handleRadio(message, args);
        break;
      default:
        message.reply(
          "❌ Unknown command. Use `!help` to see available commands."
        );
    }
  } catch (error) {
    console.error("Error executing command:", error);
    message.reply("❌ An error occurred while executing that command.");
  }
});

async function handleHelp(message) {
  const helpEmbed = {
    color: 0x0099ff,
    title: "🎵 Salserín Music Bot Commands",
    fields: [
      {
        name: "🎶 Music Controls",
        value:
          "`!play <song>` - Play a song from YouTube or Spotify\n`!youtube <query>` - Play from YouTube specifically\n`!spotify <query>` - Play from Spotify specifically\n`!pause` - Pause current song\n`!resume` - Resume playback\n`!skip` - Skip to next song\n`!previous` - Go to previous song\n`!stop` - Stop playback and clear queue",
      },
      {
        name: "🔍 Search & Discovery",
        value:
          "`!search <query>` - Search YouTube (default)\n`!search youtube <query>` - Search YouTube specifically\n`!search spotify <query>` - Search Spotify specifically\n`!searchall <query>` - Search both YouTube and Spotify\n`!queue` - Show current queue",
      },
      {
        name: "📋 Playlists & Radio",
        value:
          "`!playlist <name>` - Play a predefined playlist\nAvailable playlists: salsa\n`!radio <station>` - Play Colombian radio stations\nAvailable: elsol",
      },
    ],
    footer: {
      text: "Made with ❤️ for Colombian music lovers",
    },
  };

  message.reply({ embeds: [helpEmbed] });
}

async function handlePlay(message, args) {
  if (!message.member.voice.channel) {
    return message.reply("❌ You need to be in a voice channel to play music!");
  }

  if (!args.length) {
    return message.reply("❌ Please provide a song name or URL!");
  }

  const query = args.join(" ");

  try {
    await message.reply("🔍 Searching for your song...");
    const result = await client.musicService.play(message, query);

    if (result.success) {
      message.channel.send(`🎵 ${result.action}: **${result.title}**`);
    } else {
      message.channel.send(`❌ ${result.error}`);
    }
  } catch (error) {
    console.error("Play error:", error);
    message.channel.send("❌ Failed to play the song.");
  }
}

async function handlePause(message) {
  const result = client.musicService.pause(message.guild.id);
  message.reply(result.success ? "⏸️ Paused the music." : `❌ ${result.error}`);
}

async function handleResume(message) {
  const result = client.musicService.resume(message.guild.id);
  message.reply(
    result.success ? "▶️ Resumed the music." : `❌ ${result.error}`
  );
}

async function handleSkip(message) {
  const result = await client.musicService.skip(message.guild.id);
  if (result.success) {
    message.reply(
      result.nextSong
        ? `⏭️ Skipped! Now playing: **${result.nextSong}**`
        : "⏭️ Skipped! Queue is empty."
    );
  } else {
    message.reply(`❌ ${result.error}`);
  }
}

async function handlePrevious(message) {
  const result = await client.musicService.previous(message.guild.id);
  if (result.success) {
    message.reply(`⏮️ Playing previous song: **${result.song}**`);
  } else {
    message.reply(`❌ ${result.error}`);
  }
}

async function handleStop(message) {
  const result = client.musicService.stop(message.guild.id);
  message.reply(
    result.success
      ? "⏹️ Stopped the music and cleared the queue."
      : `❌ ${result.error}`
  );
}

async function handleQueue(message) {
  const queue = client.musicService.getQueue(message.guild.id);

  if (!queue || queue.length === 0) {
    return message.reply("📭 The queue is empty.");
  }

  const queueList = queue
    .slice(0, 10)
    .map((song, index) => `${index + 1}. **${song.title}** - ${song.duration}`)
    .join("\n");

  const embed = {
    color: 0x0099ff,
    title: "📋 Current Queue",
    description: queueList,
    footer: {
      text:
        queue.length > 10
          ? `And ${queue.length - 10} more songs...`
          : `${queue.length} songs in queue`,
    },
  };

  message.reply({ embeds: [embed] });
}

async function handleSearch(message, args) {
  if (!args.length) {
    return message.reply(
      "❌ Please provide a search query!\nUsage: `!search <query>` or `!search <source> <query>`\nSources: youtube, spotify"
    );
  }

  let source = "youtube";
  let query = args.join(" ");

  // Check if first argument is a source
  if (
    args[0].toLowerCase() === "youtube" ||
    args[0].toLowerCase() === "spotify"
  ) {
    source = args[0].toLowerCase();
    query = args.slice(1).join(" ");

    if (!query) {
      return message.reply(
        "❌ Please provide a search query after the source!"
      );
    }
  }

  try {
    const results = await client.musicService.search(query, source);

    if (results.length === 0) {
      return message.reply(`❌ No results found for "${query}" on ${source}.`);
    }

    const searchList = results
      .slice(0, 5)
      .map(
        (song, index) =>
          `${index + 1}. **${song.title}** by ${song.artist} - ${song.duration}`
      )
      .join("\n");

    const embed = {
      color: 0x0099ff,
      title: `🔍 ${
        source.charAt(0).toUpperCase() + source.slice(1)
      } Search Results for "${query}"`,
      description:
        searchList + `\n\nUse \`!${source} <query>\` to play from ${source}.`,
    };

    message.reply({ embeds: [embed] });
  } catch (error) {
    console.error("Search error:", error);
    message.reply("❌ Failed to search for songs.");
  }
}

async function handleYouTube(message, args) {
  if (!message.member.voice.channel) {
    return message.reply("❌ You need to be in a voice channel to play music!");
  }

  if (!args.length) {
    return message.reply(
      "❌ Please provide a YouTube video URL or search query!"
    );
  }

  const query = args.join(" ");

  try {
    await message.reply("🔍 Searching YouTube...");
    const result = await client.musicService.play(message, query, "youtube");

    if (result.success) {
      const sourceInfo = result.source ? ` (${result.source})` : "";
      const artistInfo = result.artist ? ` by ${result.artist}` : "";
      message.channel.send(
        `🎵 ${result.action}: **${result.title}**${artistInfo}${sourceInfo}`
      );
    } else {
      message.channel.send(`❌ ${result.error}`);
    }
  } catch (error) {
    console.error("YouTube error:", error);
    message.channel.send("❌ Failed to play the video.");
  }
}

async function handleSpotify(message, args) {
  if (!message.member.voice.channel) {
    return message.reply("❌ You need to be in a voice channel to play music!");
  }

  if (!args.length) {
    return message.reply(
      "❌ Please provide a Spotify track URL or search query!"
    );
  }

  const query = args.join(" ");

  try {
    await message.reply("🔍 Searching Spotify...");
    const result = await client.musicService.play(message, query, "spotify");

    if (result.success) {
      const sourceInfo = result.source ? ` (${result.source})` : "";
      const artistInfo = result.artist ? ` by ${result.artist}` : "";
      message.channel.send(
        `🎵 ${result.action}: **${result.title}**${artistInfo}${sourceInfo}`
      );
    } else {
      message.channel.send(`❌ ${result.error}`);
    }
  } catch (error) {
    console.error("Spotify error:", error);
    message.channel.send("❌ Failed to play the song.");
  }
}

async function handleSearchAll(message, args) {
  if (!args.length) {
    return message.reply("❌ Please provide a search query!");
  }

  const query = args.join(" ");

  try {
    const results = await client.musicService.searchAll(query);

    if (results.total === 0) {
      return message.reply("❌ No results found for your search.");
    }

    let searchList = "";

    if (results.youtube.length > 0) {
      searchList += "**YouTube Results:**\n";
      searchList +=
        results.youtube
          .slice(0, 3)
          .map(
            (song, index) =>
              `${index + 1}. **${song.title}** by ${song.artist} - ${
                song.duration
              }`
          )
          .join("\n") + "\n\n";
    }

    if (results.spotify.length > 0) {
      searchList += "**Spotify Results:**\n";
      searchList += results.spotify
        .slice(0, 3)
        .map(
          (song, index) =>
            `${index + 1}. **${song.title}** by ${song.artist} - ${
              song.duration
            }`
        )
        .join("\n");
    }

    const embed = {
      color: 0x0099ff,
      title: `🔍 Search Results for "${query}"`,
      description:
        searchList +
        "\n\nUse `!youtube <query>` or `!spotify <query>` to play from specific sources.",
    };

    message.reply({ embeds: [embed] });
  } catch (error) {
    console.error("SearchAll error:", error);
    message.reply("❌ Failed to search for songs.");
  }
}

async function handlePlaylist(message, args) {
  if (!args.length) {
    return message.reply(
      "❌ Please specify a playlist name!\nAvailable: `salsa`"
    );
  }

  const playlistName = args[0].toLowerCase();

  try {
    const result = await client.musicService.playPlaylist(
      message,
      playlistName
    );

    if (result.success) {
      message.reply(
        `🎵 Playing playlist: **${playlistName}** (${result.songsAdded} songs added to queue)`
      );
    } else {
      message.reply(`❌ ${result.error}`);
    }
  } catch (error) {
    console.error("Playlist error:", error);
    message.reply("❌ Failed to load playlist.");
  }
}

async function handleRadio(message, args) {
  if (!message.member.voice.channel) {
    return message.reply("❌ You need to be in a voice channel to play radio!");
  }

  if (!args.length) {
    const stations = Object.keys(config.radioStations).join(", ");
    return message.reply(
      `❌ Please specify a radio station!\nAvailable: ${stations}`
    );
  }

  const stationName = args[0].toLowerCase();

  try {
    const result = await client.musicService.playRadio(message, stationName);

    if (result.success) {
      message.reply(`📻 Now playing: **${stationName.toUpperCase()}** radio`);
    } else {
      message.reply(`❌ ${result.error}`);
    }
  } catch (error) {
    console.error("Radio error:", error);
    message.reply("❌ Failed to play radio station.");
  }
}

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

client.login(config.token);
