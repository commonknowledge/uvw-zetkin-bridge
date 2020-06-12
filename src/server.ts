import '../env'
import * as express from 'express'
import * as auth from 'express-zetkin-auth';
import * as cookieParser from 'cookie-parser'
import * as sslRedirect from 'heroku-ssl-redirect'
import { zetkinAuthOpts, validate, zetkinCallback, zetkinLogin, zetkinLogout, zetkinLoginAndReturn, getValidTokens, zetkinTokens, zetkinRefreshAndReturn, zetkinLoginUrl } from './auth';
import { handleGoCardlessWebhook } from './gocardless';
import * as bodyParser from 'body-parser';

export default () => {
  const app = express()

  // @ts-ignore
  app.use(sslRedirect());
  app.use(cookieParser());
  // parse application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({ extended: false }))
  // parse application/json
  app.use(bodyParser.json())
  app.use(auth.initialize(zetkinAuthOpts));
  app.get('/zetkin/login', zetkinLogin)
  app.get('/zetkin/logout', zetkinLogout);
  app.get('/zetkin/tokens', validate(false), zetkinTokens)
  app.get('/zetkin/refresh', validate(true), zetkinTokens)
  app.all('/zetkin/callback', (req, res, next) => {
    console.log("Received call to /zetkin/callback")
    console.log(req.cookies)
    next()
  }, zetkinCallback)

  app.get('/', (req, res) => {
    res.json({ hello: 'world' })
  })

  app.get('/zetkin', validate(false), async (req, res) => {
    try {
      // @ts-ignore
      const { data } = await req.z.resource('users', 'me').get()
      return res.json(data)
    } catch (e) {
      try {
        await zetkinRefreshAndReturn(req, res)
      } catch (e) {
        return res.contentType('html').send(`
          <html>
          <body>
            <h3>Need token</h3>
            <a href='${zetkinLoginUrl(req, '/zetkin')}'>
              Login and come back
            </a>
          </body>
          </html>
        `)
      }
    }
  })

  app.all('/webhooks/gocardless', handleGoCardlessWebhook)

  const PORT = process.env.PORT || 7000
  app.listen(PORT, () => `Listening at port ${PORT}`)
}