import * as process from "process"
// @ts-ignore
import * as webhooks from "gocardless-nodejs/webhooks"
import * as Express from 'express'
import * as constants from 'gocardless-nodejs/constants'
import GoCardless, { ListMeta } from 'gocardless-nodejs'
import { GoCardlessClient } from 'gocardless-nodejs/client'
import { findZetkinMemberByQuery, ZetkinMemberGet } from '../zetkin/zetkin';
import { processEvent } from './zetkin-sync';
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

import { format } from 'date-fns'
export const dateFormat = (d: Date): string => format(d, 'yyyy-MM-dd')
export const getCustomerUrl = (customerId: string) => `https://manage.gocardless.com/customers/${customerId}`

export const getRelevantZetkinDataFromGoCardlessCustomer = async (
  customerId: string,
  subscription?: GoCardless.Subscription,
  payments?: GoCardless.Payment[]
) => {
  // Current status
  if (!subscription) {
    const subscriptions = await gocardless.subscriptions.list({ customer: customerId });
    subscription = subscriptions.subscriptions.sort(
      (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    )[0]
  }
  const gocardless_subscription_name = subscription.name
  const gocardless_subscription_id = subscription.id
  const gocardless_status = subscription.status

  if (!payments) {
    const paymentsResponse = await gocardless.payments.list({ customer: customerId })
    payments = paymentsResponse.payments
  }
  payments = payments
    .filter(payment => !!payment.links.payout)
    .sort(
      (a, b) => new Date(a.charge_date).getTime() - new Date(b.charge_date).getTime()
    )

  // Payment history
  let first_payment_date: string
  let last_payment_date: string
  const first_payment = payments.length === 0 ? null
    : payments[0]
  if (first_payment) {
    first_payment_date = dateFormat(new Date((await gocardless.payouts.find(first_payment.links.payout)).created_at))
  }
  const last_payment = payments.length === 0 ? null
    : payments[payments.length - 1]
  if (last_payment) {
    last_payment_date = dateFormat(new Date((await gocardless.payouts.find(last_payment.links.payout)).created_at))
  }
  const number_of_payments = payments.length

  return {
    gocardless_id: customerId,
    gocardless_url: getCustomerUrl(customerId),
    gocardless_subscription_name,
    gocardless_subscription_id,
    gocardless_status,
    last_payment_date,
    number_of_payments,
    first_payment_date,
  }
}

type ListResponse = {
  meta: ListMeta;
}

// export const getGoCardlessPaginatedList = async (
//   resource: string,
//   args: {
//     after?: string;
//     before?: string;
//     limit?: string;
//   }
// ): Promise<any> => {
//   const data: T[] = []
//   let res: ListResponse
//   let i = 0
//   while ((res?.meta?.limit || 0) < (args.limit || 50)) {
//     i++
//     if (i > 5) throw new Error('Something went wrong')
//     const nextArgs = { ...args }
//     const after = res?.meta?.cursors?.after
//     if (after) {
//       nextArgs.after = after
//     }
//     res = await method.bind(method, nextArgs)
//     data.push(res[dataField])
//   }
//   return data
// }

export const getGoCardlessPaginatedList = async (
  resource: string,
  args: { limit: number, after?: string }
) => {
  let data = []
  let res: ListResponse
  while (
    !data.length || (
      // moreDataRequired
      data.length < args.limit &&
      // moreDataAvailable
      res?.meta?.limit !== undefined &&
      !!res?.meta?.cursors?.after
    )
  ) {
    const nextArgs = { ...args }
    const after = res?.meta?.cursors?.after
    if (after) nextArgs.after = after
    res = await gocardless[resource].list(nextArgs)
    const requiredDataLength = args.limit - data.length
    console.log(`Adding ${res[resource].length} to ${data.length} of required ${args?.limit}`)
    // console.log(new Set(data.map(d => d.id)).size)
    data = data.concat(res[resource].slice(0, requiredDataLength))
    if (!res?.meta?.cursors?.after) {
      console.log(`Requested ${args?.limit} but there were only ${data?.length} entries.`)
      return data
    }
  }
  return data
}