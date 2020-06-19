import db from '../db'
import * as Express from 'express'
import { Timestamps } from '../db';
import * as Z from 'zetkin'
import ClientOAuth2 from 'client-oauth2'
import * as url from 'url'
import * as auth from './express-zetkin-auth';
import { spoofLogin, spoofUpgrade } from './spoof';
import { wait } from '../utils';
import { uniqueId } from 'lodash';

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

// @ts-ignore
export const zetkin = Z.construct({
  clientId: opts.app.id,
  clientSecret: opts.app.secret,
  zetkinDomain: opts.zetkinDomain,
  ssl: opts.ssl,
});

const _config = zetkin.getConfig()

// @ts-ignore
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

export const getZetkinInstance = async (token?: Token) => {
  if (!token) {
    token = (await getValidToken())
  }
  zetkin.setTokenData(token)
  return zetkin
}

/**
 * Query a resource endpoint.
 * If the query fails, try refreshing the token.
 * If that fails, spoof a user login/upgrade request and try again.
 * Otherwise fail.
 * 
 * @param method 
 * @param args 
 */
export const aggressivelyRetry = async (query: (client: { resource: any }) => any, maxRetries = 5) => {
  const requestId = uniqueId()
  let mode: 'fail' | 'login' | 'refresh' | 'upgrade' = null
  let retryCount = 0
  async function run() {
    retryCount = retryCount + 1
    // console.log(`Zetkin API request`, { requestId, retryCount, mode })
    if (retryCount > maxRetries) { mode = 'fail' }
    if (mode === 'fail') return
    try {
      const client = await getZetkinInstance()
      const data = await query(client)
      if (mode !== 'upgrade') {
        // console.log("Successful tokens", await (await getValidTokens()).map(t => t.access_token))
      }
      return data
    } catch (e) {
      if (!!e?.httpStatus && ![401, 403].includes(e.httpStatus)) {
        // This is not an auth issue!
        console.error("Request was invalid.")
        throw new Error(e)
      }
      if (e.toString().includes('Unable to sign without access token')) {
        mode = 'login'
        // console.log('Login')
        await spoofLogin()
        await wait(1000)
        return await run()
      } else if (e.httpStatus === 401) {
        try {
          mode = 'refresh'
          // console.log('Refresh')
          await zetkinRefresh()
          return await run()
        } catch (e) {
          mode = 'login'
          // console.log('Login')
          await spoofLogin()
          await wait(1000)
          return await run()
        }
      } else if (e.httpStatus === 403 && mode !== 'upgrade') {
        mode = 'upgrade'
        // console.log("Upgrade")
        await spoofUpgrade()
        await wait(500)
        return await run()
      } else {
        // console.log('Give up')
        console.error(e)
        if (mode === 'upgrade') {
          throw new Error("Could not make request. Failed to upgrade. Maybe the OTP is broken?")
        } else {
          mode = 'fail'
        }
        throw new Error('Could not make request. Failed to automatically auth to Zetkin.')
      }
    }
  }

  return run()
}
// export const aggressivelyRetry = async (query: Function) => {
//   try {
//     return query()
//   } catch (e) {
//     // Something went wrong
//     try {
//       // First try refreshing the token
//       await zetkinRefresh()
//       return query()
//     } catch (e) {
//       console.log("2. Refreshed query errored", e)
//       // If the refresh didn't work, it probably had something to do with the token itself being stale
//       // So try to login as the user!
//       try {
//         await spoofLogin()
//         await wait(1500)
//         await spoofUpgrade()
//         await wait(500)
//         return query()
//       } catch (e) {
//         console.log("3. Re-logged in query errored", e)
//         throw new Error("Couldn't refresh token or acquire a new one automatically.")
//       }
//     }
//   }
// }

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
  await db.table('tokens').insert({
    ...tokenData,
    // Discount this token 10 seconds early in case of any network latency
    expiry_time: new Date(Date.now() + ((tokenData.expires_in - 10) * 1000)),
    origin,
  })
  return await db.table('tokens').select('*').where(tokenData)
}

export const getTokens = async () => {
  return db.table<Token>('tokens')
}

export const getValidTokens = async () => {
  const tokens = await getTokens()
  return tokens.filter(isValidToken)
}

export const getValidToken = async () => {
  return (await getValidTokens())[0]
}

export const refreshToken = async () => {
  const tokens: Token[] = await db.table('tokens')
  for (const token of tokens) {
    const newToken = await zetkinOAuthClient.createToken(token as any).refresh()
    if (!!newToken) {
      await db.table('tokens').delete().where('access_token', '=', token.access_token)
      const savedToken = await saveToken(newToken.data, 'refresh')
      return savedToken
    }
  }
}

export const zetkinLoginUrl = async (redirectUri: string, hostname?: string) => {
  let host, pathname
  try {
    const redirUrl = url.parse(redirectUri)
    host = redirUrl.host
    pathname = redirUrl.pathname
  } catch (e) {}
  const client = await getZetkinInstance()
  // @ts-ignore
  return client.getLoginUrl(url.format({
    protocol: process.env.ZETKIN_CLIENT_PROTOCOL ? process.env.ZETKIN_CLIENT_PROTOCOL : opts.ssl? 'https' : 'http',
    host: host || hostname,
    pathname: pathname === '/zetkin/login' ? '/' : pathname,
  }))
}

export const validate = (redirect = true) => async (req: Express.Request, res: Express.Response, next) => {
  // @ts-ignore
  if (!req.z.setTokenData) {
    throw new Error('express-zetkin-auth middleware appears to be missing')
  }
  // @ts-ignore
  const sessionTokenData = req.z.getTokenData()
  if (!!sessionTokenData && isValidToken(sessionTokenData)) {
    // @ts-ignore
    saveToken(sessionTokenData, 'session')
    return next()
  }
  try {
    // @ts-ignore
    const databaseResponse = await getTokens()

    if (databaseResponse.length === 0) {
      throw new Error('No tokens found. Authorization required.')
    }

    const validTokens = databaseResponse.filter(isValidToken)

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
      if (redirect) {
        // Delete all existing tokens
        await deleteAllTokens()
        // And add a new one
        // @ts-ignore
        res.redirect(await zetkinLoginUrl(req.url, req.hostname))
      } else {
        return next()
      }
    } catch (e) {
      console.error(e)
    }
  }
}

export const authStorageInterceptor = async (req: Express.Request, res: Express.Response, next) => {
  // @ts-ignore
  const tokenData = req.z.getTokenData()
  delete req.cookies['apiAccessToken']
  delete req.cookies['apiSession']
  res.clearCookie('apiAccessToken')
  res.clearCookie('apiSession');
  if (tokenData) {
    deleteAllTokens()
    await saveToken(tokenData, 'session');
  }
  next();
}

export async function zetkinRefresh () {
  const refreshedToken = await refreshToken()
  const client = await getZetkinInstance()
  if (refreshedToken.length) {
    // @ts-ignore
    client.setTokenData(refreshedToken[0])
  } else {
    throw new Error("Couldn't refresh token")
  }
}

export const zetkinLoginAndReturn = async (req: Express.Request, res: Express.Response) => {
  const redirect = url.format({
    protocol: process.env.ZETKIN_CLIENT_PROTOCOL || 'https',
    host: req.get('host'),
    pathname: url.parse(req.url).pathname
  })
  // console.log('login then go to', redirect)
  return res.redirect(`/zetkin/login?redirect=${encodeURIComponent(redirect)}`)
}

export const zetkinUpgradeAndReturn = async (req: Express.Request, res: Express.Response) => {
  const redirect = url.format({
    protocol: process.env.ZETKIN_CLIENT_PROTOCOL || 'https',
    host: req.get('host'),
    pathname: url.parse(req.url).pathname
  })
  // console.log('upgrade then go to', redirect)
  res.redirect(await getZetkinUpgradeUrl(redirect))
}

export const zetkinTokens = async (req: Express.Request, res: Express.Response) => {
  const tokens = await getValidTokens()
  return res.json({
    authorized: tokens.length ? '✅' : '❌',
    tokens
  })
}

export const zetkinLogin = async (req, res) => {
  // Delete all existing tokens
  await deleteAllTokens()
  // And add a new one
  // @ts-ignore
  res.redirect(await zetkinLoginUrl(req.query.redirect, req.hostname))
}

export const zetkinLogout = async (req, res) => {
  await deleteAllTokens()
  auth.logout(zetkinAuthOpts)
  res.redirect('/zetkin')
}

export const getZetkinUpgradeUrl = async (redirectUri: string) => {
  const accessToken = (await getValidToken())?.access_token
  if (!accessToken) throw new Error("Couldn't find an access token. Login required before you can upgrade.")
  let loginUrl = 'http://login.' + process.env.ZETKIN_DOMAIN + '/upgrade'
    // @ts-ignore
    + '?access_token=' + encodeURIComponent(accessToken)
    + '&redirect_uri=' + encodeURIComponent(redirectUri)
  return loginUrl
}

export const zetkinUpgradeToken = async (req, res) => {
  res.redirect(await getZetkinUpgradeUrl(url.format({
    protocol: process.env.ZETKIN_CLIENT_PROTOCOL || 'https',
    host: req.get('host'),
    pathname: '/zetkin/tokens'
  })));
}