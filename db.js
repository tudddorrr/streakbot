const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync('db.json')
const db = low(adapter)

const uuid = require('uuid/v4')

const isYesterday = require('date-fns/is_yesterday')
const isToday = require('date-fns/is_today')
const format = require('date-fns/format')

const topics = require('./utils/topics')

db.defaults({
    users: [], 
    streaks: [],
    channels: [],
    configs: []
  })
  .write()

exports.addStreak = msg => {
  const user = db.get('users')
    .find({ userID: msg.author.id })
    .value()

  if(!user) {
    db.get('users')
      .push({
        userID: msg.author.id,
        streaks: [],
        messagesEnabled: true,
        mentionsEnabled: true
      })
      .write()
  }

  const streakID = uuid()
  const topic = topics.getTopicOrChannel(msg)

  db.get('streaks')
    .push({
      streakID,
      userID: msg.author.id,
      messageID: msg.id,
      guildID: msg.guild.id,
      topic,
      date: new Date(),
      content: msg.content.split('!streak ')[1]
    })
    .write()

  const userStreaks = db.get('users')
    .find({ userID: msg.author.id })
    .get('streaks')
  
  const streak = userStreaks.find({topic})
  if(streak.value()) {
    streak.assign({
      guildID: msg.guild.id,
      topic: streak.value().topic,
      streakLevel: streak.value().streakLevel + 1,
      bestStreak: Math.max(streak.value().streakLevel+1, streak.value().bestStreak)
    })
    .write()

    console.log(`${msg.author.username} continued a streak for ${topic} to ${streak.value().streakLevel}`)
  } else {
    userStreaks.push({
      guildID: msg.guild.id,
      topic,
      streakLevel: 1,
      bestStreak: 1
    })
    .write()

    console.log(`${msg.author.username} started a streak for ${topic}`)
  }
}

exports.getUserStreak = (userID, guildID, msg) => {
  const topic = topics.getTopicOrChannel(msg)
  let streak = db.get('users')
    .find({userID})
    .get('streaks')
    .find({guildID, topic})
    .value()

  return streak || null
}

exports.getTopStreaks = guildID => {  
  let highscores = []

  const users = db.get('users').value()
  users.forEach(user => {
    highscores.push(...user.streaks.filter(streak => streak.guildID === guildID && streak.streakLevel > 0).map(streak => {
      return {
        ...streak,
        userID: user.userID
      }
    }))
  })
  
  // sort them by highest
  highscores.sort((a, b) => {
    return b.streakLevel - a.streakLevel
  })

  highscores = highscores.filter(score => {
    const anotherScore = highscores.find(s => s.userID !== score.userID && s.topic === score.topic)
    if(!anotherScore) return true
    return anotherScore.streakLevel >= score.streakLevel
  })

  return highscores
}

// Consider adding guildID to tell the user which guild
exports.checkStreaks = clientUsers => {
  const users = db.get('users').value()
  const streaks = db.get('streaks').value()

  users.forEach(user => {
    user.streaks.forEach(userStreak => {
      let foundStreakFromYesterday = false
      streaks.forEach(streak => {
        if(streak.userID === user.userID && streak.topic === userStreak.topic && isYesterday(streak.date)) {
          foundStreakFromYesterday = true
        }
      })

      if(!foundStreakFromYesterday && userStreak.streakLevel > 0) {
        console.log(`${user.userID}'s ${userStreak.topic} streak ended`)

        // send a message to them about it
        if(user.messagesEnabled) {
          clientUsers.find(u => u.id === user.userID).send(`Unfortunately you missed a day and your ${userStreak.streakLevel} day ${userStreak.topic} streak has ended. Use !streak ${userStreak.topic} to start a new one!`)
        }
        userStreak.streakLevel = 0
      }
    })
  })

  db.get('users')
    .assign(users)
    .write()
}

exports.hasStreakedToday = (guildID, userID, msg) => {
  const streaks = db.get('streaks').value()
  const topic = topics.getTopicOrChannel(msg)
  return streaks.some(streak => {
    if(streak.guildID === guildID && streak.userID === userID) {
      return streak.topic === topic && isToday(streak.date)
    }
    return false
  })
}

exports.isValidChannel = (guildID, channelName) => {
  return exports.getChannels(guildID).indexOf(channelName) !== -1
}

exports.getUserStreaks = userID => {
  return db.get('users')
    .find({userID})
    .get('streaks')
    .value()
}

exports.getUserActiveStreaks = userID => {
  const streaks = exports.getUserStreaks(userID)
  if (streaks) {
    return streaks.filter(streak => streak.streakLevel > 0)
  } else {
    return []
  }
}

exports.getStatCount = table => {
  return db.get(table).value().length
}

exports.toggleDMs = msg => {
  let user = db.get('users')
    .find({userID: msg.author.id})

  let userValue = user.value()
  userValue.messagesEnabled = !userValue.messagesEnabled

  user.assign(userValue)
    .write()

  console.log(`${userValue.userID}'s notifications are now set to ${userValue.messagesEnabled}`)

  if(userValue.messagesEnabled) {
    msg.reply('I will now message you about your streaks ending and time warnings. Use `!toggledm` to disable these messages')
  } else {
    msg.reply('I will no longer message you about your streaks ending or time warnings. Use `!toggledm` to re-enable these messages')
  }
}

exports.getDMSettingForUser = userID => {
  let user = db.get('users')
  .find({userID})
  .value()

  return user.messagesEnabled
}

exports.toggleMentions = msg => {
  let user = db.get('users')
    .find({userID: msg.author.id})

  let userValue = user.value()
  userValue.mentionsEnabled = !userValue.mentionsEnabled

  user.assign(userValue)
    .write()

  console.log(`${userValue.userID}'s mentions are now set to ${userValue.mentionsEnabled}`)

  if(userValue.mentionsEnabled) {
    msg.reply('I will now mention you if your streak is a highscore. Use `!togglementions` to disable these messages')
  } else {
    msg.reply('I will no longer message you if your streak is a highscore. Use `!togglementions` to re-enable these messages')
  }
}

exports.getMentionSettingForUser = userID => {
  let user = db.get('users')
  .find({userID})
  .value()


  return user ? user.mentionsEnabled : false
}

exports.getActiveStreaksForChannel = (guildID, channelName) => {
  let result = []
  let users = exports.getUsers()

  users.forEach(user => {
    user.streaks.filter(streak => streak.guildID === guildID && streak.topic === `#${channelName}` && streak.streakLevel > 0).forEach(streak => {
      result.push({
        userID: user.userID,
        channelName: channelName,
        streakLevel: streak.streakLevel
      })
    })
  })

  return result
}

exports.getChannels = guildID => {
  const channels = db.get('channels').value()
  const guildChannels = channels.find(gc => gc.guildID === guildID)
  return guildChannels ? guildChannels.channelNames : []
}

exports.getTopAllTimeStreaks = guildID => {  
  let highscores = []

  const users = db.get('users').value()
  users.forEach(user => {
    highscores.push(...user.streaks.filter(streak => streak.guildID === guildID).map(streak => {
      return {
        ...streak,
        userID: user.userID
      }
    }))
  })
  
  // sort them by highest
  return highscores.sort((a, b) => {
    return b.bestStreak - a.bestStreak
  }).filter(score => score.bestStreak > 0)
}

exports.getActiveStreaks = guildID => {
  let result = []
  let users = exports.getUsers()

  users.forEach(user => {
    user.streaks.filter(streak => streak.guildID === guildID && streak.streakLevel > 0).forEach(streak => {
      result.push({
        userID: user.userID,
        topic: streak.topic,
        streakLevel: streak.streakLevel
      })
    })
  })

  return result
}

exports.getUsers = () => {
  return db.get('users').value()
}

exports.userHasHighscore = (guildID, userID) => {
  const highscores = exports.getTopStreaks(guildID)
  if(highscores.length === 0) return false

  return Boolean(highscores.find(highscore => {
    return highscore.userID === userID
  }))
}

exports.getFirstStreakDate = guildID => {
  const streaks = db.get('streaks').filter(streak => streak.guildID === guildID).sortBy('date').value()
  if(streaks.length === 0) return null;
  return format(streaks[0].date, 'do MMM YYYY')
}

exports.getStreaks = () => {
  return db.get('streaks').value()
}

/**
 * Add a role type definition to the database.
 * @param roleID the id of the role to be added
 * @param guildID id of the guild in which the role is to be defined
 * @param type which type of role is to be added
 */
exports.addRole = (roleID, guildID, type) => {
  if (!db.get('configs').value()) {
    db.set('configs', []).write()
  }
  
  if (!db.get('configs').find({guildID}).value()) {
    db.get('configs').push({guildID, top: "", active: ""}).write()
  }
  
  db.get('configs')
    .find({guildID})
    .assign({[type]: roleID})
    .write()
}

/**
 * Clear the definition of a role type from a guild.
 * @param guildID which guild we're clearing it from.
 * @param type which type of role should be cleared.
 */
exports.removeRole = (guildID, type) => {
  exports.addRole("", guildID, type)
}

/**
 * Get the id of a role type from a server.
 * @param guildID Which server to look for the role in.
 * @param which Which type of role we're looking for.
 * @returns The roleID if it exists, undefined otherwise.
 */
exports.getRole = (guildID, which) => {
  return db.get('configs')
    .find({guildID})
    .get(which)
    .value()
}
  
exports.addChannels = (channels, guildID) => {
  if (!db.get('channels').find({guildID}).value()) {
    db.get('channels').push({guildID, channelNames: []}).write()
  }

  db.get('channels')
    .find({guildID})
    .assign({channelNames: channels})
    .write()
}