import '../env'
import express from 'express'
import * as auth from './zetkin/express-zetkin-auth';
import cookieParser from 'cookie-parser'
import sslRedirect from 'heroku-ssl-redirect'
import { zetkinAuthOpts, validate, zetkinLogin, zetkinLogout, zetkinTokens, zetkinRefresh, authStorageInterceptor, zetkinLoginAndReturn, zetkinUpgradeToken, zetkinUpgradeAndReturn, aggressivelyRetry } from './zetkin/auth';
import { handleGoCardlessWebhook } from './gocardless/gocardless';
import * as bodyParser from 'body-parser';
import { handleZammadWebhook } from './zammad/zammad';
import { handleEnquiryWebhook } from './zammad/enquiry';
import proxy from 'express-http-proxy'

export const helloWorld = { hello: 'world' }

export default () => {
  // @ts-ignore
  const app = express()

  // Placed before any other middleware
  app.post('/webhooks/enquiry', proxy(process.env.ENQUIRY_WEBHOOK_HOST, {
    proxyReqPathResolver: () => process.env.ENQUIRY_WEBHOOK_PATH
  }))

  // @ts-ignore
  app.use(sslRedirect());
  app.use(cookieParser());
  // parse application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({ extended: false }))
  // parse application/json
  app.use(bodyParser.json())
  // app.use(auth.initialize(zetkinAuthOpts));
  // app.use(authStorageInterceptor)
  // app.get('/zetkin/login', zetkinLogin)
  // app.get('/zetkin/logout', zetkinLogout);
  // app.get('/zetkin/upgrade', zetkinUpgradeToken)
  // if (process.env.NODE_ENV !== 'production') {
  //   app.get('/zetkin/tokens', validate(false), zetkinTokens)
  //   app.get('/zetkin/refresh', validate(true), zetkinTokens)
  // }

  app.get('/', (req, res) => {
    res.json(helloWorld)
  })

  // app.get('/zetkin', async (req, res) => {
  //   const { data } = await aggressivelyRetry(async (client) =>
  //     client.resource('orgs', process.env.ZETKIN_ORG_ID, 'people', 'fields').get()
  //   )
  //   return res.json(data)
  // })

  app.all('/webhooks/gocardless', handleGoCardlessWebhook)

  return app
}