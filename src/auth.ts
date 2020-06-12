import db from './db'
import * as Express from 'express'
import { Timestamps } from './db';
import * as Z from 'zetkin'
import * as ClientOAuth2 from 'client-oauth2'
import * as url from 'url'
import * as auth from 'express-zetkin-auth';

/**
 * Zetkin auth
 **/
export const zetkinAuthOpts = {
  zetkinDomain: process.env.ZETKIN_DOMAIN,
  defaultRedirectPath: '/',
  app: {
      id: process.env.ZETKIN_CONSUMER_ID,
      secret: process.env.ZETKIN_CONSUMER_SECRET,
  },
  secret: process.env.ZETKIN_SESSION_SECRET,
};

const defaultOpts = {
  tokenCookieName: 'apiAccessToken',
  sessionCookieName: 'apiSession',
  defaultRedirPath: '/',
  logoutRedirPath: null,
  zetkinDomain: 'zetk.in',
  minAuthLevel: undefined,
  secret: null,
  ssl: false
};

export const opts = Object.assign({}, defaultOpts, zetkinAuthOpts);

export const zetkin = Z.construct({
  clientId: opts.app.id,
  clientSecret: opts.app.secret,
  zetkinDomain: opts.zetkinDomain,
  ssl: opts.ssl,
});

const _config = zetkin.getConfig()

export const zetkinOAuthClient = new ClientOAuth2({
  clientId: _config.clientId,
  clientSecret: _config.clientSecret,
  accessTokenUri: _config.accessTokenUri
      .replace('{PROTOCOL}', _config.ssl? 'https' : 'http')
      .replace('{VERSION}', _config.version)
      .replace('{ZETKIN_DOMAIN}', _config.zetkinDomain),
  authorizationUri: _config.authorizationUri
      .replace('{PROTOCOL}', _config.ssl? 'https' : 'http')
      .replace('{VERSION}', _config.version)
      .replace('{ZETKIN_DOMAIN}', _config.zetkinDomain),
  redirectUri: _config.redirectUri,
  scopes: [],
});

interface Token extends Timestamps {
  access_token: string
  expires_in: string
  expiry_time: Date
  refresh_token: string
  token_type: string
}

export const isValidToken = (token: Token) => {
  return token.expiry_time > new Date(new Date() as any - 5000)
}

export const deleteAllTokens = async () => {
  return db.table('tokens').delete('*')
}

export const saveToken = async (tokenData, origin) => {
  return await db.table('tokens').insert({
    ...tokenData,
    // Discount this token 10 seconds early in case of any network latency
    expiry_time: new Date(Date.now() + ((tokenData.expires_in - 10) * 1000)),
    origin,
  }).returning<Token[]>('*')
}

export const getTokens = async () => {
  return db.table<Token>('tokens')
}

export const refreshToken = async () => {
  const tokens: Token[] = await db.table('tokens')
  for (const token of tokens) {
    const newToken = await zetkinOAuthClient.createToken(token as any).refresh()
    if (!!newToken) {
      await db.table('tokens').delete().where(token)
      const savedToken = await saveToken(newToken.data, 'refresh')
      return savedToken
    }
  }
}

export const validate = async (req: Express.Request, res: Express.Response, next) => {
  // @ts-ignore
  if (!req.z.setTokenData) {
    throw new Error('express-zetkin-auth middleware appears to be missing')
  }
  // @ts-ignore
  if (!!req.zetkinTokenData && isValidToken(req.zetkinTokenData)) {
    // @ts-ignore
    req.z.setTokenData(req.zetkinTokenData)
    return next()
  }
  try {
    // @ts-ignore
    const databaseResponse = await getTokens(req)

    if (databaseResponse.length === 0) {
      throw new Error('No tokens found. Authorization required.')
    }

    const validTokens = databaseResponse
      .filter(isValidToken)

    if (validTokens.length > 0) {
      // @ts-ignore
      req.z.setTokenData(validTokens[0])
      return next()
    }

    const refreshedToken = await refreshToken()

    if (refreshedToken.length === 0) {
      throw new Error ("Failed to refresh tokens. Authorization required.")
    }

    // @ts-ignore
    req.z.setTokenData(refreshedToken[0])
    return next()
  } catch (e) {
    console.error(e)
    try {
      // Delete all existing tokens
      await deleteAllTokens()
      // And add a new one
      // @ts-ignore
      res.redirect(req.z.getLoginUrl(url.format({
        protocol: opts.ssl? 'https' : 'http',
        host: req.get('host'),
        pathname: `/zetkin/callback?redirect=${req.url}`,
      })))
    } catch (e) {
      console.error(e)
    }
  }
}

export const zetkinLoginAndReturn = (req, res) => {
  return res.redirect(`/zetkin/login?redirect=${req.url}`)
}

export const zetkinLogin = async (req, res) => {
  // Delete all existing tokens
  await deleteAllTokens()
  // And add a new one
  // @ts-ignore
  res.redirect(req.z.getLoginUrl(url.format({
    protocol: opts.ssl? 'https' : 'http',
    host: req.get('host'),
    pathname: `/zetkin/callback?redirect=${req.query.redirect}`,
  })))
}

export const zetkinLogout = async (req, res) => {
  await deleteAllTokens()
  auth.logout(zetkinAuthOpts)
}

export const zetkinCallback = async (req, res) => {
  try {
    // @ts-ignore
    const databaseResponse = await saveToken(req.z.getTokenData(), 'session');
    (req as any).tokenData = databaseResponse[0]

    if (req.query.redirect) {
      return res.redirect(req.query.redirect as string)
    }

    return res.json({
      message: 'Authorization successful. Token stored to database. ✅',
      databaseResponse
    })
  } catch (e) {
    res.redirect('/zetkin/refresh')
  }
}