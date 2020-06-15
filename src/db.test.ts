import expect from 'expect'
import db from "./db"
import path from 'path'
import { mapEventToRow } from './gocardless';
import GoCardless from 'gocardless-nodejs';

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

describe('test database', () => {
  before(async () => {
    await db.migrate.latest({
      directory: path.join(__dirname, '../migrations'),
    });
  })

  it('Running in test env', () => {
    expect(process.env.NODE_ENV).toEqual('test')
  })

  it('Is an sqlite3 client', () => {
    expect(db.client.config.client).toEqual('sqlite3')
  })
  
  it('Data can be stored and retrieved on a test sqlite3 db', async () => {
    await db.table('events').insert(webhookRequest.body.events.map(mapEventToRow as any))
    const events = await db.select<GoCardless.Event[]>('*').from('events')
    expect(events.length).toEqual(webhookRequest.body.events.length)
  })

  after(() => {
    db.table('events').delete('*')
  });
})