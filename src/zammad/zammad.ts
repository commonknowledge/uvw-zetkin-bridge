import * as Express from 'express'
import * as fetch from 'node-fetch'
import { merge } from 'lodash'
import * as path from 'path';
import { getRelevantZammadDataFromZetkinUser, getOrCreateZetkinPersonByZammadUser, mapZammadCustomerToZetkinMember } from './zetkin-sync';
import { getRelevantZetkinDataFromGoCardlessCustomer, findGoCardlessCustomersBy } from '../gocardless/gocardless';
import db from "../db"
import * as GoCardless from 'gocardless-nodejs';
import queryString from 'query-string'
import { alternativeNumberFormats } from '../zetkin/zetkin';

type URLType = fetch.RequestInfo | (string|number)[]
type RequestOpts = (fetch.RequestInit & { query?: queryString.ParsedQuery<string> })

export class Zammad {
  constructor (
    private baseUri: string,
    private userName: string,
    private password: string,
    private version = 1
  ) {}

  async fetch <D = any>(url: URLType, { query, ...init }: RequestOpts = {}): Promise<D> {
    const apiEndpoint = `/api/v${this.version}`

    const endpoint = queryString.stringifyUrl({
      url: (
        typeof url === 'string'
          ? url.includes('http')
          ? url
          : new URL(path.join(apiEndpoint, url), this.baseUri)
          : Array.isArray(url)
          ? new URL(path.join(apiEndpoint, ...url.map(String)), this.baseUri)
          : url
      ).toString(),
      query
    })

    const options = merge(
      init,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${this.userName}:${this.password}`).toString('base64')}`
        }
      }
    )

    const data = await fetch.default(
      endpoint,
      options
    )

    const res = await data.text()

    try {
      const data = JSON.parse(res)
      if (data?.error !== undefined) {
        throw new Error(data.error)
      }
      return data
    } catch (e) {
      console.error('Data', res)
      console.error('Error', e)
      throw e
    }
  }

  async get <D>(url: URLType, init: RequestOpts = {}) {
    return this.fetch<D>(url, { ...init, method: 'GET' })
  }

  async post <D>(url: URLType, init: Omit<RequestOpts, 'body'> & { body?: any } = {}) {
    return this.fetch<D>(url, { ...init, body: init?.body ? JSON.stringify(init.body) : undefined, method: 'POST' })
  }

  async patch <D>(url: URLType, init: Omit<RequestOpts, 'body'> & { body?: any } = {}) {
    return this.fetch<D>(url, { ...init, body: init?.body ? JSON.stringify(init.body) : undefined, method: 'PATCH' })
  }

  async put <D>(url: URLType, init: Omit<RequestOpts, 'body'> & { body?: any } = {}) {
    return this.fetch<D>(url, { ...init, body: init?.body ? JSON.stringify(init.body) : undefined, method: 'PUT' })
  }

  async delete <D>(url: URLType, init: RequestOpts = {}) {
    return this.fetch<D>(url, { ...init, method: 'DELETE' })
  }
}

export const zammad = new Zammad(
  process.env.ZAMMAD_BASE_URL,
  process.env.ZAMMAD_ADMIN_USERNAME,
  process.env.ZAMMAD_ADMIN_PASSWORD,
)

let USER_CACHE: ZammadUser[] = []

setInterval(() => {
  USER_CACHE = []
}, 9 * 60 * 1000)

export const getAllUsers = async (limit: number = 100000): Promise<ZammadUser[]> => {
  let d: ZammadUser[] = []
  let last: ZammadUser[] = []
  let page = 0
  try {
    do {
      page++
      const query = { page: page.toString(), per_page: '500' }
      last = await zammad.get<ZammadUser[]>('users', { query })
      d = d.concat(last?.slice(0, limit - d.length) || []) // Top up to limit
    } while (!!last?.length && last.length > 0 && (limit ? d.length < limit : true))
    return d
  } catch(e) {
    console.error(last)
    throw e
  }
}

export const searchZammadUsers = async (
  query: Partial<ZammadUser>
) => {
  const { email, phone, mobile } = query
  if (!USER_CACHE || USER_CACHE.length === 0) {
    // @ts-ignore
    USER_CACHE = await getAllUsers()
  }
  const filtered = USER_CACHE.filter(d => {
    if (email) {
      return d.email === email
    }

    if (phone) {
      const p = alternativeNumberFormats(phone).e164
      if (alternativeNumberFormats(d.phone).e164 === p || alternativeNumberFormats(d.mobile).e164 === p) return true
    }

    if (mobile) {
      const p = alternativeNumberFormats(phone).e164
      if (alternativeNumberFormats(d.phone).e164 === p || alternativeNumberFormats(d.mobile).e164 === p) return true
    }

    return false
  })

  return filtered
}

export const createZammadUser = async (body: Partial<ZammadUser>) => {
  return zammad.post<ZammadUser>('users', { body })
}

export const updateZammadUser = async (userId: any, { id, ...body }: Partial<ZammadUser>) => {
  return await zammad.put<ZammadUser>(['users', userId], { body })
}

export const upsertZammadUser = async (body: Partial<ZammadUser>) => {
  console.log('Upsert data', JSON.stringify(body))
  const data = await searchZammadUsers(body)
  let res
  if (data.length) {
    console.log('User already exists, so updating instead.', data.length)
    res = await updateZammadUser(data[0].id, body)
  } else {
    res = await createZammadUser(body)
  }
  console.log('Final data', JSON.stringify(res))
  return res
}

export const deleteZammadUser = async (id: any) => {
  return await zammad.delete<ZammadUser>(['users', id])
}

export const deactivateZammadUser = async (id: any) => {
  // You can't often delete users so just make them inactive instead
  return await updateZammadUser(id, { active: false })
}

const sample = ({ email, phone, firstname, lastname, login, id }: Partial<ZammadUser>) => {
  return JSON.stringify({
    id,
    email,
    phone,
    firstname,
    lastname,
    login,
  })
}

export const handleZammadWebhook = async (
  req: Express.Request<any>,
  res: Express.Response<any>
) => {
  console.log("Received Zammad webhook")
  // Respond to Zammad
  if (req.headers["user-agent"] !== 'Zammad User Agent' || !req.body) {
    return res.status(400).send() 
  }

  try {
    // Attach Zetkin user if necessary
    const { ticketId } = await parseZammadWebhookBody(req.body)
    const ticket = await zammad.get<ZammadTicket>(['tickets', ticketId])
    const customer = await zammad.get<ZammadUser>(['users', ticket?.customer_id])
    if (!customer) {
      return
    }

    // TODO: Sync data back to Zetkin
    // if (customer.zetkin_member_number) {
    //    ...
    // }

    // const matchingZetkinMember = await getOrCreateZetkinPersonByZammadUser(customer)
    // const data = await getRelevantZammadDataFromZetkinUser(matchingZetkinMember)
    // if (!data) return

    let gocardlessCustomerId = customer.gocardless_customer_number

    if (!gocardlessCustomerId) {
      const gocardlessCustomers = await findGoCardlessCustomersBy({
        email: customer.email,
        phone_number: customer.phone,
      })

      gocardlessCustomerId = gocardlessCustomers?.[0]?.id
    }

    if (gocardlessCustomerId) {
      const gocardlessData = await getRelevantZetkinDataFromGoCardlessCustomer(gocardlessCustomerId)

      await updateZammadUser(
        customer.id,
        gocardlessData
      )
    }
  } catch (e) {

  } finally {
    res.status(204).send()
  }
}

export const getTicketIdFromWebhookText = (text: string): number | null => {
  const ticketIdRegex = /zammad\.com\/#ticket\/zoom\/(?<ticketId>[0-9]{1,10})/gm
  const matches = ticketIdRegex.exec(text)
  const ticketId = parseInt(matches?.groups?.ticketId)
  return ticketId
}

export const parseZammadWebhookBody = async (body: { payload: ZammadWebhook } | any) => {
  const webhook = JSON.parse(body.payload as any)
  const ticketId = getTicketIdFromWebhookText(webhook?.attachments[0]?.text)
  return { ticketId }
}

export interface ZammadWebhook {
  channel:     string;
  username:    string;
  icon_url:    string;
  mrkdwn:      boolean;
  text:        string;
  attachments: Attachment[];
}

export interface Attachment {
  text:      string;
  mrkdwn_in: string[];
  color:     string;
}

export interface ZammadTicket {
  id:                           number;
  group_id:                     number;
  priority_id:                  number;
  state_id:                     number;
  organization_id:              null;
  number:                       string;
  title:                        string;
  owner_id:                     number;
  customer_id:                  number;
  note:                         null;
  first_response_at:            null;
  first_response_escalation_at: Date;
  first_response_in_min:        null;
  first_response_diff_in_min:   null;
  close_at:                     null;
  close_escalation_at:          null;
  close_in_min:                 null;
  close_diff_in_min:            null;
  update_escalation_at:         null;
  update_in_min:                number;
  update_diff_in_min:           null;
  last_contact_at:              Date;
  last_contact_agent_at:        null;
  last_contact_customer_at:     Date;
  last_owner_update_at:         Date;
  create_article_type_id:       number;
  create_article_sender_id:     number;
  article_count:                number;
  escalation_at:                Date;
  pending_time:                 null;
  type:                         null;
  time_unit:                    null;
  preferences:                  Preferences;
  updated_by_id:                number;
  created_by_id:                number;
  created_at:                   Date;
  updated_at:                   Date;
  employer:                     string;
  workplace:                    string;
  job_title:                    string;
  wage:                         string;
  work_hours:                   string;
  colleagues:                   null;
  acasdeadline:                 null;
}

export interface Preferences {
  escalation_calculation: EscalationCalculation;
}

export interface EscalationCalculation {
  first_response_at:   null;
  last_update_at:      Date;
  close_at:            null;
  sla_id:              number;
  sla_updated_at:      Date;
  calendar_id:         number;
  calendar_updated_at: Date;
  escalation_disabled: boolean;
}

export interface ZammadUser {
  id:                           number;
  organization_id:              null;
  login:                        string;
  firstname:                    string;
  lastname:                     string;
  email:                        string;
  image:                        string;
  image_source:                 null;
  web:                          string;
  phone:                        string;
  fax:                          string;
  mobile:                       string;
  department:                   string;
  street:                       string;
  zip:                          string;
  city:                         string;
  country:                      string;
  address:                      string;
  vip:                          boolean;
  verified:                     boolean;
  active:                       boolean;
  note:                         string;
  last_login:                   Date;
  source:                       null;
  login_failed:                 number;
  out_of_office:                boolean;
  out_of_office_start_at:       null;
  out_of_office_end_at:         null;
  out_of_office_replacement_id: null;
  preferences:                  Preferences;
  updated_by_id:                number;
  created_by_id:                number;
  created_at:                   Date;
  updated_at:                   Date;
  zetkin_member_number:         string | null;
  gocardless_customer_number:   string | null;
  zetkin_url: string | null;
  gocardless_url: string | null
  gocardless_status: string | null
  gocardless_subscription: string | null
  first_payment_date: string | null
  last_payment_date: string | null
  role_ids:                     number[];
  organization_ids:             any[];
  authorization_ids:            any[];
  group_ids:                    GroupIDS;
}

export interface GroupIDS {
  "1": string[];
}

export interface Preferences {
  notification_config: NotificationConfig;
  locale:              string;
  intro:               boolean;
  chat:                Chat;
  tickets_closed:      number;
  tickets_open:        number;
}

export interface Chat {
  active: Active;
}

export interface Active {
  "1": string;
}

export interface NotificationConfig {
  matrix: Matrix;
}

export interface Matrix {
  create:           Create;
  update:           Create;
  reminder_reached: Create;
  escalation:       Create;
}

export interface Create {
  criteria: Criteria;
  channel:  Channel;
}

export interface Channel {
  email:  boolean;
  online: boolean;
}

export interface Criteria {
  owned_by_me:     boolean;
  owned_by_nobody: boolean;
  no:              boolean;
}