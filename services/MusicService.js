const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
} = require("@discordjs/voice");
const ytdl = require("ytdl-core");
const YoutubeSearchApi = require("youtube-search-api");
const SpotifyWebApi = require("spotify-web-api-node");
const config = require("../config");

class MusicService {
  constructor() {
    this.queues = new Map();
    this.players = new Map();
    this.connections = new Map();
    this.currentSongs = new Map();
    this.history = new Map();

    this.spotifyApi = new SpotifyWebApi({
      clientId: config.spotify.clientId,
      clientSecret: config.spotify.clientSecret,
    });

    this.initSpotify();

    this.playlists = {
      salsa: [
        "Marc Anthony - Vivir Mi Vida",
        "La Santa Cecilia - La Negra",
        "Grupo Niche - Cali Aji",
        "Willie Colon - El Gran Varón",
        "Hector Lavoe - Periódico de Ayer",
      ],
    };
  }

  async initSpotify() {
    try {
      const data = await this.spotifyApi.clientCredentialsGrant();
      this.spotifyApi.setAccessToken(data.body["access_token"]);

      setTimeout(() => {
        this.initSpotify();
      }, data.body["expires_in"] * 1000 * 0.9);
    } catch (error) {
      console.error("Spotify authentication error:", error);
    }
  }

  async play(message, query, source = null) {
    const guildId = message.guild.id;
    const voiceChannel = message.member.voice.channel;

    if (!this.queues.has(guildId)) {
      this.queues.set(guildId, []);
      this.history.set(guildId, []);
    }

    try {
      let songInfo;

      if (this.isSpotifyUrl(query)) {
        songInfo = await this.getSpotifyTrack(query);
      } else if (this.isYouTubeUrl(query)) {
        songInfo = await this.getYouTubeInfo(query);
      } else if (source) {
        // Use specified source
        return await this.playFromSource(message, query, source);
      } else {
        songInfo = await this.searchYouTubeSingle(query);
      }

      if (!songInfo) {
        return { success: false, error: "Could not find the song." };
      }

      const queue = this.queues.get(guildId);
      queue.push(songInfo);

      if (!this.connections.has(guildId)) {
        await this.createConnection(voiceChannel, guildId);
      }

      if (queue.length === 1) {
        await this.playNext(guildId);
        return {
          success: true,
          action: "Now playing",
          title: songInfo.title,
          source: songInfo.source || "YouTube",
          artist: songInfo.artist,
        };
      } else {
        return {
          success: true,
          action: "Added to queue",
          title: songInfo.title,
          source: songInfo.source || "YouTube",
          artist: songInfo.artist,
        };
      }
    } catch (error) {
      console.error("Play error:", error);
      return { success: false, error: "Failed to play the song." };
    }
  }

  async createConnection(voiceChannel, guildId) {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer();

    player.on(AudioPlayerStatus.Idle, async () => {
      await this.playNext(guildId);
    });

    player.on("error", (error) => {
      console.error("Audio player error:", error);
    });

    connection.subscribe(player);

    this.connections.set(guildId, connection);
    this.players.set(guildId, player);

    connection.on(VoiceConnectionStatus.Disconnected, () => {
      this.cleanup(guildId);
    });
  }

  async playNext(guildId) {
    const queue = this.queues.get(guildId);
    const player = this.players.get(guildId);

    if (!queue || queue.length === 0) {
      this.currentSongs.delete(guildId);
      return;
    }

    const song = queue.shift();
    this.currentSongs.set(guildId, song);

    const history = this.history.get(guildId);
    history.push(song);
    if (history.length > 50) {
      history.shift();
    }

    try {
      const stream = ytdl(song.url, {
        filter: "audioonly",
        highWaterMark: 1 << 25,
        quality: "highestaudio",
      });

      const resource = createAudioResource(stream);
      player.play(resource);
    } catch (error) {
      console.error("Error playing song:", error);
      await this.playNext(guildId);
    }
  }

  pause(guildId) {
    const player = this.players.get(guildId);
    if (!player) {
      return { success: false, error: "No music is playing." };
    }

    player.pause();
    return { success: true };
  }

  resume(guildId) {
    const player = this.players.get(guildId);
    if (!player) {
      return { success: false, error: "No music is playing." };
    }

    player.unpause();
    return { success: true };
  }

  async skip(guildId) {
    const queue = this.queues.get(guildId);
    const player = this.players.get(guildId);

    if (!player) {
      return { success: false, error: "No music is playing." };
    }

    if (queue && queue.length > 0) {
      const nextSong = queue[0];
      player.stop();
      return { success: true, nextSong: nextSong.title };
    } else {
      player.stop();
      return { success: true, nextSong: null };
    }
  }

  async previous(guildId) {
    const history = this.history.get(guildId);
    const queue = this.queues.get(guildId);
    const currentSong = this.currentSongs.get(guildId);

    if (!history || history.length < 2) {
      return { success: false, error: "No previous song available." };
    }

    history.pop();
    const previousSong = history.pop();

    if (currentSong) {
      queue.unshift(currentSong);
    }
    queue.unshift(previousSong);

    const player = this.players.get(guildId);
    if (player) {
      player.stop();
    }

    return { success: true, song: previousSong.title };
  }

  stop(guildId) {
    const player = this.players.get(guildId);
    if (!player) {
      return { success: false, error: "No music is playing." };
    }

    const queue = this.queues.get(guildId);
    if (queue) {
      queue.length = 0;
    }

    player.stop();
    this.cleanup(guildId);
    return { success: true };
  }

  getQueue(guildId) {
    return this.queues.get(guildId) || [];
  }

  async search(query, source = "youtube") {
    try {
      if (source === "spotify") {
        return await this.searchSpotify(query);
      } else {
        return await this.searchYouTube(query);
      }
    } catch (error) {
      console.error("Search error:", error);
      return [];
    }
  }

  async searchYouTube(query, limit = 5) {
    try {
      const results = await YoutubeSearchApi.GetListByKeyword(
        query,
        false,
        limit
      );
      return results.items.map((item) => ({
        title: item.title,
        url: `https://www.youtube.com/watch?v=${item.id}`,
        duration: item.length?.simpleText || "Unknown",
        thumbnail: item.thumbnail?.thumbnails?.[0]?.url,
        source: "YouTube",
        artist: this.extractArtistFromTitle(item.title),
        id: item.id,
      }));
    } catch (error) {
      console.error("YouTube search error:", error);
      return [];
    }
  }

  async searchYouTubeSingle(query) {
    try {
      const results = await YoutubeSearchApi.GetListByKeyword(query, false, 1);
      if (results.items.length === 0) return null;

      const item = results.items[0];
      return {
        title: item.title,
        url: `https://www.youtube.com/watch?v=${item.id}`,
        duration: item.length?.simpleText || "Unknown",
        thumbnail: item.thumbnail?.thumbnails?.[0]?.url,
        source: "YouTube",
        artist: this.extractArtistFromTitle(item.title),
        id: item.id,
      };
    } catch (error) {
      console.error("YouTube search error:", error);
      return null;
    }
  }

  async searchSpotify(query, limit = 5) {
    try {
      const results = await this.spotifyApi.searchTracks(query, { limit });
      return results.body.tracks.items.map((track) => ({
        title: track.name,
        url: track.external_urls.spotify,
        duration: this.formatDuration(track.duration_ms / 1000),
        thumbnail: track.album.images[0]?.url,
        source: "Spotify",
        artist: track.artists[0].name,
        id: track.id,
        album: track.album.name,
      }));
    } catch (error) {
      console.error("Spotify search error:", error);
      return [];
    }
  }

  async searchAll(query, limit = 3) {
    try {
      const [youtubeResults, spotifyResults] = await Promise.all([
        this.searchYouTube(query, limit),
        this.searchSpotify(query, limit),
      ]);

      return {
        youtube: youtubeResults,
        spotify: spotifyResults,
        total: youtubeResults.length + spotifyResults.length,
      };
    } catch (error) {
      console.error("Multi-source search error:", error);
      return { youtube: [], spotify: [], total: 0 };
    }
  }

  async playPlaylist(message, playlistName) {
    if (!this.playlists[playlistName]) {
      return {
        success: false,
        error: `Playlist "${playlistName}" not found. Available: ${Object.keys(
          this.playlists
        ).join(", ")}`,
      };
    }

    const guildId = message.guild.id;
    const voiceChannel = message.member.voice.channel;

    if (!voiceChannel) {
      return { success: false, error: "You need to be in a voice channel!" };
    }

    const songs = this.playlists[playlistName];
    let songsAdded = 0;

    for (const songQuery of songs) {
      try {
        const songInfo = await this.searchYouTubeSingle(songQuery);
        if (songInfo) {
          if (!this.queues.has(guildId)) {
            this.queues.set(guildId, []);
            this.history.set(guildId, []);
          }

          this.queues.get(guildId).push(songInfo);
          songsAdded++;
        }
      } catch (error) {
        console.error(`Error adding song "${songQuery}":`, error);
      }
    }

    if (songsAdded > 0) {
      if (!this.connections.has(guildId)) {
        await this.createConnection(voiceChannel, guildId);
      }

      if (!this.currentSongs.has(guildId)) {
        await this.playNext(guildId);
      }
    }

    return { success: true, songsAdded };
  }

  async playRadio(message, stationName) {
    const guildId = message.guild.id;
    const voiceChannel = message.member.voice.channel;

    if (!config.radioStations[stationName]) {
      return {
        success: false,
        error: `Radio station "${stationName}" not found. Available: ${Object.keys(
          config.radioStations
        ).join(", ")}`,
      };
    }

    try {
      if (!this.connections.has(guildId)) {
        await this.createConnection(voiceChannel, guildId);
      }

      const player = this.players.get(guildId);
      const radioUrl = config.radioStations[stationName];

      const resource = createAudioResource(radioUrl);
      player.play(resource);

      this.queues.set(guildId, []);
      this.currentSongs.set(guildId, {
        title: `${stationName.toUpperCase()} Radio`,
        url: radioUrl,
      });

      return { success: true };
    } catch (error) {
      console.error("Radio error:", error);
      return { success: false, error: "Failed to play radio station." };
    }
  }

  async getYouTubeInfo(url) {
    try {
      const info = await ytdl.getInfo(url);
      return {
        title: info.videoDetails.title,
        url: url,
        duration: this.formatDuration(info.videoDetails.lengthSeconds),
        thumbnail: info.videoDetails.thumbnails[0]?.url,
        source: "YouTube",
        artist: this.extractArtistFromTitle(info.videoDetails.title),
        id: info.videoDetails.videoId,
      };
    } catch (error) {
      console.error("YouTube info error:", error);
      return null;
    }
  }

  async getSpotifyTrack(url) {
    try {
      const trackId = this.extractSpotifyId(url);
      const track = await this.spotifyApi.getTrack(trackId);

      const searchQuery = `${track.body.artists[0].name} ${track.body.name}`;
      return await this.searchYouTubeSingle(searchQuery);
    } catch (error) {
      console.error("Spotify track error:", error);
      return null;
    }
  }

  isYouTubeUrl(url) {
    return url.includes("youtube.com") || url.includes("youtu.be");
  }

  isSpotifyUrl(url) {
    return url.includes("spotify.com");
  }

  extractSpotifyId(url) {
    const match = url.match(/track\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  cleanup(guildId) {
    this.queues.delete(guildId);
    this.players.delete(guildId);
    this.connections.delete(guildId);
    this.currentSongs.delete(guildId);
    this.history.delete(guildId);
  }

  extractArtistFromTitle(title) {
    // Try to extract artist from YouTube title (format: "Artist - Song")
    const match = title.match(/^([^-]+)\s*-\s*(.+)$/);
    return match ? match[1].trim() : "Unknown Artist";
  }
}

module.exports = MusicService;
