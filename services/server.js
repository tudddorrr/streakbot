const Koa = require('koa')
const Router = require('koa-router')

const app = new Koa()
const router = new Router()

const db = require('../db')
const bot = require('./discord')

router.get('/stats', async (ctx, next) => {
  ctx.body = {
    users: db.getStatCount('users'),
    streaks: db.getStatCount('streaks'),
    firstStreak: db.getFirstStreakDate()
  }
  next()
})

router.get('/channels', async (ctx, next) => {
  ctx.body = db.getChannels()
  next()
})

router.get('/streaks', async (ctx, next) => {
  ctx.body = db.getStreaks()
  next()
})

router.get('/streaks/:channelName', async (ctx, next) => {
  ctx.body = db.getActiveStreaksForChannel(ctx.params.channelName)
  next()
})

router.get('/streaks/top-active', async (ctx, next) => {
  ctx.body = db.getTopStreaks()
  next()
})

router.get('/streaks/top-all-time', async (ctx, next) => {
  ctx.body = db.getTopAllTimeStreaks()
  next()
})

router.get('/streaks/active', async (ctx, next) => {
  ctx.body = db.getActiveStreaks()
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

router.get('/updates', async (ctx, next) => {
  const streaks = db.getStreaks()
  const updates = []

  if(!ctx.query.start || !ctx.query.count) {
    ctx.body = 'You must specify a start and a count'
    next()
    return
  }

  for(let i = ctx.query.start; i < ctx.query.count; i++) {
    const streak = streaks[i]
    updates.push(await bot.findMessage(streak.channelName, streak.messageID))
  }
  ctx.body = updates
  next()
})

router.get('/updates/:channelName/:messageID', async (ctx, next) => {
  ctx.body = await bot.findMessage(ctx.params.channelName, ctx.params.messageID)
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

app.listen(3000)
console.log('Server listening on port 3000')