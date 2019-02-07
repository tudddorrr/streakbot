# Streakbot
A bot for DevStreak to track and manage streaks. Built with discord.js.

## Setup & testing
Giving out the bot's login secret is dangerous so you'll need to make your own bot and add it to your own server to test it.

1. Follow [this guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html) on how to setup your own bot
2. Create a file called ".env" and make the contents `BOT_SECRET=yourbotsecret`
3. Run `npm install -g nodemon` (nodemon auto restarts the app if you make any changes)
4. Run `npm start` to start testing
5. If you want to play with gifs you need to get a [Giphy API key](https://developers.giphy.com) and add `GIPHY_KEY=yourgiphykey` to the .env file

Follow [this guide](https://discordjs.guide/preparations/adding-your-bot-to-servers.html#bot-invite-links) to learn how to add a bot to your own server.