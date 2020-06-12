import * as process from "process"
// @ts-ignore
import * as webhooks from "gocardless-nodejs/webhooks"
import * as Express from 'express'

const webhookEndpointSecret = process.env.GOCARDLESS_WEBHOOK_ENDPOINT_SECRET;

export const handleGoCardlessWebhook = async (req: Express.Request<null, null, GocardlessWebhookRequest>, res: Express.Response<any>) => {
  try {
    console.log(req.body)
    console.log(req.headers)
    if (!req.headers['Webhook-Signature']) {
      throw new Error("Now Webhook-Signature header found")
    } else if (!req.body?.events) {
      throw new Error("No webhook data provided")
    }
    console.log(await parseEvents(req.body, req.headers['Webhook-Signature'] as string))
    console.log(`Received ${req.body.events.length} events`)
    return res.status(204).send()
  } catch (error) {
    res.status(400)
    if (error instanceof webhooks.InvalidSignatureError) {
      return res.json({ error, message: "Invalid Webhook-Signature" })
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
  created_at:    Date;
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