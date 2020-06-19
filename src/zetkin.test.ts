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
import createServer from './server';
import ngrok from 'ngrok'
import * as url from 'url';
import fetch from 'node-fetch';
import { helloWorld } from './server';
import { wait } from './utils';

describe('Zetkin authenticator', async function () {
  let server
  const port = 4041
  let ngrokURL
  const app = createServer()
  const ngrokConfig = {
    protocol: process.env.ZETKIN_CLIENT_PROTOCOL, // http|tcp|tls, defaults to http
    addr: port,
    subdomain: process.env.ZETKIN_NGROK_DOMAIN.split('.')[0], // reserved tunnel name https://alex.ngrok.io
    authtoken: process.env.NGROK_TOKEN, // your authtoken from ngrok.com
    region: process.env.ZETKIN_NGROK_REGION as any || 'eu', // one of ngrok regions (us, eu, au, ap), defaults to us
  }

  before(async function() { 
    this.timeout(10000)
    server = app.listen(port)
    await wait(1500)
    ngrokURL = await ngrok.connect(ngrokConfig);
  })
  
  it('Should have a running dev server', async function () {
    const res = await fetch(url.format({ protocol: 'http', hostname: 'localhost', port }))
    const body = await res.json()
    expect(body).toEqual(helloWorld)
  })

  it('Should automatically login on request', async function () {
    this.timeout(25000)
    this.retries(3)
    await spoofLogin()
    await wait(2000)
    const tokens = await getValidTokens()
    console.log(tokens)
    expect(tokens.length).toBeGreaterThan(0)
  })

  it('Should automatically upgrade on request', async function () {
    this.timeout(25000)
    this.retries(3)
    await spoofUpgrade()
  })

  it('Should get the required custom fields from Zetkin', async function () {
    this.timeout(60000)
    const client = await getZetkinInstance()
    const {data} = await aggressivelyRetry(async () =>
      client.resource('orgs', process.env.ZETKIN_ORG_ID, 'people', 'fields').get()
    )
    expect(data).toEqual(expectedCustomFields)
  })

  after(async function() {
    // @ts-ignore
    await server.close()
    await ngrok.disconnect();
  })
})