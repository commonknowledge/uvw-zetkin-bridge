import expect from 'expect'
import supertest from 'supertest'
import createServer from './server'
import { parseZammadWebhookBody } from './zammad';
const app = createServer()

// This data might change as the data relies on Zammad itself.
// In future, mock Zammad API calls.
const exampleWebhooks = {
  // 
  "Add private note to ticket": {
    headers:
    {
      'user-agent': 'Zammad User Agent',
      'accept-encoding': 'gzip;q=1.0,deflate;q=0.6,identity;q=0.3',
      accept: '*/*',
      host: 'commonknowledge.eu.ngrok.io',
      'content-type': 'application/x-www-form-urlencoded',
      connection: 'close',
      'content-length': '561',
      'x-forwarded-for': '2a01:4f8:171:2063::2'
    },
    body: {
      payload:
        '{"channel":"","username":"","icon_url":"https://zammad.com/assets/images/logo-200x200.png","mrkdwn":true,"text":"# New ticket","attachments":[{"text":"_\\u003chttps://test-common-knowledge.zammad.com/#ticket/zoom/37|Ticket#202006175900097\\u003e: Updated by Jan Baykara at 17/06/2020 16:50 (Europe/London)_\\n\\n\\n\\nAdd private note to ticket","mrkdwn_in":["text"],"color":"#faab00"}]}'
    },
    metadata: {
      ticket: {
        "id": 37,
        "number": "202006175900097",
        "title": "New ticket",
        "owner_id": 7,
        "customer_id": 12,
      }
    }
  }
  ,
  "Reply to email": {
    headers:
    {
      'user-agent': 'Zammad User Agent',
      'accept-encoding': 'gzip;q=1.0,deflate;q=0.6,identity;q=0.3',
      accept: '*/*',
      host: 'commonknowledge.eu.ngrok.io',
      'content-type': 'application/x-www-form-urlencoded',
      connection: 'close',
      'content-length': '719',
      'x-forwarded-for': '2a01:4f8:171:2063::2'
    },
    body: {
      payload:
        '{"channel":"","username":"","icon_url":"https://zammad.com/assets/images/logo-200x200.png","mrkdwn":true,"text":"# New ticket","attachments":[{"text":"_\\u003chttps://test-common-knowledge.zammad.com/#ticket/zoom/37|Ticket#202006175900097\\u003e: Updated by Jan Baykara at 17/06/2020 16:50 (Europe/London)_\\n\\n\\n\\nReply to email\\n\\n—\\n\\nJan Baykara\\n\\nUnited Voices of the World\\n[1] https://www.uvwunion.org.uk/\\n\\n[1] https://www.uvwunion.org.uk/","mrkdwn_in":["text"],"color":"#faab00"}]}'
    },
    metadata: {
      ticket: {
        "id": 37,
        "number": "202006175900097",
        "title": "New ticket",
        "owner_id": 7,
        "customer_id": 12,
      }
    }
  }
  ,
  "Update ticket metadata": {
    headers:
    {
      'user-agent': 'Zammad User Agent',
      'accept-encoding': 'gzip;q=1.0,deflate;q=0.6,identity;q=0.3',
      accept: '*/*',
      host: 'commonknowledge.eu.ngrok.io',
      'content-type': 'application/x-www-form-urlencoded',
      connection: 'close',
      'content-length': '579',
      'x-forwarded-for': '2a01:4f8:171:2063::2'
    },
    body: {
      payload:
        '{"channel":"","username":"","icon_url":"https://zammad.com/assets/images/logo-200x200.png","mrkdwn":true,"text":"# New ticket","attachments":[{"text":"_\\u003chttps://test-common-knowledge.zammad.com/#ticket/zoom/37|Ticket#202006175900097\\u003e: Updated by Jan Baykara at 17/06/2020 16:51 (Europe/London)_\\n\\n  \\n  * Job title:  -\\u003e Add details to Job","mrkdwn_in":["text"],"color":"#faab00"}]}'
    },
    metadata: {
      ticket: {
        "id": 37,
        "number": "202006175900097",
        "title": "New ticket",
        "owner_id": 7,
        "customer_id": 12,
      }
    }
  }
  ,
  "Change ticket state to closed": {
    headers:
    {
      'user-agent': 'Zammad User Agent',
      'accept-encoding': 'gzip;q=1.0,deflate;q=0.6,identity;q=0.3',
      accept: '*/*',
      host: 'commonknowledge.eu.ngrok.io',
      'content-type': 'application/x-www-form-urlencoded',
      connection: 'close',
      'content-length': '567',
      'x-forwarded-for': '2a01:4f8:171:2063::2'
    },
    body: {
      payload:
        '{"channel":"","username":"","icon_url":"https://zammad.com/assets/images/logo-200x200.png","mrkdwn":true,"text":"# New ticket","attachments":[{"text":"_\\u003chttps://test-common-knowledge.zammad.com/#ticket/zoom/37|Ticket#202006175900097\\u003e: Updated by Jan Baykara at 17/06/2020 16:53 (Europe/London)_\\n\\n  \\n  * State: open -\\u003e closed","mrkdwn_in":["text"],"color":"#38ad69"}]}'
    },
    metadata: {
      ticket: {
        "id": 37,
        "number": "202006175900097",
        "title": "New ticket",
        "owner_id": 7,
        "customer_id": 12,
      }
    }
  }
  ,
  "Create new ticket": {
    headers:
    {
      'user-agent': 'Zammad User Agent',
      'accept-encoding': 'gzip;q=1.0,deflate;q=0.6,identity;q=0.3',
      accept: '*/*',
      host: 'commonknowledge.eu.ngrok.io',
      'content-type': 'application/x-www-form-urlencoded',
      connection: 'close',
      'content-length': '622',
      'x-forwarded-for': '2a01:4f8:171:2063::2'
    },
    body: {
      payload:
        '{"channel":"","username":"","icon_url":"https://zammad.com/assets/images/logo-200x200.png","mrkdwn":true,"text":"# New ticket","attachments":[{"text":"_\\u003chttps://test-common-knowledge.zammad.com/#ticket/zoom/38|Ticket#202006175900104\\u003e: Created by Jan Baykara at 17/06/2020 16:54 (Europe/London)_\\n* Group: Membership\\n* Owner: Jan Baykara\\n* State: open\\n\\n\\nNew ticket created!","mrkdwn_in":["text"],"color":"#faab00"}]}'
    },
    metadata: {
      ticket: {
        "id": 38,
        "number": "202006175900104",
        "title": "New ticket",
        "customer_id": 7,
        "owner_id": 7,
      }
    }
  }
}

describe('gocardless webhook receiver', () => {
  it('Returns a 204 response if the request is valid', async () => {
    const fixture = exampleWebhooks["Create new ticket"]
    await supertest(app)
      .post('/webhooks/zammad')
      .send(fixture)
      .set('user-agent', fixture.headers['user-agent'])
      .expect(204)
  })

  it('Returns a 400 response if the request is invalid', async () => {
    const fixture = exampleWebhooks["Create new ticket"]
    await supertest(app)
      .post('/webhooks/zammad')
      .send(fixture)
      .set('user-agent', fixture.headers['user-agent'] + 'blah')
      .expect(400)
  })

  it('Get the ticket metadata for a webhook payload', async () => {
    const fixture = exampleWebhooks["Create new ticket"]
    const parsedData = await parseZammadWebhookBody(fixture.body as any)
    expect(parsedData.ticket?.id).toEqual(fixture.metadata.ticket.id)
    expect(parsedData.ticket?.number).toEqual(fixture.metadata.ticket.number)
    expect(parsedData.ticket?.customer_id).toEqual(fixture.metadata.ticket.customer_id)
  })

  it("Zammad has a `number` property for customers' Zetkin ID", async () => {
    const fixture = exampleWebhooks["Create new ticket"]
    const parsedData = await parseZammadWebhookBody(fixture.body as any)
    expect(parsedData.customer?.number).toBeDefined()
  })
})