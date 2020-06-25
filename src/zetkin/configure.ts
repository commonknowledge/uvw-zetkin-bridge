import { aggressivelyRetry } from './auth';

export const expectedCustomFields = [
    {
        "slug": "number_of_payments",
        "title": "Number of Payments",
        "id": 18,
        "type": "text",
        "description": ""
    },
    {
        "slug": "gocardless_subscription_id",
        "title": "GoCardless Subscription ID",
        "id": 17,
        "type": "text",
        "description": ""
    },
    {
        "slug": "gocardless_subscription_name",
        "title": "GoCardless Subscription",
        "id": 16,
        "type": "text",
        "description": ""
    },
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
        "slug": "gocardless_subscription",
        "title": "GoCardless subscription",
        "id": 6,
        "type": "text",
        "description": ""
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

export const createFields = async () => {
  return Promise.all(
    expectedCustomFields.map(field =>
      aggressivelyRetry(client =>
        client
          .resource('orgs', process.env.ZETKIN_ORG_ID, 'people', 'fields', field)
          .post({
            'title': field.title,
            'slug': field.slug,
            'type': field.type
          })
      )
    )
  )
}

export const TAGS = {
  CREATED_BY_GOCARDLESS: 'Created by: GoCardless',
  CREATED_BY_ZAMMAD: 'Created by: Zammad'
}

export const expectedTags = [
  TAGS.CREATED_BY_GOCARDLESS,
  TAGS.CREATED_BY_ZAMMAD,
  'Pay status: pending_customer_approval',
  'Pay status: customer_approval_denied',
  'Pay status: active',
  'Pay status: finished',
  'Pay status: cancelled',
  'Pay status: paused',
  'Pay plan: Solidarity Network (£100)',
  'Pay plan: Solidarity Network (£50)',
  'Pay plan: Solidarity Network (£30)',
  'Pay plan: Solidarity Network (£20)',
  'Pay plan: Solidarity Network (£15)',
  'Pay plan: Solidarity Network (£12)',
  'Pay plan: Solidarity Network (£10)',
  'Pay plan: Solidarity Network (£3)',
  'Pay plan: Monthly Supporter (£10)',
  'Pay plan: membership (gross monthly salary above £1,101)',
  'Pay plan: membership (gross monthly salary £701–£1,100)',
  'Pay plan: membership (gross monthly salary up to £700)',
]

export const createTags = async () => {
  return Promise.all(
    expectedTags.map(tag =>
      aggressivelyRetry(client =>
        client
          .resource('orgs', process.env.ZETKIN_ORG_ID, 'people', 'tags')
          .post({
              "title": tag,
              "hidden": false,
              "description": ""
          })
      )
    )
  )
}

// yarn ts-node ./src/zetkin/configure.ts
//
// (async () => {
//   await createTags()
// })()