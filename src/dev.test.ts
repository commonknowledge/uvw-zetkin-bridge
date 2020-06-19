import expect from 'expect'
import db from "./db"
import path from 'path'
import { mapEventToRow } from './gocardless';
import GoCardless from 'gocardless-nodejs';
import createServer from './server';
import ngrok from 'ngrok'
import * as url from 'url';
import fetch from 'node-fetch';
import { helloWorld } from './server';
import { wait } from './utils';

const webhookRequest = {
  body: {
    events: [
      {
        id: 'EV015ZW4MC2E89',
        created_at: '2020-06-12T12:25:03.529Z',
        resource_type: 'payments',
        action: 'paid_out',
        links: [],
        details: [],
        metadata: {}
      },
      {
        id: 'EV015ZW4MH3MPD',
        created_at: '2020-06-12T12:25:03.544Z',
        resource_type: 'payments',
        action: 'paid_out',
        links: [],
        details: [],
        metadata: {}
      },
      {
        id: 'EV015ZW4MX08HT',
        created_at: '2020-06-12T12:25:03.560Z',
        resource_type: 'payments',
        action: 'paid_out',
        links: [],
        details: [],
        metadata: {}
      },
    ]
  }
}

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

  async setupDb () {
    await db.migrate.latest({
      directory: path.join(__dirname, '../migrations'),
    });
  }

  async setup() {
    await this.setupDb()
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

const devServer = new DevServer()

describe('Dev server', function () {
  beforeEach(async function() { 
    this.timeout(10000)
    await devServer.setup()
  })

  afterEach(async function() {
    await devServer.teardown()
  })
  
  it('Should have a running dev server', async function () {
    const res = await fetch(url.format({ protocol: 'http', hostname: 'localhost', port }))
    const body = await res.json()
    expect(body).toEqual(helloWorld)
  })

  it('Teardown should turn off the server', async function () {
    await devServer.teardown()
           
    await expect(
      async () => {
        const res = await fetch(url.format({ protocol: 'http', hostname: 'localhost', port }))
        const body = await res.json() 
      })
      .rejects
      .toThrow(/ECONNREFUSED/)
  })

  it('Running in test env', () => {
    expect(process.env.NODE_ENV).toEqual('test')
  })

  it('Has an sqlite3 client', () => {
    expect(db.client.config.client).toEqual('sqlite3')
  })
  
  it('Data can be stored and retrieved on a test sqlite3 db', async () => {
    await db.table('events').insert(webhookRequest.body.events.map(mapEventToRow as any))
    const events = await db.select<GoCardless.Event[]>('*').from('events')
    expect(events.length).toEqual(webhookRequest.body.events.length)
  })
  
  it('Teardown should wipe the DB', async () => {
    await devServer.teardown()
    const events = await db.select<GoCardless.Event[]>('*').from('events')
    expect(events).toHaveLength(0)
  })
})