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
  tags?: number[]
}

export type ZetkinMemberPost = ZetkinMemberData & Partial<ZetkinMemberMetadata>

export type ZetkinMemberGet = ZetkinMemberMetadata & ZetkinMemberData

import Phone from 'awesome-phonenumber'
export const alternativeNumberFormats = (inputNumber: string, countryCode: string = 'GB') => {
  const number = new Phone(inputNumber, countryCode)
  const variations = {
      e164: number.getNumber('e164')?.replace(/\s/mgi, ''),
      original: number.getNumber()?.replace(/\s/mgi, ''),
      local: number.getNumber('national')?.replace(/\s/mgi, ''),
      international: number.getNumber('international')?.replace(/\s/mgi, ''),
  }
  return variations
}

export const findZetkinMemberByProperties = async (member: Partial<ZetkinMemberPost>): Promise<ZetkinMemberGet | null> => {
  let foundMember: ZetkinMemberGet | null | undefined

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
    foundMember = (await findZetkinMembersByFilters([
      ['email', '==', member?.email],
      ['first_name', '==', member?.first_name],
      ['last_name', '==', member?.last_name]
    ]))?.[0]
  }

  if (foundMember) return foundMember

  // Try some variations of the phone number
  if (member.phone) {
    const variations = alternativeNumberFormats(member.phone)
    for (const phoneVariant of Object.values(variations)) {
      foundMember = (await findZetkinMembersByFilters([
        ['phone', '==', phoneVariant]
      ]))?.[0]
      if (foundMember) return foundMember
    }
  }

  return null
}

export const upsertZetkinPerson = async (
  member: ZetkinMemberPost,
  updateTest?: (member: ZetkinMemberGet) => Promise<boolean>
): Promise<ZetkinMemberGet> => {
  try {
    let foundMember = await findZetkinMemberByProperties(member)
    if (!foundMember) throw new Error("Couldn't find member")
    const shouldUpdate = !updateTest || await updateTest(foundMember)
    if (shouldUpdate) {
      const updatedMember = await updateZetkinMember(foundMember.id, member)
      return updatedMember
    } else {
      return foundMember
    }
  } catch (e) {
    // console.error("Couldn't find member, so creating")
    try {
      return await createZetkinMember(member)
    } catch (e) {
      console.error("Couldn't create member", e)
      throw new Error(e)
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
export type ZetkinFilterInput = [PersonFilterParam, FilterOperator, FilterValue | undefined | null]
export type ZetkinFilter = [PersonFilterParam, FilterOperator, FilterValue]
export const findZetkinMembersByFilters = async (filters: Array<ZetkinFilterInput>, p: number | null = null, pp: number | null = null): Promise<ZetkinMemberGet[]> => {
  const validFilters = filters.filter((el): el is ZetkinFilter => {
    return el[2] !== undefined && el[2] !== null && el[2] !== ''
  })
  if (validFilters.length === 0) return []
  const data: ZetkinMemberGet[] = (await aggressivelyRetry(async (client) =>
    await client
      .resource('orgs', process.env.ZETKIN_ORG_ID, 'people')
      .get(p, pp, validFilters)
  ))?.data?.data || []
  // Double check this filtering is doing an EVERY
  const filteredData = data.filter(person => {
    return validFilters.every(filter => {
      const [key, op, query] = filter
      switch (op) {
        case '==': return person[key] === query
        case '>': return person[key] > query
        case '>=': return person[key] >= query
        case '<': return person[key] < query
        case '<=': return person[key] <= query
        case '!=': return person[key] != query
        case '*=': return person[key].includes(String(query))
      }
    })
  })
  return filteredData
}

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
): Promise<ZetkinMemberGet> => {
  let { customFields, tags, ...fields } = data

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
  if (tags && tags.length > 0) {
    await addZetkinMemberTags(member.id, tags)
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
  personId: number,
  { customFields, tags, ...fields }: Partial<ZetkinMemberPost>
): Promise<ZetkinMemberGet> => {
  const member: ZetkinMemberGet = (await aggressivelyRetry(async (client) =>
    client
      .resource('orgs', process.env.ZETKIN_ORG_ID, 'people', personId)
      .patch(fields)
  ))?.data?.data
  if (!member) throw new Error("No such member")
  if (customFields && Object.keys(customFields).length > 0) {
    await updateZetkinMemberCustomFields(personId, customFields)
  }
  if (tags && tags.length > 0) {
    await addZetkinMemberTags(personId, tags)
  }
  // @ts-ignore
  return member
}

export const updateZetkinMemberCustomFields = async <T = any>(personId: number, customFields: T) => {
  const responses: { [key: string]: string | false } = {}
  await Promise.all(Object.keys(customFields).map(async field => {
    const value = ((customFields as any)[field] !== null && (customFields as any)[field] !== undefined)
      ? (customFields as any)[field].toString()
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

export type Tag = {
  "description"?: string,
  "hidden": boolean,
  "id": number,
  "title": string,
}

let tagCache: { [tagName: string]: Tag } = {}

const getFromCache = async (ttl: string): Promise<Tag | undefined> => {
  const title = serialiseTagTitle(ttl)
  return tagCache[title]
} 

export const getOrCreateZetkinTag = async (title: string, description?: string, hidden = false) => {
  const tag = await getZetkinTagByTitle(title)
  if (tag) return tag
  return createZetkinTag(title, description, hidden)
}

export const serialiseTagTitle = (title: string) => title.replace(/[\(\)£,]+/g, '')

export const getZetkinTagByTitle = async (ttl: string): Promise<Tag | null> => {
  const title = serialiseTagTitle(ttl)
  let tag = await getFromCache(title)
  if (tag) return tag

  // If not, load up all the tags
  const tags: Tag[] = (await aggressivelyRetry(async client => {
    try {
      return client
        .resource('orgs', process.env.ZETKIN_ORG_ID, 'people', 'tags')
        .get()
    } catch (e) {
      console.log("Get tags", e)
      console.error(e)
    }
  }))?.data?.data

  if (tags) {
    // Save to cache
    tagCache = tags.reduce<{ [tagTitle: string]: Tag }>((dict, tag) => {
      dict[serialiseTagTitle(tag.title)] = tag
      return dict
    }, {})

    return tags.find(t => serialiseTagTitle(t.title) === serialiseTagTitle(title)) || null
  }

  return null
}

export const createZetkinTag = async (ttl: string, description?: string, hidden = false) => {
  const title = serialiseTagTitle(ttl)
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

export const addZetkinMemberTags = async (personId: (string|number), tagOrTags: number | number[]) => {
  const tags = Array.isArray(tagOrTags) ? tagOrTags : [tagOrTags]
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