import expect from 'expect'
import supertest from 'supertest'
import { zammad, ZammadUser, ZammadTicket, getTicketIdFromWebhookText, updateZammadUser, parseZammadWebhookBody, searchZammadUsers, getAllUsers } from './zammad';
import { DevServer } from '../dev';
import { getRelevantZammadDataFromZetkinUser, getOrCreateZetkinPersonByZammadUser } from './zetkin-sync';
import { ZammadObjectProperty } from './types';
import { expectedProperties } from './configure';
import { wait } from '../utils';

// This data might change as the data relies on Zammad itself.
// In future, mock Zammad API calls.
const exampleWebhooks = {
  'IdentifyByEmail': {
    "url":"/webhooks/zammad",
    "headers":{"user-agent":"Zammad User Agent","accept-encoding":"gzip;q=1.0,deflate;q=0.6,identity;q=0.3","accept":"*/*","host":"commonknowledge.eu.ngrok.io","content-type":"application/x-www-form-urlencoded","connection":"close","content-length":"613","x-forwarded-proto":"https","x-forwarded-for":"2a01:4f8:10a:5d1::2"},
    "body":{"payload":"{\"channel\":\"\",\"username\":\"\",\"icon_url\":\"https://zammad.com/assets/images/logo-200x200.png\",\"mrkdwn\":true,\"text\":\"# TEST TICKET: Use email to identify a Zetkin member\",\"attachments\":[{\"text\":\"_\\u003chttps://uvw-union.zammad.com/#ticket/zoom/2|Ticket#92002\\u003e: Updated by Common Knowledge (United Voices of the World) at 24/06/2020 10:53 (Europe/London)_\\n\\n\\n\\nWebhook emitter test.\",\"mrkdwn_in\":[\"text\"],\"color\":\"#faab00\"}]}"},
    "metadata": {
      "ticket": {
        id: 2,
        number: "92002",
        customer_id: 4,
        title: "TEST TICKET: Use email to identify a Zetkin member"
      },
      user: {
        zetkin_member_number: 1046
      }
    }
  },
  'IdentifyByPhoneNumber': {
    "url":"/webhooks/zammad",
    "headers":{"user-agent":"Zammad User Agent","accept-encoding":"gzip;q=1.0,deflate;q=0.6,identity;q=0.3","accept":"*/*","host":"commonknowledge.eu.ngrok.io","content-type":"application/x-www-form-urlencoded","connection":"close","content-length":"661","x-forwarded-proto":"https","x-forwarded-for":"2a01:4f8:10a:5d1::2"},
    "body":{"payload":"{\"channel\":\"\",\"username\":\"\",\"icon_url\":\"https://zammad.com/assets/images/logo-200x200.png\",\"mrkdwn\":true,\"text\":\"# TEST TICKET: Use mobile to identify Zetkin member\",\"attachments\":[{\"text\":\"_\\u003chttps://uvw-union.zammad.com/#ticket/zoom/3|Ticket#92003\\u003e: Created by Common Knowledge (United Voices of the World) at 24/06/2020 11:11 (Europe/London)_\\n* Group: Caseworkers\\n* Owner: -\\n* State: open\\n\\n\\nTest webhook.\",\"mrkdwn_in\":[\"text\"],\"color\":\"#faab00\"}]}"},
    metadata: {
      ticket: {
        "id": 3,
        "number": "92003",
        "title": "TEST TICKET: Use mobile to identify Zetkin member",
        "customer_id": 5,
      },
      user: {
        zetkin_member_number: 1045
      }
    }
  }
}

const devServer = new DevServer()

describe('Zammad webhook receiver', () => {
  // before(async function() { 
  //   this.timeout(10000)
  //   await devServer.setup()
  //   await Promise.all(Object.values(exampleWebhooks).map(async w => {
  //     const userId = w.metadata.ticket.customer_id
  //     await updateZammadUser(userId, {
  //       zetkin_member_number: null
  //     })
  //   }))
  // })

  // after(async function() {
  //   await devServer.teardown()
  // })

  // it('Gets all users', async function () {
  //   this.timeout(60000)
  //   expect((await getAllUsers(501))).toHaveLength(501)
  // })

  it('Searches users by email', async function () {
    this.timeout(60000)
    expect(await searchZammadUsers({ email: 'gemma@commonknowledge.coop' })).toHaveLength(1)
  })

  it('Searches users by phone', async function () {
    this.timeout(60000)
    expect(await searchZammadUsers({ phone: '‭07727 327927‬' })).toHaveLength(1)
    expect(await searchZammadUsers({ phone: '‭07727327927‬' })).toHaveLength(1)
    expect(await searchZammadUsers({ phone: '‭+447727327927‬' })).toHaveLength(1)
  })

  it('No false positives', async function () {
    this.timeout(60000)
    expect(await searchZammadUsers({ email: 'gemma@commonknwledge.coop' })).toHaveLength(0)
  })
  
  // it('Returns a 204 response if the request is valid', async () => {
  //   const fixture = exampleWebhooks.IdentifyByEmail
  //   await supertest(devServer.config.app)
  //     .post('/webhooks/zammad')
  //     .send(fixture.body)
  //     .set('user-agent', fixture.headers['user-agent'])
  //     .expect(204)
  // })

  // it('Returns a 400 response if the request is invalid', async () => {
  //   const fixture = exampleWebhooks.IdentifyByEmail
  //   await supertest(devServer.config.app)
  //     .post('/webhooks/zammad')
  //     .send(fixture.body)
  //     .set('user-agent', fixture.headers['user-agent'] + 'blah')
  //     .expect(400)
  // })

  // it("Zammad can be queried", async function () {
  //   const result = await zammad.get<ZammadObjectProperty[]>('object_manager_attributes')
  //   expect(result).not.toHaveProperty('error')
  // })

  // it("Zammad customer has properties for Zetkin sync data", async function () {
  //   const currentProperties = await zammad.get<ZammadObjectProperty[]>('object_manager_attributes')
  //   const propertyNames = currentProperties.map(p => p.name)
  //   const expectedPropertyNames = expectedProperties.map(p => p.name)
  //   expect(propertyNames).toEqual(expect.arrayContaining(expectedPropertyNames))
  // })

  // it('Can parse webhooks and identify queryable objects', async function () {
  //   const fixture = exampleWebhooks.IdentifyByEmail
  //   const { ticketId } = await parseZammadWebhookBody(fixture.body)
  //   expect(ticketId).toEqual(fixture.metadata.ticket.id)
  // })

  // it("can use an EMAIL ADDRESS to match Zammad and Zetkin profiles", async function () {
  //   this.timeout(60000); 
  //   const fixture = exampleWebhooks.IdentifyByEmail
  //   const ticket = await zammad.get<ZammadTicket>(['tickets', fixture.metadata.ticket.id])
  //   const { id, email } = await zammad.get<ZammadUser>(['users', ticket.customer_id])
  //   const zetkinMember = await getOrCreateZetkinPersonByZammadUser({ id, email })
  //   expect(zetkinMember).toBeDefined()
  //   expect(zetkinMember.id).toEqual(fixture.metadata.user.zetkin_member_number)
  // })

  // it("can use a PHONE NUMBER to match Zammad and Zetkin profiles", async function () {
  //   this.timeout(60000); 
  //   const fixture = exampleWebhooks.IdentifyByPhoneNumber
  //   const ticket = await zammad.get<ZammadTicket>(['tickets', fixture.metadata.ticket.id])
  //   const { id, mobile } = await zammad.get<ZammadUser>(['users', ticket.customer_id])
  //   const relevantData = await getOrCreateZetkinPersonByZammadUser({ id, mobile })
  //   expect(relevantData).toBeDefined()
  //   expect(relevantData.id).toEqual(fixture.metadata.user.zetkin_member_number)
  // })

  // it("can sync Zetkin member data to Zammad", async function () {
  //   this.timeout(60000)
  //   const fixture = exampleWebhooks.IdentifyByEmail
  //   await supertest(devServer.config.app)
  //     .post('/webhooks/zammad')
  //     .send(fixture.body)
  //     .set('user-agent', fixture.headers['user-agent'])
  //   await wait(1000)
  //   const user = await zammad.get<ZammadUser>(['users', fixture.metadata.ticket.customer_id])
  //   expect(user).toBeDefined()
  //   expect(user.zetkin_member_number).toBeDefined()
  //   expect(user.zetkin_member_number).toEqual(String(fixture.metadata.user.zetkin_member_number))
  // })
})