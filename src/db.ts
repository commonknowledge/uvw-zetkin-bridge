import '../env'
import knex from 'knex'
import * as config from '../knexfile'
import { ZammadUser } from './zammad/zammad';
import * as GoCardless from 'gocardless-nodejs';

// @ts-ignore
const db = knex(config[(process.env.NODE_ENV) || 'development'])
export default db

export interface Timestamps {
  created_at: Date
  updated_at: Date
}

export type ZammadUserCacheItem = { id: number, data: ZammadUser } & Timestamps

export const ZammadUserCache = () => db<ZammadUserCacheItem>('zammad_users')

export const GoCardlessCustomerCache = () => db<GoCardless.Customer>('gocardless_customers')

export interface RequestItem extends Timestamps {
  id?: number
  headers: any
  body: any
}

export const RequestLog = () => db<RequestItem>('request_log')