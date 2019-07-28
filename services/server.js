const Koa = require('koa')
const Router = require('koa-router')

const app = new Koa()
const router = new Router()

const db = require('../db')
const bot = require('./discord')

// Consider making this get all the stats and not just for one guild id
router.get('/:guildID/stats', async (ctx, next) => {
  ctx.body = {
    users: db.getStatCount('users'),
    streaks: db.getStatCount('streaks'),
    firstStreak: db.getFirstStreakDate(ctx.params.guildID)
  }
  next()
})

router.get('/channels', async (ctx, next) => {
  ctx.body = db.getChannels()
  next()
})

router.get('/:guildID/streaks', async (ctx, next) => {
  ctx.body = db.getStreaks(ctx.params.guildID)
  next()
})

router.get('/:guildID/streaks/:channelName', async (ctx, next) => {
  ctx.body = db.getActiveStreaksForChannel(ctx.params.guildID, ctx.params.channelName)
  next()
})

router.get('/:guildID/streaks/top-active', async (ctx, next) => {
  ctx.body = db.getTopStreaks(ctx.params.guildID)
  next()
})

router.get('/:guildID/streaks/top-all-time', async (ctx, next) => {
  ctx.body = db.getTopAllTimeStreaks(ctx.params.guildID)
  next()
})

router.get('/:guildID/streaks/active', async (ctx, next) => {
  ctx.body = db.getActiveStreaks(ctx.params.guildID)
  next()
})

router.get('/users', async (ctx, next) => {
  let users = db.getUsers()
  ctx.body = users.map(user => {
    return {
      userID: user.userID,
      username: bot.getUsername(user.userID),
      streaks: user.streaks
    }
  })
  next()
})

router.get('/users/:id/streaks', async (ctx, next) => {
  ctx.body = db.getUserStreaks(ctx.params.id)
  next()
})

router.get('/users/:id/active-streaks', async (ctx, next) => {
  ctx.body = db.getUserActiveStreaks(ctx.params.id)
  next()
})

router.get('/users/:id/username', async (ctx, next) => {
  ctx.body = bot.getUsername(ctx.params.id)
  next()
})

router.get('/:guildID/updates', async (ctx, next) => {
  let streaks = db.getStreaks(ctx.params.guildID)
  streaks = streaks.reverse()
  const updates = []

  if(!ctx.query.start || !ctx.query.count) {
    ctx.body = 'You must specify a start and a count'
    next()
    return
  }

  for(let i = ctx.query.start; i < ctx.query.count; i++) {
    if (i >= streaks.length) { break }
    const streak = streaks[i]
    updates.push(await bot.findMessage(ctx.params.guildID, streak.channelName, streak.messageID))
  }
  ctx.body = updates
  next()
})

router.get('/:guildID/updates/:channelName/:messageID', async (ctx, next) => {
  ctx.body = await bot.findMessage(ctx.params.guildID, ctx.params.channelName, ctx.params.messageID)
  next()
})

app
  .use(router.routes())
  .use(router.allowedMethods())
  .use(ctx => {
    console.log('====================')
    console.log('Req:', ctx.request.method, ctx.request.url)
    console.log('Reply:', JSON.stringify(ctx.body))
  })

app.listen(3000, '0.0.0.0')
console.log('Server listening on port 3000')