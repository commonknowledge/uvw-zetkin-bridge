import path from 'path'
import createServer from './server';
import ngrok from 'ngrok'
import { getZetkinInstance, getValidToken } from './zetkin/auth';
import db from "./db"

const port = 4041
const getDefaultDevConfig = () => ({
  server: undefined,
  ngrokURL: undefined,
  port,
  app: createServer(),
  ngrokConfig: {
    protocol: process.env.ZETKIN_CLIENT_PROTOCOL, // http|tcp|tls, defaults to http
    addr: port,
    subdomain: process.env.ZETKIN_NGROK_DOMAIN.split('.')[0], // reserved tunnel name https://alex.ngrok.io
    authtoken: process.env.NGROK_TOKEN, // your authtoken from ngrok.com
    region: process.env.ZETKIN_NGROK_REGION as any || 'eu', // one of ngrok regions (us, eu, au, ap), defaults to us
  }
})

export class DevServer {
  config = getDefaultDevConfig()

  async setupServer () {
    this.config.server = this.config.app.listen(this.config.port)
  }
  
  async setupProxy () {
    this.config.ngrokURL = await ngrok.connect(this.config.ngrokConfig);
  }

  async setupDb (access_token: string = process.env.ZETKIN_ACCESS_TOKEN) {
    await db.migrate.latest({
      directory: path.join(__dirname, '../migrations'),
    });

    if (access_token) {
      const expiryDate = new Date(Date.now() + 10000000000)
      await db.table('tokens').insert({
        access_token,
        expires_in: expiryDate.getTime(),
        expiry_time: expiryDate,
        token_type: 'bearer'
      })
      const token = await getValidToken()
      await getZetkinInstance(token)
    }
  }

  async setup(access_token: string = process.env.ZETKIN_ACCESS_TOKEN) {
    try {
      await this.teardown()
    } catch (e) {
      console.log("Prelim teardown logs", e)
    }
    await this.setupDb(access_token)
    await this.setupServer()
    await this.setupProxy()
  }

  async teardownServer () {
    await this.config.server.close()
  }

  async teardownProxy () {
    await ngrok.disconnect();
  }

  async teardownDb () {
    await db.table('events').delete('*')
    await db.table('tokens').delete('*')
  }

  async teardown () {
    try {
    await this.teardownDb()
    } catch(e) {}
    try {
      await this.teardownServer()
    } catch (e) {}
    try {
      await this.teardownProxy()
    } catch (e) {}
  }
}