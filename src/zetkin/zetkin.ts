import { aggressivelyRetry, getValidToken } from './auth';
// https://developer.zetkin.org/reference/

export type ZetkinMemberMetadata = {
  id:             number;
  is_user:        boolean;
}

export type ZetkinMemberData = {
  co_address?: string
  street_address?: string
  alt_phone?: string
  last_name:      string;
  zip_code?: string
  gender?: string
  first_name:     string;
  city?: string
  ext_id?: string
  email:          string;
  phone:          string;
  customFields?: {
    [key: string]: any
  }
}

export type ZetkinMemberPost = ZetkinMemberData & Partial<ZetkinMemberMetadata>

export type ZetkinMemberGet = ZetkinMemberMetadata & ZetkinMemberData

export const findZetkinMemberByProperties = async (member: Partial<ZetkinMemberPost>): Promise<null | ZetkinMemberGet> => {
  let foundMember: ZetkinMemberGet

  if (member.id) {
    foundMember = await getZetkinMemberById(member.id)
  }

  if (foundMember) return foundMember

  if (
    member.email ||
    // Possibly a bit dodgy tbh,
    // given there can be multiple people with the same name...
    (member.first_name && member.last_name)
  ) {
    foundMember = (await findZetkinMemberByFilters([
      ['email', '==', member.email],
      ['first_name', '==', member.first_name],
      ['last_name', '==', member.last_name]
    ]))?.[0]
  }

  if (foundMember) return foundMember

  // Try some variations of the phone number
  if (member.phone) {
    const number = new Phone(member.phone, 'GB')
    const variations = {
        original: number.getNumber().replace(/\s/mgi, ''),
        local: number.getNumber('national').replace(/\s/mgi, ''),
        international: number.getNumber('international').replace(/\s/mgi, ''),
    }

    for (const phoneVariant of Object.values(variations)) {
      foundMember = (await findZetkinMemberByFilters([
        ['phone', '==', phoneVariant]
      ]))?.[0]
      if (foundMember) return foundMember
    }
  }
}

export const upsertZetkinPerson = async (member: ZetkinMemberPost): Promise<ZetkinMemberGet | null> => {
  try {
    let foundMember = await findZetkinMemberByProperties(member)
    if (!foundMember) throw new Error("Couldn't find member")
    const updatedMember = await updateZetkinMember(foundMember.id, member)
    return updatedMember
  } catch (e) {
    // console.error("Couldn't find member, so creating")
    try {
      return await createZetkinMember(member)
    } catch (e) {
      console.error("Couldn't create member", e)
    }
  }
}

export const getZetkinMemberById = async (id: ZetkinMemberPost['id']): Promise<ZetkinMemberGet | null> => {
  const data = await aggressivelyRetry(async (client) =>
    client.resource('orgs', process.env.ZETKIN_ORG_ID, 'people', id).get()
  )
  return data?.data?.data
}

export const findZetkinMemberByQuery = async (q: string): Promise<ZetkinMemberGet[] | null> => {
  if (q.includes('@')) {
    console.warn("You're trying to query an email but this won't work.")
  }
  const data = await aggressivelyRetry(async (client) =>
    client
      .resource('orgs', process.env.ZETKIN_ORG_ID, 'search', 'person')
      .post({ q })
  )
  return data?.data?.data
}

type PersonFilterParam = 'email' | 'phone' | 'first_name' | 'last_name'
type FilterOperator = '==' | '>' | '>=' | '<' | '<=' | '!=' | '*='
type FilterValue = (string|number|boolean)
export type ZetkinFilter = [PersonFilterParam, FilterOperator, FilterValue]
export const findZetkinMemberByFilters = async (filters: Array<ZetkinFilter>, p: number | null = null, pp: number | null = null): Promise<ZetkinMemberGet[] | null> => {
  const validFilters = filters.filter(f => f[2] !== undefined && f[2] !== null && f[2] !== '')
  if (validFilters.length === 0) return []
  const data = await aggressivelyRetry(async (client) =>
    await client
      .resource('orgs', process.env.ZETKIN_ORG_ID, 'people')
      .get(p, pp, validFilters)
  )
  return data?.data?.data
}

import Phone from 'awesome-phonenumber';

export const formatZetkinFields = <T extends Partial<ZetkinMemberPost>>(fields: T): T => {
  let { phone, ...data } = fields
  if (phone) {
    const phoneObject = new Phone(phone, 'GB')
    if (!phoneObject.isValid()) {
      throw new Error('Invalid phone number')
    }
    phone = phoneObject.getNumber('international').replace(/\s/mgi, '')
  }
  return { phone, ...data } as T
}

export const createZetkinMember = async (
  data: Partial<ZetkinMemberPost>
): Promise<ZetkinMemberGet | null> => {
  let { customFields, ...fields } = data

  fields = formatZetkinFields(fields)

  if (
    !fields.first_name &&
    !fields.last_name &&
    (!fields.phone && !fields.email)
  ) {
    throw new Error("Not enough data to create a zetkin member")
  }

  const member: ZetkinMemberGet = (
    await aggressivelyRetry(async (client) =>
      client.resource('orgs', process.env.ZETKIN_ORG_ID, 'people').post(fields)
    )
  )?.data?.data

  if (!member) {
    console.error(
      await getValidToken(),
      data
    )
    throw new Error("Couldn't create new member")
  }
  if (customFields && Object.keys(customFields).length > 0) {
    await updateZetkinMemberCustomFields(member.id, customFields)
  }
  // @ts-ignore
  return member
}

export const deleteZetkinMember = async (personId: number) => {
  const data = await aggressivelyRetry(async (client) =>
    client
      .resource('orgs', process.env.ZETKIN_ORG_ID, 'people', personId)
      .del()
  )
  return data
}

export const updateZetkinMember = async (
  personId: ZetkinMemberPost['id'],
  { customFields, ...fields }: Partial<ZetkinMemberPost>
): Promise<ZetkinMemberGet | null> => {
  const member: ZetkinMemberGet = (await aggressivelyRetry(async (client) =>
    client
      .resource('orgs', process.env.ZETKIN_ORG_ID, 'people', personId)
      .patch(fields)
  ))?.data?.data
  if (customFields && Object.keys(customFields).length > 0) {
    await updateZetkinMemberCustomFields(personId, customFields)
  }
  // @ts-ignore
  return member
}

export const updateZetkinMemberCustomFields = async (personId: number, customFields: object) => {
  const responses: { [key: string]: string | false } = {}
  await Promise.all(Object.keys(customFields).map(async field => {
    const value = (customFields[field] !== null && customFields[field] !== undefined)
      ? customFields[field].toString()
      : null

    try {
      const response = await aggressivelyRetry(async (client) =>
        client
          .resource('orgs', process.env.ZETKIN_ORG_ID, 'people', personId, 'fields', field)
          .put(value)
      )
      responses[field] = response?.data?.data as string
    } catch (e) {
      responses[field] = false
    }
  }))
  return responses
} 

type Tag = {
  "description"?: string,
  "hidden": boolean,
  "id": number,
  "title": string,
}

export const getOrCreateZetkinTag = async (title: string, description?: string, hidden = false) => {
  const tags: Tag[] = (await aggressivelyRetry(async client => {
    return client
      .resource('orgs', process.env.ZETKIN_ORG_ID, 'people', 'tags')
      .get()
  }))?.data?.data

  const tag = tags.find(t => t.title === title)
  if (tag) return tag

  return (await aggressivelyRetry(async client => {
    return client
      .resource('orgs', process.env.ZETKIN_ORG_ID, 'people', 'tags')
      .post({
        title,
        description,
        hidden
      })
  }))?.data?.data as Tag
}

export const addZetkinMemberTags = async (personId: (string|number), tags: number[]) => {
  try {
    await Promise.all(tags.map(async tag => {
      return aggressivelyRetry(async client => {
        return client
          .resource('orgs', process.env.ZETKIN_ORG_ID, 'people', personId, 'tags', tag)
          .put()
      })
    }))
  } catch (e) {
    throw new Error("Tag doesn't exist")
  }
}

export const getZetkinMemberTags = async (personId: (string|number)): Promise<Tag[]> => {
  const res = await aggressivelyRetry(async client => {
    return client
      .resource('orgs', process.env.ZETKIN_ORG_ID, 'people', personId, 'tags')
      .get()
  })
  return res?.data?.data
}

export const removeZetkinMemberTags = async (personId: (string|number), tags: number[]) => {
  try {
    await Promise.all(tags.map(async tag => {
      return aggressivelyRetry(async client => {
        return client
          .resource('orgs', process.env.ZETKIN_ORG_ID, 'people', personId, 'tags', tag)
          .del()
      })
    }))
  } catch (e) {
    throw new Error("Tag doesn't exist")
  }
}

export const getZetkinCustomData = async (
  personId: ZetkinMemberPost['id']
): Promise<ZetkinCustomFields> => {
  const data = (
    await aggressivelyRetry(async (client) =>
      client
        .resource('orgs', process.env.ZETKIN_ORG_ID, 'people', personId, 'fields')
        .get()
    )
  )
  return data?.data?.data || []
}

export type ZetkinCustomFields = Datum[]

export interface Datum {
  field: Field;
  value: string;
}

export interface Field {
  id:   number;
  slug: string;
}


export const addZetkinNoteToMember = async (personId: ZetkinMemberPost['id'], data: object) => {
  // console.log("addZetkinNoteToMember not implemented")
}