const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync('db.json')
const db = low(adapter)

const uuid = require('uuid/v4')

const isYesterday = require('date-fns/is_yesterday')
const isToday = require('date-fns/is_today')
const format = require('date-fns/format')

// user - userID, streaks [{channelName, streakLevel}]
// streaks - streakID, userID, channelName, date, content

db.defaults({
    users: [], 
    streaks: [],
    channels: [
      'art',
      'design',
      'gameplay',
      'music',
      'level-design',
      'production',
      'writing',
      'testland'
    ]
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

  db.get('streaks')
    .push({
      streakID,
      userID: msg.author.id,
      messageID: msg.id,
      channelName: msg.channel.name,
      date: new Date(),
      content: msg.content.split('!streak ')[1]
    })
    .write()

  const userStreaks = db.get('users')
    .find({ userID: msg.author.id })
    .get('streaks')
  
  const streak = userStreaks.find({channelName: msg.channel.name})
  if(streak.value()) {
    streak.assign({
      channelName: streak.value().channelName,
      streakLevel: streak.value().streakLevel + 1,
      bestStreak: Math.max(streak.value().streakLevel+1, streak.value().bestStreak)
    })
    .write()

    console.log(`${msg.author.username} continued a streak in ${msg.channel.name} to ${streak.value().streakLevel}`)
  } else {
    userStreaks.push({
      channelName: msg.channel.name,
      streakLevel: 1,
      bestStreak: 1
    })
    .write()

    console.log(`${msg.author.username} started a streak in ${msg.channel.name}`)
  }
}

exports.getUserStreakForChannel = (userID, channelName) => {
  let streak = db.get('users')
    .find({userID})
    .get('streaks')
    .find({channelName})
    .value()

  return streak ? streak.streakLevel : null
}

exports.getTopStreaks = () => {  
  let highscores = db.get('channels').value()
  highscores = highscores.map(highscore => {
    return {
      channelName: highscore,
      userID: '',
      streakLevel: 0
    }
  })

  const users = db.get('users').value()
  users.forEach(user => {
    user.streaks.forEach(streak => {
      highscores.forEach(highscore => {
        if(streak.channelName == highscore.channelName && streak.streakLevel > highscore.streakLevel) {
          highscore.userID = user.userID
          highscore.streakLevel = streak.streakLevel
        }
      })
    })
  })

  // null out any channels with no streaks
  highscores = highscores.map(highscore => {
    return highscore.streakLevel > 0 ? highscore : null
  })
  highscores = highscores.filter(highscore => highscore !== null && highscore.channelName !== 'testland')
  
  // sort them by highest
  highscores.sort((a, b) => {
    return b.streakLevel - a.streakLevel
  })

  return highscores
}

exports.checkStreaks = clientUsers => {
  const users = db.get('users').value()
  const streaks = db.get('streaks').value()

  users.forEach(user => {
    user.streaks.forEach(userStreak => {
      let foundStreakFromYesterday = false
      streaks.forEach(streak => {
        if(streak.userID === user.userID && streak.channelName === userStreak.channelName && isYesterday(streak.date)) {
          foundStreakFromYesterday = true
        }
      })

      if(!foundStreakFromYesterday && userStreak.streakLevel > 0) {
        console.log(`${user.userID}'s ${userStreak.channelName} streak ended`)

        // send a message to them about it
        if(user.messagesEnabled) {
          clientUsers.find(u => u.id === user.userID).send(`Unfortunately you missed a day and your ${userStreak.streakLevel} day ${userStreak.channelName} streak has ended. Use !streak in the ${userStreak.channelName} channel to start a new one!`)
        }
        userStreak.streakLevel = 0
      }
    })
  })

  db.get('users')
    .assign(users)
    .write()
}

exports.hasStreakedToday = (userID, channelName) => {
  const streaks = db.get('streaks').value()

  return streaks.some(streak => {
    return streak.userID === userID && streak.channelName === channelName && isToday(streak.date)
  })
}

exports.isValidChannel = channelName => {
  return db.get('channels').value().indexOf(channelName) !== -1
}

exports.getUserStreaks = userID => {
  return db.get('users')
    .find({userID})
    .get('streaks')
    .value()
}

exports.getUserActiveStreaks = userID => {
  const streaks = exports.getUserStreaks(userID)
  if(streaks) {
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
    msg.reply(`I will now message you if your streak ends. Use !toggledm to disable these messages`)
  } else {
    msg.reply(`I will no longer message you if your streak ends. Use !toggledm to re-enable these messages`)
  }
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
    msg.reply(`I will now mention you if your streak is a highscore. Use !togglementions to disable these messages`)
  } else {
    msg.reply(`I will no longer message you if your streak is a highscore. Use !togglementions to re-enable these messages`)
  }
}

exports.getMentionSettingForUser = userID => {
  let user = db.get('users')
  .find({userID})
  .value()

  return user.mentionsEnabled
}

exports.getActiveStreaksForChannel = channelName => {
  let result = []
  let users = exports.getUsers()

  users.forEach(user => {
    user.streaks.forEach(streak => {
      if(streak.channelName === channelName && streak.streakLevel > 0) {
        result.push({
          userID: user.userID,
          channelName: channelName,
          streakLevel: streak.streakLevel
        })
      }
    })
  })

  return result
}

exports.getChannels = () => {
  return db.get('channels').value()
}

exports.getTopAllTimeStreaks = () => {  
  let highscores = db.get('channels').value()
  highscores = highscores.map(highscore => {
    return {
      channelName: highscore,
      userID: '',
      streakLevel: 0
    }
  })

  const users = db.get('users').value()
  users.forEach(user => {
    user.streaks.forEach(streak => {
      highscores.forEach(highscore => {
        if(streak.channelName == highscore.channelName && streak.bestStreak > highscore.streakLevel) {
          highscore.userID = user.userID
          highscore.streakLevel = streak.bestStreak
        }
      })
    })
  })

  // null out any channels with no streaks
  highscores = highscores.map(highscore => {
    return highscore.streakLevel > 0 ? highscore : null
  })
  highscores = highscores.filter(highscore => highscore !== null && highscore.channelName !== 'testland')
  
  // sort them by highest
  highscores.sort((a, b) => {
    return b.streakLevel - a.streakLevel
  })

  return highscores
}

exports.getActiveStreaks = () => {
  let result = []
  for(let channel of exports.getChannels()) {
    if(channel !== 'testland') {
      const streaksForChannel = exports.getActiveStreaksForChannel(channel)
      if(streaksForChannel.length > 0) result.push(streaksForChannel)
    }
  }
  return result
}

exports.getUsers = () => {
  return db.get('users').value()
}

exports.userHasHighscore = userID => {
  const highscores = exports.getTopStreaks()
  if(highscores.length === 0) return false

  return Boolean(highscores.find(highscore => {
    return highscore.userID === userID
  }))
}

exports.getFirstStreakDate = () => {
  const streaks = db.get('streaks').sortBy('date').value()
  return format(streaks[0].date, 'do MMM YYYY')
}

exports.getStreaks = () => {
  return db.get('streaks').value()
}

exports.addRole = (roleid, guildid, type) => {
  if (!db.get('configs').value()) {
    db.set('configs', []).write()
  }

  if (!db.get('configs').find({guild: guildid}).value()) {
    db.get('configs').push({guild: guildid, top: "", active: ""}).write()
  }

  db.get('configs')
    .find({guild: guildid})
    .assign({[type]: roleid})
    .write()
}

exports.removeRole = (guildid, type) => {
  exports.addRole("", guildid, type)
}

exports.getRole = (guildid, which) => {
  return db.get('configs')
    .find({guild: guildid})
    .get(which)
    .value()
}