import * as dotenv from 'dotenv'
import * as path from 'path'

if (
  !!process.env.NODE_ENV && (
    process.env.NODE_ENV !== 'development' &&
    process.env.NODE_ENV !== 'staging' &&
    process.env.NODE_ENV !== 'test' &&
    process.env.NODE_ENV !== 'production'
  )
) {
  throw new Error(`Unexpected NODE_ENV setting: ${process.env.NODE_ENV}`)
}

if (process.env.NODE_ENV !== 'production') {
    dotenv.config({
      path: path.join(__dirname, '.envs', '.local', '.postgres')
    })
    dotenv.config({
      path: path.join(__dirname, '.envs', '.local', '.node')
    })
}

import * as Sentry from '@sentry/node';
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN
  });
}