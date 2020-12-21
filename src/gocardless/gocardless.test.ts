import expect from 'expect'
import supertest from 'supertest'
import db from "../db"
import GoCardless from 'gocardless-nodejs';
import { DevServer } from '../dev';
import { getPayAndSubscriptionDataFromGoCardlessCustomer, gocardless, dateFormat, getCustomerUrl, getGoCardlessPaginatedList } from './gocardless';
import { getZetkinPersonByGoCardlessCustomer, getOrCreateZetkinPersonByGoCardlessCustomer, mapGoCardlessCustomerToZetkinMember } from './zetkin-sync';
import { getZetkinCustomData, getZetkinMemberTags, getOrCreateZetkinTag } from '../zetkin/zetkin';
import { TAGS } from '../zetkin/configure';

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

describe('GoCardless utils', () => {
  it('Collects up paginated data', async function () {
    this.timeout(10000)
    // The pagination cap is 500 so check for more
    const limit = 501
    const customers: GoCardless.Customer[] = await getGoCardlessPaginatedList('customers', { limit })
    expect(customers).toBeInstanceOf(Array)
    expect(customers).toHaveLength(limit)
    // Ensure there's no overlap between the pages by checking for unique values
    expect(Array.from(new Set(customers.map(c => c.id)))).toHaveLength(limit)
  })
})

describe('GoCardless webhook receiver', () => {
  beforeEach(async function() { 
    this.timeout(10000)
    await devServer.setup()
  })

  afterEach(async function() {
    await devServer.teardown()
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

  // it('It stores the events in the database', async () => {
  //   await supertest(devServer.config.app)
  //     .post('/webhooks/gocardless')
  //     .send(webhookRequest.body)
  //     .set('content-type', webhookRequest.headers['content-type'])
  //     .set('webhook-signature', webhookRequest.headers['webhook-signature'])

  //   const events = await db.select<GoCardless.Event[]>('*').from('events').where('id', 'in', webhookRequest.body.events.map(e => e.id))
  //   expect(events.length).toEqual(webhookRequest.body.events.length)
  // })

  it('Gets relevant gocardless data for a known customer', async function () {
    const id = "CU000STHXDH55S"
    const lastKnownPaymentDate = "2020-06-02"
    const { last_payment_date, ...data } = await getPayAndSubscriptionDataFromGoCardlessCustomer(id)
    expect(data).toMatchObject({
      first_payment_date: "2020-05-01",
      gocardless_status: "active",
      gocardless_url: getCustomerUrl(id),
      // gocardless_id: id,
      // number_of_payments: expect.any([]),
      gocardless_subscription_name: "UVW membership (gross monthly salary above £1,101)",
      // gocardless_subscription_id: "SB000940CGEJVF",
    })
    expect(data.number_of_payments).toBeGreaterThanOrEqual(2)
    expect(
      new Date(last_payment_date).getTime() - new Date(lastKnownPaymentDate).getTime()
    ).toBeGreaterThanOrEqual(0)
  })

  // it('Matches zetkin members to gocardless customers', async function () {
  //   this.timeout(100000)
  //   const { customers } = await gocardless.customers.list({
  //     limit: "2",
  //     created_at: {
  //       lt: new Date(Date.now() - (1000 * 60 * 60 * 24 * 100)).toISOString()
  //     }
  //   })
  //   for (let customer of customers) {
  //     const member = await getOrCreateZetkinPersonByGoCardlessCustomer(customer)
  //     console.log(member.id)
  //     const { customFields, tags, ...memberFields } = await mapGoCardlessCustomerToZetkinMember(customer)
  //     expect(Object.values(member)).toEqual(expect.arrayContaining(Object.values(memberFields).filter(Boolean)))
  //     const actualCustomFields = await getZetkinCustomData(member.id)
  //     expect(
  //       Object.values(actualCustomFields.map(a => a.value))
  //     ).toEqual(
  //       expect.arrayContaining(
  //         Object.values(customFields)
  //           .filter(Boolean)
  //           .map(String)
  //         )
  //     )
  //     const actualTags = await getZetkinMemberTags(member.id)
  //     expect(actualTags.map(t => t.id)).toEqual(expect.arrayContaining(tags))
  //   }
  // })
})