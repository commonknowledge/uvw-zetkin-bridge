import { ZammadUser, ZammadTicket, updateZammadUser } from './zammad';
import { ZetkinMemberGet, updateZetkinMember, findZetkinMemberByFilters, createZetkinMember, getZetkinCustomData, addZetkinNoteToMember } from '../zetkin/zetkin';
import Phone from 'awesome-phonenumber';

export const getRelevantZetkinData = async (ticketData: {
  ticket?: ZammadTicket;
  owner?: ZammadUser;
  customer?: ZammadUser;
}) => {
  const { ticket, owner, customer } = ticketData

  if (
    !zetkinPerson &&
    !!user.id &&
    !!user.firstname &&
    !!user.lastname &&
    (!!user.phone || !!user.mobile || !!user.email)
  ) {
    try {
      zetkinPerson = await createZetkinPersonByZammadUser(user as any)
    } catch (e) {
      console.error(e)
      return
    }
  }

  if (!zetkinPerson) return

  const customData = await getZetkinCustomData(zetkinPerson.id)

  const getCustomData = (slug: string) => customData.find(d => d.field.slug === slug)?.value

  const updatedData = {
    customer: {
      firstname: zetkinPerson.first_name,
      lastname: zetkinPerson.last_name,
      email: zetkinPerson.email,
      phone: zetkinPerson.phone,
      addZetkinNoteToMember: zetkinPerson.street_address,
      number: String(zetkinPerson.id),
      gocardless_url: getCustomData('gocardless_url'),
      gocardless_status: getCustomData('gocardless_status'),
      gocardless_subscription: getCustomData('gocardless_subscription_name'),
      first_payment_date: getCustomData('first_payment_date'),
      last_payment_date: getCustomData('last_payment_date')
    } as Partial<ZammadUser>
  }

  return updatedData
}

export const getZetkinPersonByZammadCustomer = async (customer: ZammadUser) => {
  function update(member: ZetkinMemberGet) {
    updateZetkinMember(member.id, {
      customFields: {
        origin: 'Zammad Case',
        zammad_id: customer.id,
        zammad_url: new URL(`/#user/profile/${customer.id}`, process.env.ZAMMAD_BASE_URL)
      }
    })
  }

  let member: ZetkinMemberGet

  // Then look for canonical identifiers
  // 1. Email
  member = (await findZetkinMemberByFilters([
    ['email', '==', /a-z/.test(customer.firstname) ? customer.email : undefined],
    ['first_name', '==', /a-z/.test(customer.firstname) ? customer.firstname : undefined],
    ['last_name', '==', /a-z/.test(customer.firstname) ? customer.lastname : undefined]
  ]))?.[0]
  if (member) {
    // Save if found
    update(member)
    return member
  }


  // Try some variations of the phone number
  if (customer.mobile || customer.phone) {
    const number = new Phone(customer.mobile || customer.phone, 'GB')
    const variations = {
        original: number.getNumber().replace(/\s/mgi, ''),
        local: number.getNumber('national').replace(/\s/mgi, ''),
        international: number.getNumber('international').replace(/\s/mgi, ''),
    }

    for (const phoneVariant of Object.values(variations)) {
      member = (await findZetkinMemberByFilters([
        ['phone', '==', phoneVariant]
      ]))[0]
      if (member) {
        // Save if found
        update(member)
        return member
      }
    }
  }

  return null
}

export const createZetkinPersonByZammadUser = async (customer: ZammadUser) => {
  return createZetkinMember({
    first_name: customer.firstname,
    last_name: customer.lastname,
    email: customer.email,
    phone: customer.phone,
    city: customer.city,
    customFields: {
      origin: 'Zammad Case',
      zammad_id: customer.id,
      zammad_url: new URL(`/#user/profile/${customer.id}`, process.env.ZAMMAD_BASE_URL)
    }
  })
}