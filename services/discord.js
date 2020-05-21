const db = require('../db')
const giphy = require('./giphy')
let client = null

exports.init = discordClient => {
  client = discordClient
}

assignTopStreakRoles = () => {
  // assign/remove top streak role
  client.guilds.forEach(guild => {
    if (guild && guild.available) {
      guild.members.forEach(user => {
        const roleid = db.getRole(guild.id, 'top')
        if (!roleid) { return }
        if(db.userHasHighscore(guild.id, user.id)) {
          user.addRole(roleid, 'Has a top streak at the end of the day')
        } else {
          user.removeRole(roleid, 'No longer has a top streak')
        }
      })  
    }
  })
}

removeActiveStreakRoles = () => {
  client.guilds.forEach(guild => {
    if (guild && guild.available) {
      db.checkStreaks(client.users)
  
      for(let user of db.getUsers()) {
        if(db.getUserActiveStreaks(user.userID).filter(streak => streak.guildID === guild.id).length === 0) {
          const guildMember = guild.members.find(u => u.id === user.userID)
          const role = db.getRole(guild.id, 'active')
          if(role && guildMember) {
            guildMember.removeRole(role, 'No active streaks')
          }
        }
      }
    }  
  })
}

exports.broadcastNewDay = async () => {
  const channel = client.channels.find(c => c.name === 'announcements')

  if(db.getActiveStreaks(channel.guild.id).length > 0) {
    console.log(`It's a new day!`)

    const media = await giphy.getMedia('morning')
    channel.send('Today is a brand new day! Make sure to keep up all your active streaks!', {
       files: media ? [{
        attachment: media,
        name: 'giphy.gif'
       }] : null
    })
  }

  removeActiveStreakRoles()

  setTimeout(() => {
    broadcastTopStreaks()
    broadcastAllActiveStreaks()
    assignTopStreakRoles()
  }, 5000)
}

exports.broadcastWarning = async hoursRemaining => {
  const channel = client.channels.find(c => c.name === 'announcements')
  const media = await giphy.getMedia('countdown')

  if(db.getActiveStreaks(channel.guild.id).length > 0) {
    console.log(`Broadcasting ${hoursRemaining} hours remaining`)

    channel.send(`Only ${hoursRemaining} hours to go until the day ends. Make sure to continue your streaks!`, {
      files: media ? [{
        attachment: media,
        name: 'giphy.gif'
      }] : null
    })
  }

  // send the users a warning
  client.guilds.forEach(guild => {
    if (guild && guild.available) {
      guild.members.forEach(user => {
        if(db.getDMSettingForUser(user.id) && db.getUserActiveStreaks(user.id).length > 0 && !db.hasUpdatedStreakToday(guild.id, user.id)) {
          user.send(`Only ${hoursRemaining} hours to go until the day ends. Make sure to continue your streak(s)! You can disable these messages using the command \`!toggledm\`.`, {
            files: media ? [{
              attachment: media,
              name: 'giphy.gif'
            }] : null
          })
        }
      })  
    }
  })
}

broadcastTopStreaks = () => {
  client.guilds.forEach(guild => {
    const highscores = db.getTopStreaks(guild.id)
    if(highscores.length === 0) return
  
    const channel = client.channels.find(c => c.name === 'announcements')
    channel.send('🏆 Here are the current highest streaks:')
  
    let topStreaks = []
  
    for(let highscore of highscores) {
      let user = client.users.find(u => u.id === highscore.userID)
      if(!db.getMentionSettingForUser(highscore.userID)) user = `**${user.username}**`
      topStreaks.push(`${user} for *${highscore.topic}* with ${highscore.streakLevel} ${highscore.streakLevel === 1 ? 'day' : 'days'}!`)
    }
  
    channel.send(topStreaks.join('\n'))  
  })
}

broadcastAllActiveStreaks = () => {
  client.guilds.forEach(guild => {
    const channel = guild.channels.find(c => c.name === "announcements")
    if (channel && exports.buildActiveStreaksMessage(guild.id)) {
      channel.send(`🔥 Here are all the active streaks:\n` + exports.buildActiveStreaksMessage(guild.id) + '\n\nTip: you can turn off mentions using `!togglementions`')  
    }
  })
}

exports.buildActiveStreaksMessage = guildID => {
  const streaks = db.getActiveStreaks(guildID)
  if(streaks.length === 0) return

  let userStreaks = {}
  
  streaks.sort((a, b) => {
    if(a.streakLevel === b.streakLevel) {
      const userA = client.users.find(u => u.id === a.userID).username
      const userB = client.users.find(u => u.id === b.userID).username
      return userA.localeCompare(userB)
    }
    return b.streakLevel - a.streakLevel
  }).forEach(streak => {
    const user = client.users.find(u => u.id === streak.userID).username
    if(!userStreaks[streak.userID]) {
      userStreaks[streak.userID] = [`**${user}** with ${streak.streakLevel} ${streak.streakLevel === 1 ? 'day' : 'days'} for *${streak.topic}*`]
    } else {
      userStreaks[streak.userID].push(`${streak.streakLevel} ${streak.streakLevel === 1 ? 'day' : 'days'} for *${streak.topic}*`)
    }
  })

  return Object.keys(userStreaks).map(userStreak => {
    return userStreaks[userStreak].join(", ")
  }).join('\n')
}

exports.assignActiveStreakRole = (guild, userID) => {
  if (guild && guild.available) {
    const user = guild.members.find(u => u.id === userID)
    const role = db.getRole(guild.id, 'active')
    if (role) {
      user.addRole(role, 'Has an active streak')
    }
  }  
}

exports.getUsername = userID => {
  const user = client.users.find(u => u.id === userID)
  if(user) return user.username
  return null
}

exports.findMessage = async (guildID, channelName, messageID) => {
  for (let channel of client.guilds.get(guildID).channels.array()) {
    if(channel.name === channelName) {
      const message = await channel.fetchMessage(messageID).catch(error => {
        console.log(`Couldn't find message ID ${messageID}`)
        return null
      })
      if(!message) return null

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
