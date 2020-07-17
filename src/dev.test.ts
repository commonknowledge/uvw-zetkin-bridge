import expect from 'expect'
import db from "./db"
import { mapEventToRow } from './gocardless/gocardless';
import GoCardless from 'gocardless-nodejs';
import * as url from 'url';
import fetch from 'node-fetch';
import { helloWorld } from './server';
import { DevServer } from './dev';

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
    const res = await fetch(url.format({ protocol: 'http', hostname: 'localhost', port: devServer.config.port }))
    const body = await res.json()
    expect(body).toEqual(helloWorld)
  })

  it('Teardown should turn off the server', async function () {
    await devServer.teardown()
           
    await expect(
      async () => {
        const res = await fetch(url.format({ protocol: 'http', hostname: 'localhost', port: devServer.config.port }))
        const body = await res.json() 
      })
      .rejects
      .toThrow(/ECONNREFUSED/)
  })

  if (process.env.NODE_ENV === 'test') {
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
  }
})