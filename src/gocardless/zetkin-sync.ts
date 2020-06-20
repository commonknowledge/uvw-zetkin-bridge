import GoCardless from 'gocardless-nodejs';
import { getLinked, getRelevantGoCardlessData } from './gocardless';
import { updateZetkinMember, ZetkinMemberGet, addZetkinNoteToMember, upsertZetkinPerson, findZetkinMemberByQuery, findZetkinMemberByFilters, updateZetkinMemberCustomFields } from '../zetkin/zetkin';
import db from '../db';
import Phone from 'awesome-phonenumber'

export const getInterestingEvents = (events: GoCardless.Event[]) => {
  const interestingPaymentActions = ["confirmed", "cancelled", "customer_approval_denied", "failed"]
  const interestingPaymentEvents = events.filter(e => e.resource_type === 'payments' && interestingPaymentActions.includes(e.action))
  return interestingPaymentEvents
}

export const upsertZetkinPersonByGoCardlessCustomer = async (customer: GoCardless.Customer) => {
  return upsertZetkinPerson({
    first_name: customer.given_name,
    last_name: customer.family_name,
    email: customer.email,
    phone: customer.phone_number,
    street_address: [customer.address_line1, customer.address_line2, customer.address_line3, customer.city, customer.region, customer.country_code].filter(Boolean).join(',\n'),
    city: customer.city,
    zip_code: customer.postal_code,
    customFields: {
      gocardless_id: customer.id,
      gocardless_url: `https://manage.gocardless.com/customers/${customer.id}`,
      origin: "GoCardless"
    }
  })
}

export const getZetkinPersonByGoCardlessCustomer = async (customer: GoCardless.Customer) => {
  function update(member: ZetkinMemberGet) {
    updateZetkinMember(member.id, {
      customFields: {
        gocardless_id: customer.id,
        gocardless_url: `https://manage.gocardless.com/customers/${customer.id}`
      }
    })
  }

  let member: ZetkinMemberGet

  member = (await findZetkinMemberByFilters([
    ['email', '==', customer.email],
    ['first_name', '==', customer.given_name],
    ['last_name', '==', customer.family_name]
  ]))?.[0]
  if (member) {
    // Save if found
    update(member)
    return member
  }

  // Try some variations of the phone number
  if (customer.phone_number) {
    const number = new Phone(customer.phone_number, 'GB')
    const variations = {
        original: number.getNumber().replace(/\s/mgi, ''),
        local: number.getNumber('national').replace(/\s/mgi, ''),
        international: number.getNumber('international').replace(/\s/mgi, ''),
    }

    for (const phoneVariant of Object.values(variations)) {
      member = (await findZetkinMemberByFilters([
        ['phone', '==', phoneVariant]
      ]))?.[0]
      if (member) {
        // Save if found
        update(member)
        return member
      }
    }
  }

  return null
}

export const getOrCreateZetkinPersonByGoCardlessCustomer = async (customer: GoCardless.Customer): Promise<ZetkinMemberGet> => {
  let zetkinPerson = await getZetkinPersonByGoCardlessCustomer(customer)
  if (!zetkinPerson) {
    try {
    zetkinPerson = await upsertZetkinPersonByGoCardlessCustomer(customer)
    } catch(e) {
      console.error(e)
    }
  }
  return zetkinPerson
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
      await updateZetkinMemberCustomFields(zetkinPerson.id, await getRelevantGoCardlessData(customer.id))
    } else if (
      event.resource_type === 'subscriptions' &&
      ["finished", "cancelled", "paused", "resumed", "amended", "customer_approval_granted", "customer_approval_denied", "created"].includes(event.action)
    ) {
      const subscription: GoCardless.Subscription = await getLinked(event, 'subscription')
      const customer: GoCardless.Customer = await getLinked(subscription, 'mandate', 'customer')

      const zetkinPerson = await getOrCreateZetkinPersonByGoCardlessCustomer(customer)
      const message = `${event.details.description}. Subscription name: ${subscription.name}`

      await addNoteToZetkinPerson(zetkinPerson.id, message)
      await updateZetkinMemberCustomFields(zetkinPerson.id, await getRelevantGoCardlessData(customer.id))
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