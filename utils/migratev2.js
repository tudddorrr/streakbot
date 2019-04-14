const db = require('../db.json')

let users = db.users
let streaks = db.streaks
let channels = db.channels

const devStreakGuildID = "530338655894503444"

users = users.map(user => {
  return {
    ...user,
    streaks: user.streaks.map(streak => {
      return {
        ...streak,
        guildID: devStreakGuildID
      }
    })
  }
})

streaks = streaks.map(streak => {
  return {
    ...streak,
    guildID: devStreakGuildID
  }
})

channels = [{
  channelNames: channels,
  guildID: devStreakGuildID
}]

console.log(JSON.stringify({
  users,
  streaks,
  channels
}))