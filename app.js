require('dotenv').config()
const Discord = require('discord.js')
const client = new Discord.Client()
const db = require('./db')
const schedule = require('node-schedule')
const startOfTomorrow = require('date-fns/start_of_tomorrow')
const differenceInHours = require('date-fns/difference_in_hours')
const bot = require('./services/discord')
const roles = require('./services/roles')
const channels = require('./services/channels')

bot.init(client)

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`)

  // start the rest server
  require('./services/server')

  schedule.scheduleJob('00 00 00 * * *', () => {
    bot.broadcastNewDay()
  })

  schedule.scheduleJob('00 00 18 * * *', () => {
    bot.broadcastWarning(6)
  })

  schedule.scheduleJob('00 00 22 * * *', () => {
    bot.broadcastWarning(2)
  })
})

client.on('error', error => {
  console.log(error)
})

client.on('message', msg => {
  if (msg.content.startsWith('!streak')) {
    // streak
    if(msg.channel.name) {
      handleStreak(msg)
    } else {
      msg.reply('You can\'t start a streak here, it has to be in a channel!')
    }
  } else if(msg.content.startsWith('!mystreak')) {
    // checking streak
    if(msg.channel.name) {
      messageCurrentStreakForChannel(msg)
    } else {
      messageAllMyStreaks(msg)
    }
  } else if(msg.content.toLowerCase() === '!help') {
    // help
    messageHelp(msg)
  } else if(msg.content.toLowerCase() === 'good bot') {
    // good bot
    msg.reply('thanks 💯')
  } else if(msg.content.toLowerCase() === 'bad bot') {
    // bad bot
    msg.reply('sorry 😢')
  } else if(msg.content.toLowerCase() === '!timeleft') {
    // time left
    messageTimeLeft(msg)
  } else if(msg.content.toLowerCase() === '!stats') {
    // stats
    messageStats(msg)
  } else if(msg.content.toLowerCase() === '!toggledm') {
    // toggle notifications
    db.toggleDMs(msg)
  } else if(msg.content.toLowerCase() === '!showstreaks') {
    // message all streaks in a channel
    messageAllStreaksForChannel(msg.channel)
  } else if(msg.content.toLowerCase() === '!togglementions') {
     // toggle notifications
     db.toggleMentions(msg)
  } else if(msg.content.toLowerCase() === '!showactivestreaks') {
    // message all active streaks
    messageAllActiveStreaks(msg)
  } else if (msg.content.startsWith('!setrole')) {
    // set the roles for active and top streaker
    roles.handleRoles(msg) 
  } else if (msg.content.startsWith('!setchannels')) {
    // set channels that users can build streaks in
    channels.handleChannels(msg)
  }
})

client.on('guildMemberAdd', member => {
  console.log(`${member.user.username} joined the server!`)
  member.user.send('Hey welcome to DevStreak!\n' +
    'DevStreak is all about keeping up a daily routine and working on something, however minor, for your current project\n' + 
    'In order to start or continue a streak, simply send a message starting with !streak in a specific channel along with a description of what you did\nYou can also type !help if you ever forget any commands')
})

client.login(process.env.BOT_SECRET)

handleStreak = msg => {
  if(isValidStreakMessage(msg)) {
    db.addStreak(msg)

    const streak = db.getUserStreakForChannel(msg.author.id, msg.guild.id, msg.channel.name)
    bot.assignActiveStreakRole(msg.guild, msg.author.id)
    msg.reply(`nice one! Your ${msg.channel.name} streak is now ${streak} ${streak === 1 ? 'day' : 'days'}!`)
    msg.react('🔥')
  }
}

isValidStreakMessage = msg => {
  if(!db.isValidChannel(msg.guild.id, msg.channel.name)) {
    msg.reply('you can\'t make any progress in this channel!')
    return false
  }

  if(db.hasStreakedToday(msg.guild.id, msg.author.id, msg.channel.name)) {
    msg.reply('you\'ve already made progress in this streak today!')
    return false
  }

  if(msg.content.length < '!streak'.length + 20) {
    msg.reply('you need to be more descriptive about this progress for it to count')
    return false
  }

  return true
}

messageCurrentStreakForChannel = msg => {
  const streak = db.getUserStreakForChannel(msg.author.id, msg.guild.id, msg.channel.name)
  if(!streak) {
    msg.reply(`you currently don't have a streak running for this channel`)
  } else {
    const hasStreakedToday = db.hasStreakedToday(msg.guild.id, msg.author.id, msg.channel.name)
    let postedString = 'but you haven\'t increased your streak yet today 😟'
    if(hasStreakedToday) postedString = 'and you\'ve increased your streak today 👍'
    msg.reply(`your ${msg.channel.name} streak is currently ${streak} ${streak === 1 ? 'day' : 'days'} ${postedString}\nKeep it up 💪`)
  }
}

messageAllMyStreaks = msg => {
  console.log(`${msg.author.username} requested their streaks via DM`)
  const streaks = db.getUserActiveStreaks(msg.author.id)
  for(let streak of streaks) {
    const hasStreakedToday = db.hasStreakedToday(null, msg.author.id, streak.channelName)
    let postedString = 'but you haven\'t increased your streak yet today 😟'
    if(hasStreakedToday) postedString = 'and you\'ve increased your streak today 👍'
    msg.reply(`Your ${streak.channelName} streak is currently ${streak.streakLevel} ${streak.streakLevel === 1 ? 'day' : 'days'} ${postedString}`)
  }

  if(streaks.length > 0) {
    msg.reply('Keep it up 💪')
  } else {
    msg.reply('You currently have no active streaks. Use !streak in a channel to start one 🔥')
  }
}

messageTimeLeft = msg => {
  const diff = differenceInHours(startOfTomorrow(), new Date())
  if(diff <= 1) {
    msg.reply(`there is under an hour left to continue a streak ⏳`)
  } else {
    msg.reply(`there are ${diff} hours left to continue a streak ⏰`)
  }
}

messageStats = msg => {
  if(!msg.guild) {
    msg.reply(`You can't do that here, you can only run that command in a server.`)
    return
  }

  const users = db.getStatCount('users')
  const streaks = db.getStatCount('streaks')

  const highscores = db.getTopAllTimeStreaks(msg.guild.id)
  let topStreaks = []

  for(let highscore of highscores) {
    const user = client.users.find(u => u.id === highscore.userID)
    if(user) {
      topStreaks.push(`Top streak in *${highscore.channelName}* is **${user.username}** with ${highscore.streakLevel} ${highscore.streakLevel === 1 ? 'day' : 'days'}!`)
    }
  }

  const firstStreakDate = db.getFirstStreakDate(msg.guild.id)

  msg.reply(`so far ${users} users have used DevStreak and there have been ${streaks} streak updates dating back to ${firstStreakDate} \n` +
    `👑 Here are the best streaks of all time:\n` +
    `${topStreaks.join('\n')}`
  )
}

messageHelp = msg => {
  msg.reply('here\'s a list of commands you can use: \n' +
    '**Streaks**\n' + 
    '*!streak* - start or continue a streak in this channel. You need to supply a small description of the work in your message for it to count\n' + 
    '*!mystreak* - show your current streak for this channel. Tip: sending this command via DM will show all your streaks\n' + 
    '*!showstreaks* - show all streaks for this channel\n' +
    '**Global**\n' +
    '*!timeleft* - show how long is left until the streak cut-off time\n' + 
    '*!stats* - show a few useful stats\n' +
    '*!toggledm* - toggle direct messages for when your streak ends\n' + 
    '*!togglementions* - toggle the bot mentioning you in announcements\n' +
    '*!showactivestreaks* - show all active streaks for all channels\n' +
    '**Admin**\n' +
    '*!setrole* - set which role is the active streaks role or the top streaker role\n' +
    '*!setchannels* - set which channels streaks can be built up in')
}

messageAllStreaksForChannel = channel => {
  if(!channel.guild) {
    channel.send(`You can't do that here, you can only run that command in a channel.`)
    return
  }

  if(!db.isValidChannel(channel.guild.id, channel.name)) {
    channel.send('You can\'t make any progress in this channel!')
    return
  }

  let streaks = db.getActiveStreaksForChannel(channel.guild.id, channel.name)
  if(streaks.length === 0) {
    channel.send('There are currently no streaks in this channel 😞. Why not change that?')
    return
  }

  streaks = streaks.sort((a, b) => {
    if(a.streakLevel === b.streakLevel) {
      const userA = client.users.find(u => u.id === a.userID).username
      const userB = client.users.find(u => u.id === b.userID).username
      return userA.localeCompare(userB)
    }
    return b.streakLevel - a.streakLevel
  })

  channel.send(`Here are all the active streaks in *${channel.name}*:\n` + 
    streaks.map(streak => {
      const user = client.users.find(u => u.id === streak.userID).username
      return `**${user}** with ${streak.streakLevel} ${streak.streakLevel === 1 ? 'day' : 'days'}`
    }).join('\n'))
}

messageAllActiveStreaks = msg => {
  if(!msg.guild) {
    msg.reply(`You can't do that here, you can only run that command in a server.`)
    return
  }
  msg.reply(`here are all the active streaks:\n` + bot.buildActiveStreaksMessage(msg.guild.id))
}
