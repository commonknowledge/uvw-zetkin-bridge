import '../env'
import * as knex from 'knex'
import * as config from '../knexfile'
export default knex(config[process.env.NODE_ENV || 'development'])

export interface Timestamps {
  created_at: Date
  updated_at: Date
}