import { ZammadUser } from './zammad';
import { upsertZetkinPerson, ZetkinMemberGet, findZetkinMemberByQuery, updateZetkinMember } from './zetkin';
import { update } from 'lodash';

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

  // ---
  // Then fuzzy match on basic details
  // DON'T DO THIS, IT'S NOT ACCURATE ENOUGH
  // member = (await findZetkinMemberByQuery(`${customer.firstname} ${customer.lastname}`))[0]
  // if (member) {
  //   // Save if found
  //   update(member)
  //   return member
  // }

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