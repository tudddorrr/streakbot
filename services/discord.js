const db = require('../db')
const giphy = require('./giphy')
const constants = require('../constants')
let client = null

exports.init = discordClient => {
  client = discordClient
}

assignTopStreakRoles = () => {
  const highscores = db.getTopStreaks()
  if(highscores.length === 0) return

  // assign/remove top streak role
  client.guilds.get(constants.DevStreakGuildID).members.forEach(user => {
    user.removeRole(constants.TopStreakerRoleID).then(() => {
      if(db.userHasHighscore(user.id)) {
        user.addRole(constants.TopStreakerRoleID, 'Has a top streak at the end of the day')
      }
    })
  })
}

exports.broadcastNewDay = () => {
  console.log(`It's a new day!`)
  const channel = client.channels.find(c => c.name === "announcements")

  giphy.getMedia('morning', media => {
    channel.send('Today is a brand new day! Make sure to keep up all your active streaks!', {
       files: [{
          attachment: media,
          name: 'giphy.gif'
       }]
    })
  
    const guild = client.guilds.get(constants.DevStreakGuildID)
    db.checkStreaks(client.users)

    for(let user of db.getUsers()) {
      if(db.getUserActiveStreaks(user.userID).length === 0) {
        const guildMember = guild.members.find(u => u.id === user.userID)
        if(guildMember) guildMember.removeRole(constants.ActiveStreakerRoleID, 'No active streaks')
      }
    }
  
    setTimeout(() => {
      broadcastTopStreaks()
      broadcastAllActiveStreaks()
      assignTopStreakRoles()
    }, 5000)
  })
}

exports.broadcastWarning = hoursRemaining => {
  console.log(`Broadcasting ${hoursRemaining} hours remaining`)
  const channel = client.channels.find(c => c.name === "announcements")

  giphy.getMedia('countdown', media => {
    channel.send(`Only ${hoursRemaining} hours to go until the day ends. Make sure to continue your streaks!`, {
      files: [{
          attachment: media,
          name: 'giphy.gif'
      }]
    })
  })
}

broadcastTopStreaks = () => {
  const highscores = db.getTopStreaks()
  if(highscores.length === 0) return

  const channel = client.channels.find(c => c.name === 'announcements')
  channel.send('🏆 Here are the current highest streaks:')

  let topStreaks = []

  for(let highscore of highscores) {
    let user = client.users.find(u => u.id === highscore.userID)
    if(!db.getMentionSettingForUser(highscore.userID)) user = user.username
    topStreaks.push(`Top streak in *${highscore.channelName}* is ${user} with ${highscore.streakLevel} ${highscore.streakLevel === 1 ? 'day' : 'days'}!`)
  }

  channel.send(topStreaks.join('\n') + '\nTip: you can turn off mentions using !togglementions')
}

broadcastAllActiveStreaks = () => {
  const channel = client.channels.find(c => c.name === "announcements")
  channel.send(`🔥 Here are all the active streaks:\n` + exports.buildActiveStreaksMessage())
}

exports.buildActiveStreaksMessage = () => {
  const streaks = db.getActiveStreaks()
  if(streaks.length === 0) return
  
  return streaks.map(channelStreaks => {
    let sortedChannelStreaks = channelStreaks.sort((a, b) => {
      if(a.streakLevel === b.streakLevel) {
        const userA = client.users.find(u => u.id === a.userID).username
        const userB = client.users.find(u => u.id === b.userID).username
        return userA.localeCompare(userB)
      }
      return b.streakLevel - a.streakLevel
    })

    let userStreaks = []
    for(let channelStreak of sortedChannelStreaks) {
      const user = client.users.find(u => u.id === channelStreak.userID).username
      userStreaks.push(`*${user}* with ${channelStreak.streakLevel} ${channelStreak.streakLevel === 1 ? 'day' : 'days'} in ${channelStreak.channelName}`)
    }
    return userStreaks.join(', ')
  }).join('\n')
}

exports.assignActiveStreakRole = userID => {
  const user = client.guilds.get(constants.DevStreakGuildID).members.find(u => u.id === userID)
  user.addRole(constants.ActiveStreakerRoleID, 'Has a top streak at the end of the day')
}

exports.getUsername = userID => {
  const user = client.users.find(u => u.id === userID)
  if(user) return user.username
  return null
}

exports.findMessage = async (channelName, messageID) => {
  console.log(channelName, messageID)
  for (let channel of client.guilds.get(constants.DevStreakGuildID).channels.array()) {
    if(channel.name === channelName) {
      const message = await channel.fetchMessage(messageID)
      return {
        messageID,
        content: message.content,
        attachments: message.attachments.array().map(attachment => {
          return attachment.url
        })
      }
    }
  }
}