import { Request } from 'express'
import { RequestLog } from '../db';
import * as Sentry from '@sentry/node';

export const logRequest = async ({ headers, body }: Request) => {
  const data = { headers, body }
  try {
    return await RequestLog().insert(data)
  } catch (e) {
    let error = { error: e.toString(), message: "Failed to log event", data}
    Sentry.captureException(error)
    console.error(error)
  }
}