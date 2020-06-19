import { ZammadUser } from './zammad';
import { upsertZetkinPerson, ZetkinMemberGet, findZetkinMemberByQuery, updateZetkinMember, findZetkinMemberByFilters } from './zetkin';
import { update } from 'lodash';
import Phone from 'awesome-phonenumber';

export const getZetkinPersonByZammadCustomer = async (customer: ZammadUser) => {
  function update(member: ZetkinMemberGet) {
    updateZetkinMember(member.id, {
      customFields: {
        zammad_id: customer.id,
        zammad_url: new URL(`/#user/profile/${customer.id}`, process.env.ZAMMAD_BASE_URL)
      }
    })
  }

  let member: ZetkinMemberGet

  // Then look for canonical identifiers
  // 1. Email
  member = (await findZetkinMemberByQuery(customer.email))[0]
  if (member) {
    // Save if found
    update(member)
    return member
  }

  member = (await findZetkinMemberByFilters([
    ['first_name', '==', customer.firstname],
    ['last_name', '==', customer.lastname]
  ]))[0]
  if (member) {
    // Save if found
    update(member)
    return member
  }

  // Try some variations of the phone number
  if (customer.phone) {
    const number = new Phone(customer.phone, 'GB')
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

export const upsertZetkinPersonByZammadUser = async (customer: ZammadUser) => {
  return upsertZetkinPerson({
    first_name: customer.firstname,
    last_name: customer.lastname,
    email: customer.email,
    phone: customer.phone,
    city: customer.city
  })
}