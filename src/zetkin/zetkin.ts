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

export const upsertZetkinPerson = async (member: ZetkinMemberPost): Promise<ZetkinMemberGet | null> => {
  try {
    let foundMember
    if (member.id) {
      foundMember = await getZetkinMemberById(member.id)
    } else if (member.email) {
      foundMember = await findZetkinMemberByQuery(member.email)
    }
    if (!foundMember) throw new Error("Couldn't find member")
    const updatedMember = await updateZetkinMember(foundMember.id, member)
    return updatedMember
  } catch (e) {
    // console.error("Couldn't find member, so creating")
    try {
      return createZetkinMember(member)
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
export const findZetkinMemberByFilters = async (filters: Array<[PersonFilterParam, FilterOperator, FilterValue]>, p: number | null = null, pp: number | null = null): Promise<ZetkinMemberGet[] | null> => {
  const data = await aggressivelyRetry(async (client) =>
    await client
      .resource('orgs', process.env.ZETKIN_ORG_ID, 'people')
      .get(p, pp, filters)
  )
  return data?.data?.data
}

export const createZetkinMember = async (
  data: Partial<ZetkinMemberPost>
): Promise<ZetkinMemberGet | null> => {
  const { customFields, ...fields } = data
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
  const responses = []
  for (const field in customFields) {
    const value = (customFields[field] !== null && customFields[field] !== undefined)
      ? customFields[field].toString()
      : null

    try {
      const response = await aggressivelyRetry(async (client) =>
        client
          .resource('orgs', process.env.ZETKIN_ORG_ID, 'people', personId, 'fields', field)
          .put(value)
      )
      responses.push(response?.data?.data)
    } catch (e) {
      responses.push(false)
    }
  }
  return responses
} 

export const getZetkinCustomData = async (
  personId: ZetkinMemberPost['id']
) => {
  const data = (
    await aggressivelyRetry(async (client) =>
      client
        .resource('orgs', process.env.ZETKIN_ORG_ID, 'people', personId, 'fields')
        .get()
    )
  )
  return data?.data?.data || [] as ZetkinCustomFields
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