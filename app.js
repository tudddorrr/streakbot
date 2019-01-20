require('dotenv').config()
const Discord = require('discord.js')
const client = new Discord.Client()
const db = require('./db')
const schedule = require('node-schedule')
const startOfTomorrow = require('date-fns/start_of_tomorrow')
const differenceInHours = require('date-fns/difference_in_hours')

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`)

  schedule.scheduleJob('00 00 * * *', () => {
    broadcastNewDay()
  })

  schedule.scheduleJob('00 18 * * *', () => {
    broadcastWarning(6, 'https://media.giphy.com/media/3ornjXizVZDbngmjRK/giphy.gif')
  })

  schedule.scheduleJob('00 22 * * *', () => {
    broadcastWarning(2, 'https://media.giphy.com/media/xUOxeXt41UOYRusw4E/giphy.gif')
  })
})

client.on('error', error => {
  console.log(error)
})

client.on('message', msg => {
  if (msg.content.startsWith('!streak')) {
    // streak
    if(isValidStreakMessage(msg)) {
      db.addStreak(msg)

      let streak = db.getStreakForChannel(msg.author.id, msg.channel.name)
      if(!streak) streak = 1
      msg.reply(`nice one! Your ${msg.channel.name} streak is now ${streak} ${streak === 1 ? 'day' : 'days'}!`)
      msg.react('🔥')
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
  }
})

client.on('guildMemberAdd', member => {
  console.log(`${member.user.username} joined the server!`)
  member.user.send('Hey welcome to DevStreak!\n' +
    'DevStreak is all about keeping up a daily routine and working on something, however minor, for your current project\n' + 
    'In order to start or continue a streak, simply send a message starting with !streak in a specific channel along with a description of what you did\nYou can also type !help if you ever forget any commands')
})

client.login(process.env.BOT_SECRET)

broadcastNewDay = () => {
  console.log(`It's a new day!`)

  const channel = client.channels.find(c => c.name === "announcements")
  channel.send('Today is a brand new day! Make sure to keep up all your active streaks!', {
     files: [{
        attachment: 'https://media.giphy.com/media/1z63Y5OuNMT1m/giphy.gif',
        name: 'giphy.gif'
     }]
  })

  db.checkStreaks(client.users)

  setTimeout(() => {
    messageTopStreaks()
  }, 5000)
}

broadcastWarning = (hoursRemaining, gif) => {
  console.log(`Broadcasting ${hoursRemaining} hours remaining`)
  const channel = client.channels.find(c => c.name === "announcements")
  channel.send(`Only ${hoursRemaining} hours to go until the day ends. Make sure to continue your streaks!`, {
     files: [{
        attachment: gif,
        name: 'giphy.gif'
     }]
  })
}

isValidStreakMessage = msg => {
  if(!db.isValidChannel(msg.channel.name)) {
    msg.reply('you can\'t make any progress in this channel!')
    return false
  }

  if(db.hasStreakedToday(msg.author.id, msg.channel.name)) {
    msg.reply('you\'ve already made progress in this streak today!')
    return false
  }

  if(msg.content.length < '!streak'.length + 20) {
    msg.reply('you need to be more descriptive about this progress for it to count')
    return false
  }

  return true
}

messageTopStreaks = () => {
  const highscores = db.getTopStreaks()
  if(highscores.length === 0) return

  const channel = client.channels.find(c => c.name === 'announcements')
  channel.send('🏆 Here are the current highest streaks:')

  let topStreaks = []

  highscores.forEach(highscore => {
    const user = client.users.find(u => u.id === highscore.userID)
    topStreaks.push(`Top streak in *${highscore.channelName}* is ${user} with ${highscore.streakLevel} ${highscore.streakLevel === 1 ? 'day' : 'days'}!`)
  })

  channel.send(topStreaks.join('\n'))
}

messageCurrentStreakForChannel = msg => {
  const streak = db.getStreakForChannel(msg.author.id, msg.channel.name)
  if(!streak) {
    msg.reply(`you currently don't have a streak running for this channel`)
  } else {
    const hasStreakedToday = db.hasStreakedToday(msg.author.id, msg.channel.name)
    let postedString = 'but you haven\'t increased your streak yet today 😟'
    if(hasStreakedToday) postedString = 'and you\'ve increased your streak today 👍'
    msg.reply(`your ${msg.channel.name} streak is currently ${streak} ${streak === 1 ? 'day' : 'days'} ${postedString}\nKeep it up 💪`)
  }
}

messageAllMyStreaks = msg => {
  console.log(`${msg.author.username} requested their streaks via DM`)
  const streaks = db.getMyStreaks(msg.author.id)
  streaks.forEach(streak => {
    const hasStreakedToday = db.hasStreakedToday(msg.author.id, streak.channelName)
    let postedString = 'but you haven\'t increased your streak yet today 😟'
    if(hasStreakedToday) postedString = 'and you\'ve increased your streak today 👍'
    msg.reply(`Your ${streak.channelName} streak is currently ${streak.streakLevel} ${streak.streakLevel === 1 ? 'day' : 'days'} ${postedString}`)
  })

  if(streaks.length > 0) {
    msg.reply('Keep it up 💪')
  } else {
    msg.reply('You currently have no active streaks. Use !streak in a channel to start one 🔥')
  }
}

messageTimeLeft = msg => {
  const diff = differenceInHours(startOfTomorrow(), new Date())
  if(diff === 1) {
    msg.reply(`there is under an hour left to continue a streak ⏳`)
  } else {
    msg.reply(`there are ${diff} hours left to continue a streak ⏰`)
  }
}

messageStats = msg => {
  const users = db.getStatCount('users')
  const streaks = db.getStatCount('streaks')
  msg.reply(`so far ${users} users have used DevStreak and there have been ${streaks} streak updates`)
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
    '*!toggledm* - toggle direct messages for when your streak ends')
}

messageAllStreaksForChannel = channel => {
  if(!db.isValidChannel(channel.name)) {
    channel.send('You can\'t make any progress in this channel!')
    return
  }

  let streaks = db.getAllStreaksForChannel(channel.name)
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

  channel.send(`Here are all the active streaks in ${channel.name}:\n` + 
    streaks.map(streak => {
      const user = client.users.find(u => u.id === streak.userID).username
      return `*${user}* with ${streak.streakLevel} ${streak.streakLevel === 1 ? 'day' : 'days'}`
    }).join('\n'))
}