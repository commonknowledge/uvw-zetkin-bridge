import { ZammadUser, ZammadTicket, updateZammadUser } from './zammad';
import { ZetkinMemberGet, updateZetkinMember, findZetkinMemberByFilters, createZetkinMember, getZetkinCustomData, addZetkinNoteToMember, getZetkinMemberById, ZetkinFilter, findZetkinMemberByProperties, ZetkinMemberPost, getOrCreateZetkinTag } from '../zetkin/zetkin';
import { TAGS } from '../zetkin/configure';

export const createZetkinPersonByZammadUser = async (
  customer: MinimumRequiredZammadUserForZetkin
) => {
  return createZetkinMember(await mapZammadCustomerToZetkinMember(customer))
}

export const getOrCreateZetkinPersonByZammadUser = async (
  user: Partial<Omit<ZammadUser, 'id'>> & Pick<ZammadUser, 'id'>
) => {
  let zetkinPerson = await getZetkinPersonByZammadCustomer(user)

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
      return zetkinPerson
    }
  }

  return zetkinPerson
}

export const getRelevantZammadDataFromZetkinUser = async (
  zetkinPerson: ZetkinMemberGet
) => {
  let { customFields } = zetkinPerson 
  if (!customFields) {
    customFields = await getZetkinCustomData(zetkinPerson.id)
  }

  const getCustomData = (slug: string) => customFields.find(d => d.field.slug === slug)?.value

  const updatedUser: Partial<ZammadUser> = {
    firstname: zetkinPerson.first_name,
    lastname: zetkinPerson.last_name,
    email: zetkinPerson.email,
    phone: zetkinPerson.phone,
    address: zetkinPerson.street_address,
    zetkin_member_number: String(zetkinPerson.id),
    zetkin_url: `http://organize.${process.env.ZETKIN_DOMAIN}/people/person:${String(zetkinPerson.id)}`,
    gocardless_customer_number: getCustomData('gocardless_id'),
    gocardless_url: getCustomData('gocardless_url'),
    gocardless_status: getCustomData('gocardless_status'),
    gocardless_subscription: getCustomData('gocardless_subscription_name'),
    first_payment_date: getCustomData('first_payment_date'),
    last_payment_date: getCustomData('last_payment_date')
  }

  return updatedUser
}

export const getZetkinPersonByZammadCustomer = async (customer: Partial<ZammadUser>) => {
  const zetkinData = await mapZammadCustomerToZetkinMember(customer)
  const member: ZetkinMemberGet = await findZetkinMemberByProperties(zetkinData)
  if (!member) return null
  const { customFields } = zetkinData
  await updateZetkinMember(member.id, { customFields })
  return member
}

export const mapZammadCustomerToZetkinMember = async (customer: MinimumRequiredZammadUserForZetkin): Promise<ZetkinMemberPost> => {
  const tags = await Promise.all([
    getOrCreateZetkinTag(TAGS.CREATED_BY_ZAMMAD)
  ])
  return {
    id: customer.zetkin_member_number as any,
    first_name: customer.firstname,
    last_name: customer.lastname,
    email: customer.email,
    phone: customer.mobile || customer.phone,
    city: customer.city,
    customFields: {
      origin: 'Zammad Case',
      zammad_id: customer.id,
      zammad_url: new URL(`/#user/profile/${customer.id}`, process.env.ZAMMAD_BASE_URL)
    },
    tags: tags.map(t => t.id)
  }
}

type MinimumRequiredZammadUserForZetkin = Partial<ZammadUser>
// (
//   Partial<ZammadUser>
//   & Pick<ZammadUser, 'id' | 'firstname' | 'lastname'>
//   & (Pick<ZammadUser, 'phone'> | Pick<ZammadUser, 'mobile'> | Pick<ZammadUser, 'email'>)
// )