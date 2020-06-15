import * as process from "process"
// @ts-ignore
import * as webhooks from "gocardless-nodejs/webhooks"
import * as Express from 'express'
import db from "./db";
import * as constants from 'gocardless-nodejs/constants'
import GoCardless from 'gocardless-nodejs'
import { GoCardlessClient } from 'gocardless-nodejs/client'
import { findZetkinMemberByQuery, ZetkinMemberGet } from './zetkin';
import { processEvent } from './gocardless-zetkin-sync';
// @ts-ignore
export const gocardless: GoCardlessClient = GoCardless(process.env.GOCARDLESS_ACCESS_TOKEN, constants.Environments.Live);

const webhookEndpointSecret = process.env.GOCARDLESS_WEBHOOK_ENDPOINT_SECRET;

export const mapEventToRow = (e: GoCardless.Event) => ({
  id: e.id,
  created_at: new Date(e.created_at),
  data: JSON.stringify(e),
  resource_type: e.resource_type,
  action: e.action,
})

export const handleGoCardlessWebhook = async (req: Express.Request<null, null, { events: GoCardless.Event[] }>, res: Express.Response<any>) => {
  try {
    if (!req.headers['webhook-signature']) {
      throw new Error("Now webhook-signature header found")
    } else if (!req.body?.events?.length) {
      throw new Error("No webhook data provided")
    }
    // Let GoCardless know the webhook has someone to listen to
    res.status(204).send()
    
    // Continue processing the data
    console.log(`Received ${req.body.events.length} GoCardless webhook events`)
    // TODO: Turn this back on
    // const events = await parseEvents(req.body, req.headers['webhook-signature'] as string)
    const events = req.body.events
    // TODO: https://github.com/knex/knex/issues/701#issuecomment-594512849 for deduping
    try {
      try {
        await db.table('events').insert(events.map(mapEventToRow))
      } catch (e) {
        events.forEach(async e => {
          await db.table('events').insert(mapEventToRow(e))
        })
      }
    } catch (e) {
      console.error("Failed to store events in db", e)
    }

    await Promise.all(events.map(processEvent))
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
  eventsRequestBody: { events: Event[] },
  signatureHeader: string // From webhook header
): Event[] => {
  return webhooks.parse(
    eventsRequestBody,
    webhookEndpointSecret,
    signatureHeader
  );
};

type GCObject<T> =
  T extends 'customer' ? GoCardless.Customer
  : T extends 'mandate' ? GoCardless.Mandate
  : T extends 'payment' ? GoCardless.Payment
  : T extends 'subscription' ? GoCardless.Subscription
  : T extends 'event' ? GoCardless.Event
  : any

type GCTuple<T> = { [P in keyof T]: GCObject<T[P]> }

/**
 * @example await getLinked(customEvent, 'payment', 'mandate', 'customer')
 */
export const getLinked = async (event: { links: Partial<AllAvailableLinks> }, ...resources: Array<linkResourceKey>) => {
  const data: GCObject<typeof resources>[] = [event]
  for (const resource of resources) {
    const lastItem = data[data.length - 1]
    data.push(await gocardless[resource + 's'].find(lastItem.links[resource]))
  }
  return data[data.length - 1]
}

export const gocardlessQuery = async (
  req: Express.Request,
  res: Express.Response
) => {
  try {
    if (!req.query.eventId) throw new Error("Provide an eventId in the query string.")
    if (!req.query.resourceChain) throw new Error("Provide an resourceChain in the query string.")
    const event = await gocardless.events.find(req.query.eventId as string)
    const resources = (req.query.resourceChain as string).split(',')
    const { __response__, ...gocardlessData } = await getLinked(event, ...resources as any[])
    let zetkinMember: ZetkinMemberGet
    if (resources[resources.length - 1] === 'customer') {
      zetkinMember = (await findZetkinMemberByQuery((gocardlessData as GoCardless.Customer).email))[0]
    }
    return res.json({ gocardlessData, zetkinMember })
  } catch (e) {
    return res.json(e)
  }
}

type AllAvailableLinks =
  & GoCardless.CreditorUpdateRequestLinks
  & GoCardless.CreditorLinks
  & GoCardless.CreditorBankAccountCreateRequestLinks
  & GoCardless.CreditorBankAccountLinks
  & GoCardless.CustomerBankAccountCreateRequestLinks
  & GoCardless.CustomerBankAccountLinks
  & GoCardless.CustomerNotificationLinks
  & GoCardless.EventLinks
  & GoCardless.InstalmentScheduleCreateWithDatesRequestLinks
  & GoCardless.InstalmentScheduleCreateWithScheduleRequestLinks
  & GoCardless.InstalmentScheduleLinks
  & GoCardless.MandateCreateRequestLinks
  & GoCardless.MandateLinks
  & GoCardless.MandateImportEntryCreateRequestLinks
  & GoCardless.MandateImportEntryLinks
  & GoCardless.MandatePdfCreateRequestLinks
  & GoCardless.PaymentCreateRequestLinks
  & GoCardless.PaymentLinks
  & GoCardless.PayoutLinks
  & GoCardless.PayoutItemLinks
  & GoCardless.RedirectFlowCreateRequestLinks
  & GoCardless.RedirectFlowLinks
  & GoCardless.RefundCreateRequestLinks
  & GoCardless.RefundLinks
  & GoCardless.SubscriptionCreateRequestLinks
  & GoCardless.SubscriptionLinks

type linkResourceKey = keyof AllAvailableLinks