const db = require('../db.json')
	
	let users = db.users
	let streaks = db.streaks
	let channels = db.channels
	
	users = users.map(user => {
	  return {
	    ...user,
	    streaks: user.streaks.map(streak => {
        const topic = `#${streak.channelName}`
        delete streak.channelName
        return {
          ...streak,
          topic
        }
	    })
	  }
	})
	
	streaks = streaks.map(streak => {
    const topic = `#${streak.channelName}`
    delete streak.channelName
    return {
      ...streak,
      topic
    }
	})
	
	console.log(JSON.stringify({
	  users,
	  streaks,
	  channels
	})) 