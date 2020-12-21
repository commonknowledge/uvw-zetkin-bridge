import GoCardless from 'gocardless-nodejs';
import { getLinked, getPayAndSubscriptionDataFromGoCardlessCustomer } from './gocardless';
import { updateZetkinMember, ZetkinMemberGet, addZetkinNoteToMember, upsertZetkinPerson, findZetkinMemberByQuery, findZetkinMembersByFilters, updateZetkinMemberCustomFields, findZetkinMemberByProperties, ZetkinMemberPost, getOrCreateZetkinTag, Tag } from '../zetkin/zetkin';
import { TAGS } from '../zetkin/configure';

export const getInterestingEvents = (events: GoCardless.Event[]) => {
  const interestingPaymentActions = ["confirmed", "cancelled", "customer_approval_denied", "failed"]
  const interestingPaymentEvents = events.filter(e => e.resource_type === 'payments' && interestingPaymentActions.includes(e.action))
  return interestingPaymentEvents
}

export const mapGoCardlessCustomerToZetkinMember = async (customer: GoCardless.Customer): Promise<ZetkinMemberPost> => {
  const customFields = await getPayAndSubscriptionDataFromGoCardlessCustomer(customer.id)

  const tags = await Promise.all([
    TAGS.CREATED_BY_GOCARDLESS,
    `Subscription status: ${customFields.gocardless_status}`,
    `Subscription: ${customFields.gocardless_subscription_name.replace(/[\(\)£,]+/g, '')}`
  ].map(async title => {
    return getOrCreateZetkinTag(title)
  }))

  return {
    first_name: customer.given_name,
    last_name: customer.family_name,
    email: customer.email,
    phone: customer.phone_number,
    street_address: [customer.address_line1, customer.address_line2, customer.address_line3, customer.city, customer.region, customer.country_code].filter(Boolean).join(',\n'),
    city: customer.city,
    zip_code: customer.postal_code,
    customFields: {
      ...customFields,
      // origin: "GoCardless"
    },
    tags: tags.map(t => t.id)
  }
}

export const getZetkinPersonByGoCardlessCustomer = async (customer: GoCardless.Customer) => {
  const zetkinData = await mapGoCardlessCustomerToZetkinMember(customer)
  const member: ZetkinMemberGet = await findZetkinMemberByProperties(zetkinData)
  if (!member) return null
  const { customFields } = zetkinData
  await updateZetkinMember(member.id, { customFields })
  return member
}

export const getOrCreateZetkinPersonByGoCardlessCustomer = async (customer: GoCardless.Customer, updateTest?: (member: ZetkinMemberGet) => Promise<boolean>): Promise<ZetkinMemberGet> => {
  return upsertZetkinPerson(await mapGoCardlessCustomerToZetkinMember(customer), updateTest)
}

export const processEvent = async (event: GoCardless.Event) => {
  try {
    if (
      event.resource_type === 'payments' &&
      ["confirmed", "cancelled", "customer_approval_denied", "failed"].includes(event.action)
    ) {
      const payment: GoCardless.Payment = await getLinked(event, 'payment')
      const customer: GoCardless.Customer = await getLinked(payment, 'mandate', 'customer')

      const zetkinPerson = await getOrCreateZetkinPersonByGoCardlessCustomer(customer)
      const message = `${event.details.description}. Payment details: ${parseInt(payment.amount) / 100} ${payment.currency} ${payment.description}}`

      await addNoteToZetkinPerson(zetkinPerson.id, message)
      await updateZetkinMemberCustomFields(zetkinPerson.id, await getPayAndSubscriptionDataFromGoCardlessCustomer(customer.id))
    } else if (
      event.resource_type === 'subscriptions' &&
      ["finished", "cancelled", "paused", "resumed", "amended", "customer_approval_granted", "customer_approval_denied", "created"].includes(event.action)
    ) {
      const subscription: GoCardless.Subscription = await getLinked(event, 'subscription')
      const customer: GoCardless.Customer = await getLinked(subscription, 'mandate', 'customer')

      const zetkinPerson = await getOrCreateZetkinPersonByGoCardlessCustomer(customer)
      const message = `${event.details.description}. Subscription name: ${subscription.name}`

      await addNoteToZetkinPerson(zetkinPerson.id, message)
      await updateZetkinMemberCustomFields(zetkinPerson.id, await getPayAndSubscriptionDataFromGoCardlessCustomer(customer.id))
    }
  } catch (e) {
    console.error(e)
  }

  async function addNoteToZetkinPerson (zetkinPersonId: any, description: string) {
    return addZetkinNoteToMember(zetkinPersonId, ({
      source: 'GoCardless Webhook',
      data: event,
      id: event.id,
      description,
      date: event.created_at
    }))
  }
}