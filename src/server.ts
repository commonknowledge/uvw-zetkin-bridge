import '../env'
import express from 'express'
import * as auth from './express-zetkin-auth';
import cookieParser from 'cookie-parser'
import sslRedirect from 'heroku-ssl-redirect'
import { zetkinAuthOpts, validate, zetkinLogin, zetkinLogout, zetkinTokens, zetkinRefresh, zetkinLoginUrl, authStorageInterceptor, zetkinLoginAndReturn, getValidTokens, zetkinUpgradeToken, zetkinUpgradeAndReturn, getZetkinInstance } from './auth';
import { handleGoCardlessWebhook, gocardlessQuery } from './gocardless';
import * as bodyParser from 'body-parser';

export default () => {
  // @ts-ignore
  const app = express()

  // @ts-ignore
  app.use(sslRedirect());
  app.use(cookieParser());
  // parse application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({ extended: false }))
  // parse application/json
  app.use(bodyParser.json())
  app.use(auth.initialize(zetkinAuthOpts));
  app.use(authStorageInterceptor)
  app.get('/zetkin/login', zetkinLogin)
  app.get('/zetkin/logout', zetkinLogout);
  app.get('/zetkin/upgrade', zetkinUpgradeToken)
  if (process.env.NODE_ENV !== 'production') {
    app.get('/zetkin/tokens', validate(false), zetkinTokens)
    app.get('/zetkin/refresh', validate(true), zetkinTokens)
  }

  app.get('/', (req, res) => {
    res.json({ hello: 'world' })
  })

  app.get('/zetkin', validate(), async (req, res) => {
    const query = async () => {
      // @ts-ignore
      const client = await getZetkinInstance()
      const { data } = await client.resource('orgs', process.env.ZETKIN_ORG_ID, 'people', 'fields').get()
      return res.json(data)
    }

    try {
      return await query()
    } catch (e) {
      console.error("Zetkin request error", e)
      if (e.httpStatus === 401) {
        try {
          console.log(e, 'Refresh')
          await zetkinRefresh(req, res)
          return await query()
        } catch (e) {
          console.log(e, 'Login')
          return await zetkinLoginAndReturn(req, res)
        }
      } else if (e.httpStatus === 403) {
        console.log('Upgrade')
        return await zetkinUpgradeAndReturn(req, res)
      } else {
        console.log('Give up')
        return res.redirect('/')
      }
    }
  })

  app.all('/webhooks/gocardless', handleGoCardlessWebhook)

  app.all('/gocardless', gocardlessQuery)

  return app
}