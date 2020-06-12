import * as process from "process"
// @ts-ignore
import * as webhooks from "gocardless-nodejs/webhooks"
import * as Express from 'express'
import db from "./db";

const webhookEndpointSecret = process.env.GOCARDLESS_WEBHOOK_ENDPOINT_SECRET;

export const mapEventToRow = (e: Event) => ({
  id: e.id,
  created_at: new Date(e.created_at),
  data: JSON.stringify(e),
  resource_type: e.resource_type,
  action: e.action,
})

export const handleGoCardlessWebhook = async (req: Express.Request<null, null, GocardlessWebhookRequest>, res: Express.Response<any>) => {
  try {
    if (!req.headers['webhook-signature']) {
      throw new Error("Now webhook-signature header found")
    } else if (!req.body?.events?.length) {
      throw new Error("No webhook data provided")
    }
    console.log(`Received ${req.body.events.length} GoCardless webhook events`)
    // TODO: Turn this back on
    // await parseEvents(req.body, req.headers['webhook-signature'] as string)
    // TODO: https://github.com/knex/knex/issues/701#issuecomment-594512849 for deduping
    try {
      try {
        await db.table('events').insert(req.body.events.map(mapEventToRow))
      } catch (e) {
        req.body.events.forEach(async e => {
          await db.table('events').insert(mapEventToRow(e))
        })
      }
    } catch (e) {
      console.error("Failed to store events in db", e)
    }
    return res.status(204).send()
  } catch (error) {
    console.error(error)
    res.status(400)
    if (error instanceof webhooks.InvalidSignatureError) {
      return res.json({ error, message: "Invalid webhook-signature" })
    }
    return res.json({ error, message: "Error receiving webhook" })
  }
}

// Handle the incoming Webhook and check its signature.
const parseEvents = (
  eventsRequestBody: GocardlessWebhookRequest,
  signatureHeader: string // From webhook header
) => {
  return webhooks.parse(
    eventsRequestBody,
    webhookEndpointSecret,
    signatureHeader
  );
};

export interface GocardlessWebhookRequest {
  events: Event[];
}

export interface Event {
  id:            string;
  created_at:    string;
  action:        string;
  resource_type: string;
  links:         Links;
  details:       Details;
}

export interface Details {
  origin:       string;
  cause:        string;
  description:  string;
  scheme?:      string;
  reason_code?: string;
}

export interface Links {
  payment: string;
}