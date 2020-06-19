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
import { DevServer } from './dev';
import { createZetkinMember, ZetkinMemberGet, deleteZetkinMember, updateZetkinMemberCustomFields, findZetkinMemberByFilters, findZetkinMemberByQuery, getZetkinMemberById } from './zetkin';
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

describe('Zetkin CRUD operations', function () {
  const fixtures = {
    member: {
      first_name: "TEST",
      last_name: "TEST",
      email: "TEST@TESt.TEST",
      phone: "07704100000"
    },
    customFields: {
      gocardless_id: 1,
      gocardless_url: "https://commonknowledge.coop"
    },
    deleteCustomFields: undefined
  }

  fixtures.deleteCustomFields = {}
  Object.keys(fixtures.customFields).forEach(key => fixtures.deleteCustomFields[key] = null)

  let memberId: number

  before(async function() { 
    this.timeout(60000)
    await devServer.setup()
    // Don't allow the test to be tricked by previous tests!
    const members = await findZetkinMemberByFilters([
      ['email', '==', fixtures.member.email]
    ])
    for (const member of members) {
      await deleteZetkinMember(member.id)
    }
  })

  after(async function() {
    this.timeout(60000)
    await devServer.teardown()
  })

  it ('Should create a new member', async function () {
    this.timeout(60000)
    let member
    member = await createZetkinMember(fixtures.member)
    memberId = member.id
    expect(member.first_name).toEqual(fixtures.member.first_name)
  })

  it ('Find a member by ID', async function () {
    this.timeout(60000)
    if (!memberId) throw new Error('Badly setup test')
    const member = await getZetkinMemberById(memberId)
    expect(member.first_name).toEqual(fixtures.member.first_name)
  })

  it ('Find a member by query', async function () {
    this.timeout(60000)
    if (!memberId) throw new Error('Badly setup test')
    const members = await findZetkinMemberByQuery(fixtures.member.email)
    // @ts-ignore
    expect(members).toBeInstanceOf(Array)
    expect(members.length).toBeGreaterThan(0)
    expect(members[0].first_name).toEqual(fixtures.member.first_name)
  })

  it ('Find a member by filter', async function () {
    this.timeout(60000)
    if (!memberId) throw new Error('Badly setup test')
    const members = await findZetkinMemberByFilters([
      ['phone', '==', fixtures.member.phone]
    ])
    expect(members).toBeInstanceOf(Array)
    expect(members.length).toBeGreaterThan(0)
    expect(members[0]?.first_name).toEqual(fixtures.member.first_name)
  })

  it ('Adds and removes custom field values to a member', async function () {
    this.timeout(60000)
    if (!memberId) throw new Error('Badly setup test')
    const fields = await updateZetkinMemberCustomFields(memberId, fixtures.customFields)
    expect(fields).toEqual(Object.values(fixtures.customFields).map(String))
  })

  it ('Remove that custom field value from a member', async function () {
    this.timeout(60000)
    if (!memberId) throw new Error('Badly setup test')
    const fields = await updateZetkinMemberCustomFields(memberId, fixtures.deleteCustomFields)
    expect(fields).toBeDefined()
  })

  it ('Delete the new member', async function () {
    this.timeout(60000)
    if (!memberId) throw new Error('Badly setup test')
    await deleteZetkinMember(memberId)
    const members = await findZetkinMemberByFilters([
      ['phone', '==', fixtures.member.phone]
    ])
    expect(members.length).toEqual(0)
  })
})