const Koa = require('koa')
const Router = require('koa-router')

const app = new Koa()
const router = new Router()

const db = require('../db')

router.get('/stats', async (ctx, next) => {
  ctx.body = {
    users: db.getStatCount('users'),
    streaks: db.getStatCount('streaks'),
    firstStreak: db.getFirstStreakDate()
  }
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
  ctx.body = db.getUsers()
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