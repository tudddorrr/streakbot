const Koa = require('koa')
const Router = require('koa-router')

const app = new Koa()
const router = new Router()

router.get('/', async (ctx, next) => {
  ctx.body = "hi"
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