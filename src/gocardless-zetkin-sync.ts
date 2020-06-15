import GoCardless from 'gocardless-nodejs';
import { getLinked } from './gocardless';
import { updateZetkinMember, ZetkinMemberGet, addZetkinNoteToMember, upsertZetkinPerson, findZetkinMemberByQuery, findZetkinMemberBy } from './zetkin';
import db from './db';

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
    street_address:`${customer.address_line1} ${customer.address_line2} ${customer.address_line3} ${customer.city} ${customer.region} ${customer.country_code}`,
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
  let member: ZetkinMemberGet

  // Look for existing asserted links
  // TODO: Relies on custom field search which Zetkin doesn't currently have
  // member = await findZetkinMemberBy({ customFields: { goCardlessId: customer.id } })
  // if (member) return member

  // ---

  // Then look for canonical identifiers
  // 1. Email
  member = (await findZetkinMemberByQuery(customer.email))[0]
  if (member) {
    // Save if found
    updateZetkinMember(member.id, {
      customFields: {
        gocardless_id: customer.id,
        gocardless_url: `https://manage.gocardless.com/customers/${customer.id}`
      }
    })
    return member
  }

  // 2. Phone
  // Could do some work to normalize these
  // https://www.npmjs.com/package/awesome-phonenumber
  // member = await findZetkinMemberBy({ phone: customer.phone_number })

  // if (member) {
  //   // Save if found
  //   updateZetkinMember(member.id, { customFields: { goCardlessId: customer.id } })
  //   return member
  // }

  // ---
  // Then fuzzy match on basic details

  // member = await findZetkinMemberBy({
  //   firstName: customer.given_name,
  //   lastName: customer.family_name,
  //   postcode: customer.postal_code
  // })

  // if (member) {
  //   updateZetkinMember({ customFields: { goCardlessId: customer.id } })
  //   return member
  // }

  return null
}

export const processEvent = async (event: GoCardless.Event) => {
  try {
    if (
      event.resource_type === 'payments' &&
      ["confirmed", "cancelled", "customer_approval_denied", "failed"].includes(event.action)
    ) {
      const payment: GoCardless.Payment = await getLinked(event, 'payment')
      const customer: GoCardless.Customer = await getLinked(payment, 'mandate', 'customer')

      let zetkinPerson = await getZetkinPersonByGoCardlessCustomer(customer)
      if (!zetkinPerson) {
        try {
        zetkinPerson = await upsertZetkinPersonByGoCardlessCustomer(customer)
        } catch(e) {
          console.error(e)
        }
      }

      await db.table('events')
        .where('id', '=', event.id)
        .update({ zetkinPersonId: zetkinPerson.id })

      addZetkinNoteToMember(zetkinPerson.id, {
        source: 'GoCardless Webhook',
        data: event,
        id: event.id,
        description: `${event.details.description}. Payment details: ${parseInt(payment.amount) / 100} ${payment.currency} ${payment.description}}`,
        date: event.created_at
      })
    } else if (
      event.resource_type === 'subscriptions' &&
      ["finished", "cancelled", "paused", "resumed", "amended", "customer_approval_granted", "customer_approval_denied", "created"].includes(event.action)
    ) {
      const subscription: GoCardless.Subscription = await getLinked(event, 'subscription')
      const customer: GoCardless.Customer = await getLinked(subscription, 'mandate', 'customer')

      let zetkinPerson = await getZetkinPersonByGoCardlessCustomer(customer)
      if (!zetkinPerson) {
        try {
        zetkinPerson = await upsertZetkinPersonByGoCardlessCustomer(customer)
        } catch(e) {
          console.error(e)
        }
      }

      await db.table('events')
        .where('id', '=', event.id)
        .update({ zetkinPersonId: zetkinPerson.id })

      addZetkinNoteToMember(zetkinPerson.id, ({
        source: 'GoCardless Webhook',
        data: event,
        id: event.id,
        description: `${event.details.description}. Subscription name: ${subscription.name}`,
        date: event.created_at
      }))
    }
  } catch (e) {
    console.error(e)
  }
}