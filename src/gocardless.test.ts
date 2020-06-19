import expect from 'expect'
import supertest from 'supertest'
import db from "./db"
import GoCardless from 'gocardless-nodejs';
import { DevServer } from './dev.test';

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
  },
  headers: {
    host: 'uvw-zetkin-bridge.herokuapp.com',
    connection: 'close',
    'accept-encoding': 'gzip;q=1.0,deflate;q=0.6,identity;q=0.3',
    accept: '*/*',
    'user-agent': 'gocardless-webhook-service/1.1',
    origin: 'https://api.gocardless.com',
    'content-type': 'application/json',
    'webhook-signature':
      'e497fd8050a298d60b40e7f3c7f00b02f912edc63c49c786be7c57e2ef494ff2',
    'x-request-id': '05e677b1-4f47-4ff6-8e85-5b63448f434f',
    'x-forwarded-for': '35.204.73.47',
    'x-forwarded-proto': 'https',
    'x-forwarded-port': '443',
    via: '1.1 vegur',
    'connect-time': '0',
    'x-request-start': '1591990726636',
    'total-route-time': '0',
    'content-length': '35536'
  }
}

const devServer = new DevServer()

describe('Gocardless webhook receiver', () => {
  beforeEach(async function() { 
    this.timeout(10000)
    await devServer.setupDb()
  })

  afterEach(async function() {
    await devServer.teardownDb()
  })

  it('Returns a 204 response if the request is valid', async () => {
    await supertest(devServer.config.app)
      .post('/webhooks/gocardless')
      .send(webhookRequest.body)
      .set('content-type', webhookRequest.headers['content-type'])
      .set('webhook-signature', webhookRequest.headers['webhook-signature'])
      .expect(204)
  })

  // it('Returns a 400 response if the request is invalid', async () => {
  //   await supertest(app)
  //     .post('/webhooks/gocardless')
  //     .send(webhookRequest.body)
  //     .set('content-type', webhookRequest.headers['content-type'])
  //     .set('webhook-signature', webhookRequest.headers['webhook-signature'].slice(0, 3))
  //     .expect(400)
  // })

  it('It stores the events in the database', async () => {
    await supertest(devServer.config.app)
      .post('/webhooks/gocardless')
      .send(webhookRequest.body)
      .set('content-type', webhookRequest.headers['content-type'])
      .set('webhook-signature', webhookRequest.headers['webhook-signature'])

    const events = await db.select<GoCardless.Event[]>('*').from('events').where('id', 'in', webhookRequest.body.events.map(e => e.id))
    expect(events.length).toEqual(webhookRequest.body.events.length)
  })
})