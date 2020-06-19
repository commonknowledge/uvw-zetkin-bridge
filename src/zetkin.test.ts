const expectedCustomFields = {
  "data": [
      {
          "type": "text",
          "description": "",
          "title": "Zammad URL",
          "slug": "zammad_url",
          "id": 15
      },
      {
          "type": "text",
          "description": "",
          "title": "Zammad ID",
          "slug": "zammad_id",
          "id": 14
      },
      {
          "type": "text",
          "description": "",
          "title": "Origin",
          "slug": "origin",
          "id": 13
      },
      {
          "type": "text",
          "description": "",
          "title": "Workplace address",
          "slug": "workplace_address",
          "id": 12
      },
      {
          "type": "text",
          "description": "",
          "title": "Workplace postcode",
          "slug": "workplace_postcode",
          "id": 11
      },
      {
          "type": "text",
          "description": "",
          "title": "Employer postcode",
          "slug": "employer_postcode",
          "id": 10
      },
      {
          "type": "text",
          "description": "",
          "title": "Employer address",
          "slug": "employer_address",
          "id": 9
      },
      {
          "type": "text",
          "description": "",
          "title": "Employer",
          "slug": "employer",
          "id": 8
      },
      {
          "type": "text",
          "description": "",
          "title": "Job title",
          "slug": "job_title",
          "id": 7
      },
      {
          "type": "text",
          "description": "",
          "title": "GoCardless subscription",
          "slug": "gocardless_subscription",
          "id": 6
      },
      {
          "type": "url",
          "description": "",
          "title": "GoCardless customer link",
          "slug": "gocardless_url",
          "id": 5
      },
      {
          "type": "text",
          "description": "",
          "title": "GoCardless customer ID",
          "slug": "gocardless_id",
          "id": 4
      },
      {
          "type": "text",
          "description": "",
          "title": "Dues subscription status",
          "slug": "gocardless_status",
          "id": 3
      },
      {
          "type": "date",
          "description": "",
          "title": "Last payment date",
          "slug": "last_payment_date",
          "id": 2
      },
      {
          "type": "date",
          "description": "",
          "title": "First payment date",
          "slug": "first_payment_date",
          "id": 1
      }
  ]
}

import expect from 'expect'
import { getZetkinInstance, getValidToken, getValidTokens, aggressivelyRetry } from './auth';
import { spoofLogin, spoofUpgrade } from './zetkin-spoof';
import { wait } from './utils';
import { DevServer } from './dev.test';
const devServer = new DevServer()

describe('Zetkin authenticator', async function () {
  beforeEach(async function() { 
    this.timeout(10000)
    await devServer.setup()
  })

  afterEach(async function() {
    await devServer.teardown()
  })

  it('Should automatically login and upgrade on request', async function () {
    this.timeout(25000)
    this.retries(3)
    await spoofLogin()
    await wait(2000)
    const tokens = await getValidTokens()
    expect(tokens.length).toBeGreaterThan(0)
    await spoofUpgrade()
  })

  it('Should get the required custom fields from Zetkin', async function () {
    this.timeout(60000)
    const {data} = await aggressivelyRetry(async (client) =>
      client.resource('orgs', process.env.ZETKIN_ORG_ID, 'people', 'fields').get()
    )
    expect(data).toEqual(expectedCustomFields)
  })
})