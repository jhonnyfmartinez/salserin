# 🎵 Salserín - Discord Music Bot

A feature-rich Discord music bot specialized in Colombian music with Spotify and YouTube integration. Stream your favorite salsa tracks, or tune into popular Colombian radio stations directly in your Discord server.

## ✨ Features

- 🎶 **Multi-platform Support**: Play music from YouTube and Spotify
- 📻 **Colombian Radio**: Stream live Colombian radio stations
- 🎵 **Curated Playlists**: Built-in playlists for salsa
- 📋 **Queue Management**: Add, skip, pause, resume, and manage your music queue
- 🔍 **Smart Search**: Search for songs across platforms
- 📊 **History Tracking**: Navigate through previously played songs
- 🎯 **Multi-server Support**: Independent queues and settings per Discord server

## 🎮 Available Commands

| Command            | Description                         | Example                 |
| ------------------ | ----------------------------------- | ----------------------- |
| `!help`            | Show all available commands         | `!help`                 |
| `!play <song>`     | Play a song from YouTube or Spotify | `!play sin sentimiento` |
| `!pause`           | Pause current song                  | `!pause`                |
| `!resume`          | Resume playback                     | `!resume`               |
| `!skip`            | Skip to next song                   | `!skip`                 |
| `!previous`        | Go to previous song                 | `!previous`             |
| `!stop`            | Stop playback and clear queue       | `!stop`                 |
| `!queue`           | Show current queue                  | `!queue`                |
| `!search <query>`  | Search for songs                    | `!search roberto roena` |
| `!playlist <name>` | Play a predefined playlist          | `!playlist salsa`       |
| `!radio <station>` | Play Colombian radio stations       | `!radio el sol`         |

### 📻 Available Radio Stations

- `el sol` - El Sol

### 🎵 Available Playlists

- `salsa` - Salsa hits

## 🚀 Setup & Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Discord Bot Token](https://discord.com/developers/applications)
- [Spotify API Credentials](https://developer.spotify.com/dashboard)
- [FFmpeg](https://ffmpeg.org/) (for audio processing)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd salserin
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
DISCORD_TOKEN=your_discord_bot_token_here
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
```

### 4. Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "Bot" section
4. Create a bot and copy the token to your `.env` file
5. Enable the following bot permissions:
   - Send Messages
   - Use Slash Commands
   - Connect to Voice Channels
   - Speak in Voice Channels
   - Use Voice Activity

### 5. Spotify API Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Copy the Client ID and Client Secret to your `.env` file

### 6. Install FFmpeg

#### Windows:

```bash
# Using chocolatey
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
```

#### macOS:

```bash
# Using homebrew
brew install ffmpeg
```

#### Ubuntu/Debian:

```bash
sudo apt update
sudo apt install ffmpeg
```

## 🏃‍♂️ Running the Bot

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

## 🧪 Testing

### Manual Testing Checklist

1. **Bot Connection**

   - Verify bot comes online with "✅ [BotName] is online!" message
   - Check bot appears in server member list

2. **Basic Commands**

   - Test `!help` command for command list
   - Test `!play` with YouTube URL
   - Test `!play` with Spotify URL
   - Test `!play` with search query

3. **Queue Management**

   - Add multiple songs and test `!queue`
   - Test `!skip`, `!previous`, `!pause`, `!resume`
   - Test `!stop` to clear queue

4. **Advanced Features**

   - Test `!search` functionality
   - Test `!playlist` with each available playlist
   - Test `!radio` with each radio station

5. **Voice Channel Integration**
   - Verify bot joins voice channel when playing
   - Test bot behavior when user leaves voice channel
   - Test multiple servers simultaneously

### Error Testing

- Test commands without being in voice channel
- Test invalid song searches
- Test invalid playlist/radio station names
- Test network connectivity issues

## 🚀 Deployment

### Option 1: VPS/Cloud Server

1. **Set up server** (Ubuntu/Debian recommended)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install FFmpeg
sudo apt install ffmpeg
```

2. **Deploy application**

```bash
# Clone repository
git clone <repository-url>
cd salserin

# Install dependencies
npm install --production

# Set up environment variables
nano .env
# Add your tokens and credentials

# Test the bot
npm start
```

3. **Set up process manager (PM2)**

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start bot with PM2
pm2 start index.js --name "salserin-bot"

# Enable auto-start on boot
pm2 startup
pm2 save
```

4. **Set up reverse proxy (optional)**

```bash
# Install nginx
sudo apt install nginx

# Configure nginx for monitoring/webhooks if needed
```

### Option 2: Heroku

1. **Create Heroku app**

```bash
# Install Heroku CLI
# Create new app
heroku create your-bot-name

# Set environment variables
heroku config:set DISCORD_TOKEN=your_token_here
heroku config:set SPOTIFY_CLIENT_ID=your_client_id_here
heroku config:set SPOTIFY_CLIENT_SECRET=your_client_secret_here
```

2. **Configure Procfile**

```bash
echo "worker: node index.js" > Procfile
```

3. **Deploy**

```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main

# Scale worker dyno
heroku ps:scale worker=1
```

### Option 3: Docker

1. **Create Dockerfile**

```dockerfile
FROM node:18-alpine

# Install FFmpeg
RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
```

2. **Build and run**

```bash
# Build image
docker build -t salserin-bot .

# Run container
docker run -d --name salserin-bot \
  -e DISCORD_TOKEN=your_token_here \
  -e SPOTIFY_CLIENT_ID=your_client_id_here \
  -e SPOTIFY_CLIENT_SECRET=your_client_secret_here \
  salserin-bot
```

## 🔧 Configuration

### Custom Configuration (config.js)

```javascript
module.exports = {
  prefix: "!", // Change command prefix
  radioStations: {
    // Add more radio stations
    custom: "https://stream-url-here",
  },
};
```

### Adding Custom Playlists

Edit `services/MusicService.js` to add new playlists:

```javascript
this.playlists = {
  // ... existing playlists
  cumbia: ["Los Palmeras - La Suavecita", "Celso Piña - Cumbia Sobre el Río"],
};
```

## 📊 Monitoring & Logs

### PM2 Monitoring

```bash
# View logs
pm2 logs salserin-bot

# Monitor performance
pm2 monit

# Restart bot
pm2 restart salserin-bot
```

### Heroku Monitoring

```bash
# View logs
heroku logs --tail

# Check dyno status
heroku ps
```

## 🛠️ Troubleshooting

### Common Issues

1. **Bot doesn't respond to commands**

   - Check bot permissions in Discord server
   - Verify bot token is correct
   - Ensure bot has "Message Content Intent" enabled

2. **Audio playback issues**

   - Verify FFmpeg is installed correctly
   - Check voice channel permissions
   - Test with different audio sources

3. **Spotify integration not working**

   - Verify Spotify API credentials
   - Check API rate limits
   - Ensure bot has internet connectivity

4. **Radio stations not playing**
   - Test radio URLs directly in browser
   - Check for stream URL changes
   - Verify codec compatibility

### Debug Mode

Enable debug logging by modifying the bot:

```javascript
// Add to index.js
if (process.env.NODE_ENV === "development") {
  client.on("debug", console.log);
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Roadmap

- [ ] Web dashboard for bot management
- [ ] Custom playlist creation via commands
- [ ] Integration with more streaming platforms
- [ ] Advanced audio effects and filters
- [ ] Multi-language support
- [ ] Statistics and usage tracking

## 🙏 Acknowledgments

- Built with [Discord.js](https://discord.js.org/)
- Audio streaming powered by [ytdl-core](https://github.com/fent/node-ytdl-core)
- Spotify integration via [spotify-web-api-node](https://github.com/thelinmichael/spotify-web-api-node)
- Colombian music culture and community

---

Made with ❤️ for Colombian music lovers 🇨🇴
