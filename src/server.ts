import '../env'
import * as express from 'express'
import * as auth from 'express-zetkin-auth';
import * as cookieParser from 'cookie-parser'
import * as sslRedirect from 'heroku-ssl-redirect'
import { zetkinAuthOpts, validate, zetkinCallback, zetkinLogin, zetkinLogout, zetkinLoginAndReturn, getValidTokens } from './auth';
import { handleGoCardlessWebhook } from './gocardless';

export default () => {
  const app = express()

  // @ts-ignore
  app.use(sslRedirect());
  app.use(cookieParser());
  app.use(auth.initialize(zetkinAuthOpts));
  app.get('/zetkin/login', zetkinLogin)
  app.get('/zetkin/logout', zetkinLogout);
  if (process.env.NODE_ENV !== 'production') {
    app.get('/zetkin/tokens', validate, async (req, res) => {
      const tokens = await getValidTokens()
      return res.json({
        authorized: tokens.length ? '✅' : '❌',
        tokens
      })
    })
  }

  app.get('/', (req, res) => {
    res.json({ hello: 'world' })
  })

  app.get('/zetkin/callback', zetkinCallback)

  app.get('/zetkin', validate, async (req, res) => {
    try {
      // @ts-ignore
      const { data } = await req.z.resource('users', 'me').get()
      return res.json(data)
    } catch (e) {
      await zetkinLoginAndReturn(req, res)
    }
  })

  app.all('/webhooks/gocardless', handleGoCardlessWebhook)

  app.get('/', (req, res) => {
    console.log(req)
    console.log(req.body)
    console.log(req.headers['Webhook-Signature'])
    return res.status(204).send()
  })

  const PORT = process.env.PORT || 7000
  app.listen(PORT, () => `Listening at port ${PORT}`)
}