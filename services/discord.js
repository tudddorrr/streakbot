const db = require('../db')
const giphy = require('./giphy')
let client = null

exports.init = discordClient => {
  client = discordClient
}

const assignTopStreakRoles = () => {
  // assign/remove top streak role
  client.guilds.cache.forEach(guild => {
    if (guild && guild.available) {
      guild.members.cache.forEach(guildMember => {
        const roleid = db.getRole(guild.id, 'top')
        if (!roleid) return
        if(db.userHasHighscore(guild.id, guildMember.id)) {
          guildMember.roles.add(roleid, 'Has a top streak at the end of the day')
        } else {
          guildMember.roles.remove(roleid, 'No longer has a top streak')
        }
      })  
    }
  })
}

const removeActiveStreakRoles = () => {
  client.guilds.cache.forEach(guild => {
    if (guild && guild.available) {
      db.checkStreaks(client.users.cache)
  
      for(let user of db.getUsers()) {
        if(db.getUserActiveStreaks(user.userID).filter(streak => streak.guildID === guild.id).length === 0) {
          const guildMember = guild.members.cache.find(u => u.id === user.userID)
          const role = db.getRole(guild.id, 'active')
          if(role && guildMember) {
            guildMember.roles.remove(role, 'No active streaks')
          }
        }
      }
    }  
  })
}

exports.broadcastNewDay = async () => {
  const channel = client.channels.cache.find(c => c.name === 'announcements')

  if(db.getActiveStreaks(channel.guild.id).length > 0) {
    console.log(`It's a new day!`)

    const media = await giphy.getMedia('morning')
    try {
      channel.send('Today is a brand new day! Make sure to keep up all your active streaks!', {
        files: media ? [{
         attachment: media,
         name: 'giphy.gif'
        }] : null
     })
    } catch (err) {
      console.log(err)
    }
  }

  removeActiveStreakRoles()

  setTimeout(() => {
    broadcastTopStreaks()
    broadcastAllActiveStreaks()
    assignTopStreakRoles()
  }, 5000)
}

exports.broadcastWarning = async hoursRemaining => {
  const channel = client.channels.cache.find(c => c.name === 'announcements')
  let media = null

  try {
    media = await giphy.getMedia('countdown')
  } catch (err) {
    console.log(err)
  }


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
  client.guilds.cache.forEach(guild => {
    if (guild && guild.available) {
      guild.members.cache.forEach(user => {
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

const broadcastTopStreaks = () => {
  client.guilds.cache.forEach(async guild => {
    const highscores = db.getTopStreaks(guild.id)
    if(highscores.length === 0) return
  
    const channel = client.channels.cache.find(c => c.name === 'announcements')
    channel.send('🏆 Here are the current highest streaks:')
  
    let topStreaks = []
  
    for(let highscore of highscores) {
      let user = await client.users.fetch(highscore.userID)
      if(!db.getMentionSettingForUser(highscore.userID)) user = `**${user.username}**`
      topStreaks.push(`${user} for *${highscore.topic}* with ${highscore.streakLevel} ${highscore.streakLevel === 1 ? 'day' : 'days'}!`)
    }
  
    channel.send(topStreaks.join('\n'))  
  })
}

const broadcastAllActiveStreaks = async () => {
  client.guilds.cache.forEach(async guild => {
    const channel = guild.channels.cache.find(c => c.name === "announcements")
    const streaks = await exports.buildActiveStreaksMessage(guild.id)
    if (channel && streaks) {
      channel.send(`🔥 Here are all the active streaks:\n` + streaks + '\n\nTip: you can turn off mentions using `!togglementions`')  
    }
  })
}

exports.buildActiveStreaksMessage = async guildID => {
  const streaks = db.getActiveStreaks(guildID)
  if(streaks.length === 0) return

  let userStreaks = {}

  await Promise.all(streaks.sort((a, b) => b.streakLevel - a.streakLevel).map(async streak => {
    const user = await client.users.fetch(streak.userID)

    if(!userStreaks[streak.userID]) {
      userStreaks[streak.userID] = [`**${user.username}** with ${streak.streakLevel} ${streak.streakLevel === 1 ? 'day' : 'days'} for *${streak.topic}*`]
    } else {
      userStreaks[streak.userID].push(`${streak.streakLevel} ${streak.streakLevel === 1 ? 'day' : 'days'} for *${streak.topic}*`)
    }

    return streak
  }))

  return Object.keys(userStreaks).map(userStreak => {
    return userStreaks[userStreak].join(", ")
  }).join('\n')
}

exports.assignActiveStreakRole = (guild, userID) => {
  if (guild && guild.available) {
    const guildMember = guild.members.cache.find(u => u.id === userID)
    const role = db.getRole(guild.id, 'active')
    if (role) guildMember.roles.add(role, 'Has an active streak')
  }  
}

exports.getUsername = userID => {
  const user = client.users.fetch(userID)
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
