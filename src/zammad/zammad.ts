import * as Express from 'express'
import * as fetch from 'node-fetch'
import { merge, chunk } from 'lodash'
import * as path from 'path';
import { getRelevantZammadDataFromZetkinUser, getOrCreateZetkinPersonByZammadUser, mapZammadCustomerToZetkinMember } from './zetkin-sync';
import { getPayAndSubscriptionDataFromGoCardlessCustomer, findGoCardlessCustomersBy } from '../gocardless/gocardless';
import db from "../db"
import * as GoCardless from 'gocardless-nodejs';
import * as queryString from 'query-string'
import { alternativeNumberFormats } from '../zetkin/zetkin';
import * as Sentry from '@sentry/node';
import { ZammadUserCacheItem, ZammadUserCache } from '../db';

if (
  !process.env.ZAMMAD_BASE_URL ||
  !process.env.ZAMMAD_ADMIN_USERNAME ||
  !process.env.ZAMMAD_ADMIN_PASSWORD
) {
  throw new Error("Missing Zammad environment variables")
}

type URLType = fetch.RequestInfo | (string|number)[]
type RequestOpts = (fetch.RequestInit & { query?: queryString.ParsedQuery<string> })

export class Zammad {
  constructor (
    private baseUri: string,
    private userName: string,
    private password: string,
    private version = 1
  ) {}

  async fetch <D = any, R = any>(url: URLType, { query, ...init }: RequestOpts = {}): Promise<D | undefined> {
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
      query: query || {}
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

    Sentry.addBreadcrumb({
      category: "httpRequest",
      message: "Making a request to Zammad",
      data: { endpoint, ...options }
    })

    const res = await fetch.default(
      endpoint,
      options
    )

    const data = await res.text()

    try {
      if (!data) return
      const payload = JSON.parse(data)
      if (payload?.error !== undefined) {
        Sentry.captureException(payload.error)
        throw new Error(payload.error)
      }
      return payload
    } catch (e) {
      console.error('ZammadData', data)
      console.error('ZammadError', e)
      throw e
    }
  }

  async get <D = any>(url: URLType, init: RequestOpts = {}) {
    return this.fetch<D>(url, { ...init, method: 'GET' })
  }

  async post <D = any, R = any>(url: URLType, init: Omit<RequestOpts, 'body'> & { body?: R } = {}) {
    return this.fetch<D, R>(url, { ...init, body: init?.body ? JSON.stringify(init.body) : undefined, method: 'POST' })
  }

  async patch <D = any, R = any>(url: URLType, init: Omit<RequestOpts, 'body'> & { body?: R } = {}) {
    return this.fetch<D, R>(url, { ...init, body: init?.body ? JSON.stringify(init.body) : undefined, method: 'PATCH' })
  }

  async put <D = any, R = any>(url: URLType, init: Omit<RequestOpts, 'body'> & { body?: R } = {}) {
    return this.fetch<D, R>(url, { ...init, body: init?.body ? JSON.stringify(init.body) : undefined, method: 'PUT' })
  }

  async delete <D = any>(url: URLType, init: RequestOpts = {}) {
    return this.fetch<D>(url, { ...init, method: 'DELETE' })
  }
}

export const zammad = new Zammad(
  process.env.ZAMMAD_BASE_URL,
  process.env.ZAMMAD_ADMIN_USERNAME,
  process.env.ZAMMAD_ADMIN_PASSWORD,
)

export const getAllUsersFromZammad = async (limit: number = 100000): Promise<ZammadUser[]> => {
  let d: ZammadUser[] = []
  let last: ZammadUser[] = []
  let page = 0
  try {
    do {
      page++
      const query = { page: page.toString(), per_page: '500' }
      last = (await zammad.get<ZammadUser[]>('users', { query })) || []
      d = d.concat(last?.slice(0, limit - d.length) || []) // Top up to limit
    } while (!!last?.length && last.length > 0 && (limit ? d.length < limit : true))
    return d
  } catch(e) {
    console.error(last)
    throw e
  }
}

let retries = 0

export const getAllCachedUsers = async () => {
  let res = await ZammadUserCache().select('*')
  if (res.length > 0) {
    console.log(`Zammad cache held ${res.length} entries`)
    return res.map(r => r.data)
  }

  console.log("No Zammad users present in database")
  // while (retries < 1) {
  //   // It may be that we just deployed
  //   // So try populating the database
  //   const users = await getAllUsersFromZammad()
  //   await saveUsersToDatabase(users)
  //   if (users.length > 0) {
  //     return users
  //   }
  //   retries++
  // }

  return []
}

export const searchZammadUsers = async (
  query: Partial<ZammadUser>
) => {
  const { email, phone, mobile } = query
  let USER_CACHE: ZammadUser[] = await getAllCachedUsers()
  const filtered = USER_CACHE.filter(d => {
    if (!d) return false

    if (email) {
      return d?.email === email
    }

    /**
     * The user can input phone numbers into two fields,
     * so we check both
     */

    if (phone) {
      const p = alternativeNumberFormats(phone).e164
      return (
        alternativeNumberFormats(d?.phone).e164 === p ||
        alternativeNumberFormats(d?.mobile).e164 === p
      )
    }

    if (mobile) {
      const p = alternativeNumberFormats(mobile).e164
      return (
        alternativeNumberFormats(d?.phone).e164 === p ||
        alternativeNumberFormats(d?.mobile).e164 === p
      )
    }

    return false
  })

  return filtered
}

export const searchZammadUsersWithRefinements = async (
  q: Partial<ZammadUser>,
  refinements: Array<Array<keyof ZammadUser>>
) => {
  let members: ZammadUser[] = []
  let round = 0
  while (
    // Searching for members
    members.length === 0 ||
    // Still too many
    members.length > 1 && (
      // There's another level of refinements still to go
      ((round - 1) > refinements.length)
    )
  ) {
    // @ts-ignore
    const keysToSearch = refinements.reduce((keys, nextRoundKeys, nextRoundIndex) => {
      if (nextRoundIndex > round) return keys
      return keys.concat(nextRoundKeys)
    }, [])
    // console.log("Searching for users", members.length, keysToSearch)
    members = await searchZammadUsers(objectWithKeys(q, keysToSearch))
    round++
    if (round >= refinements.length) return members
  }
  return members
}

const objectWithKeys = <
  T extends { [key: string]: any },
  K extends keyof T
>(
  q: T,
  keys: Array<K>
) => {
  return Object.entries<T>(q)
    .filter(([key]) => keys.includes(key as any))
    .reduce<Partial<Pick<T, K>>>(
      (dict, [key, value]) => ({ ...dict, [key]: value }),
      {}
    )
}

export const createZammadUser = async (body: Partial<ZammadUser>) => {
  const data = await zammad.post<ZammadUser>('users', { body })
  if (!data) throw new Error("Failed to create user. Nothing returned.")
  try {
    await ZammadUserCache().insert({ id: data.id, data })
  } catch (e) {
    Sentry.captureException(e)
  }
  return data
}

export const updateZammadUser = async (userId: any, { id, ...body }: Partial<ZammadUser>) => {
  const data = await zammad.put<ZammadUser>(['users', userId], { body })
  if (!data) throw new Error("Failed to update user. Nothing returned.")
  try {
    await ZammadUserCache().insert({ id: data.id, data })
  } catch (e) {
    Sentry.captureException(e)
  }
  return data
}

export const upsertZammadUser = async (body: Partial<ZammadUser>) => {
  // console.log('Upsert data', JSON.stringify(body))
  const data = await searchZammadUsersWithRefinements(body, [['email', 'phone'], ['firstname', 'lastname']])
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

export const deleteZammadUser = async (id: number) => {
  try {
    await ZammadUserCache().where({ id }).delete()
  } catch (e) {
    Sentry.captureException(e)
  }
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
    if (!ticketId) throw new Error("Couldn't identify ticket")
    const ticket = await zammad.get<ZammadTicket>(['tickets', ticketId])
    if (!ticket) return
    const customer = await zammad.get<ZammadUser>(['users', ticket?.customer_id])
    if (!customer) return

    // TODO: Sync data back to Zetkin
    // if (customer.zetkin_member_number) {
    //    ...
    // }

    // const matchingZetkinMember = await getOrCreateZetkinPersonByZammadUser(customer)
    // const data = await getRelevantZammadDataFromZetkinUser(matchingZetkinMember)
    // if (!data) return

    let gocardlessCustomerId = customer.gocardless_id

    if (!gocardlessCustomerId) {
      const gocardlessCustomers = await findGoCardlessCustomersBy({
        email: customer.email,
        phone_number: customer.phone,
      })

      gocardlessCustomerId = gocardlessCustomers?.[0]?.id
    }

    if (gocardlessCustomerId) {
      const gocardlessData = await getPayAndSubscriptionDataFromGoCardlessCustomer(gocardlessCustomerId)

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
  const ticketId = matches?.groups?.ticketId
  if (!ticketId) return null
  return parseInt(ticketId)
}

export const parseZammadWebhookBody = async (body: { payload: ZammadWebhook } | any) => {
  const webhook = JSON.parse(body.payload as any)
  const ticketId = getTicketIdFromWebhookText(webhook?.attachments[0]?.text)
  return { ticketId }
}

const mapCustomerToDatabase = (user: ZammadUser): Partial<ZammadUserCacheItem> => {
  return {
    id: user.id,
    data: user
  }
}

export const saveUsersToDatabase = async (customers: ZammadUser[]) => {
  const cached = await ZammadUserCache().select('*')
  const cachedIds = cached.map(c => c.id)

  /**
   * Insert new records
   */

  const customersToAdd = customers.filter(d => !cachedIds.includes(d.id))

  for (const cs of chunk(customersToAdd, 250)) {
    await ZammadUserCache()
      .insert(cs.map(mapCustomerToDatabase))
  }

  /**
   * Update existing records
   */

  const customersToUpdate = customers.filter(d => cachedIds.includes(d.id))

  // https://stackoverflow.com/a/48069213/1053937
  await db.transaction(trx => {
    const queries = [];

    for (const customer of customersToUpdate) {
      const newData = mapCustomerToDatabase(customer)
      const query = ZammadUserCache()
        .update(newData)
        .where({ id: customer.id })
        .transacting(trx) // This makes every update be in the same transaction
      queries.push(query)
    }

    return Promise.all(queries) // Once every query is written
        .then(trx.commit) // We try to execute all of them
        .catch(trx.rollback); // And rollback in case any of them goes wrong
  });

  return customers
}

export interface Tag {
  id: number
  value: string
}

export type ObjectType = "Ticket"

export const getTagsFor = async (object: ObjectType, o_id: any): Promise<string[] | undefined> => {
  const res = await zammad.get('/tags', {
    query: {
      object,
      o_id
    }
  })
  return res?.tags || undefined
}

export const getTags = async (): Promise<Tag[] | undefined> => {
  const list = await zammad.get<{ id: number, name: string }[]>('tag_list')
  return list?.map(tag => ({ id: tag.id, value: tag.name }))
}

export const getTag = async (term: string): Promise<Tag | undefined> => {
  const list = await getTags()
  return list?.find(tag => tag.value === term)
}

export const createTags = async (_names: string[]): Promise<boolean[]> => {
  const names = Array.isArray(_names) ? _names : [_names]
  const tags: boolean[] = []
  for (const name of names) {
    tags.push(!!(await zammad.post('tag_list', {
      body: { name }
    })))
  }
  return tags
}

export const deleteTags = async (_ids: number[]) => {
  const ids = Array.isArray(_ids) ? _ids : [_ids]
  for (const id of ids) {
    await zammad.delete(['tag_list', id])
  }
}

export const getOrCreateTags = async (_names: string[]) => {
  const names = Array.isArray(_names) ? _names : [_names]
  const tags = []
  for (const name of names) {
    const tag = await getTag(name)
    if (tag) {
      tags.push(tag)
    } else {
      await createTags([name])
      const tag = await getTag(name) || false
      tags.push(tag)
    }
  }
  return tags
}

export const tagObject = async (object: ObjectType, o_id: any, _tags: string | string[], createIfRequired = true) => {
  const tags = Array.isArray(_tags) ? _tags : [_tags]
  if (createIfRequired) await getOrCreateTags(tags)
  for (const tag of tags) {
    zammad.get(['tags', 'add'], {
      query: {
        object,
        o_id,
        item: tag
      }
    })
  }
}

export const untagObject = async (object: ObjectType, o_id: any, _tags: string | string[]) => {
  const tags = Array.isArray(_tags) ? _tags : [_tags]
  for (const tag of tags) {
    zammad.get(['tags', 'remove'], {
      query: {
        object,
        o_id,
        item: tag
      }
    })
  }
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

export interface ZammadTicketPost extends Partial<ZammadTicket> {
  article: ZammadTicketArticle
}

export interface ZammadTicketArticle  {
  from?: string
   "ticket_id"?: number,
   "to"?: string
   "cc"?: string
   "subject"?: string
   "body"?: string
   "content_type"?: string
   "type"?: string
   "internal": boolean,
   "time_unit"?: string
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
  note:                         any;
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
  number_of_colleagues:         string
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
  gocardless_id:   string | null;
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
  language:                     string;
  gender:                       string;
  employer:                     string;
  // Nasty typo TODO: Fix in Zammad and update here
  workdplace_address:           string;
  number_of_colleagues:         string;
  workplace_zip:                string;
  job_title:                    string;
  number_of_payments:           number;
  workplace_phone:              string;
  workplace_email:              string;
  wage_salary:                  string;
  hours:                        string;
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