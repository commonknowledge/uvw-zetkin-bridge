import { zetkin, getZetkinInstance } from './auth';
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
    console.error("Couldn't find member, so creating", e)
    try {
      return createZetkinMember(member)
    } catch (e) {
      console.error("Couldn't create member", e)
    }
  }
}

export const getZetkinMemberById = async (id: ZetkinMemberPost['id']): Promise<ZetkinMemberGet | null> => {
  const client = await getZetkinInstance()
  return (
    client.resource('orgs', process.env.ZETKIN_ORG_ID, 'people', id).get()
  )?.data?.data
}

export const findZetkinMemberByQuery = async (q: string): Promise<ZetkinMemberGet[] | null> => {
  try {
    const client = await getZetkinInstance()
    const { data } = await client.resource('orgs', process.env.ZETKIN_ORG_ID, 'search', 'person').post({ q })
    return data.data
  } catch (e) {
    console.error(e)
    throw e
  }
}

export const findZetkinMemberBy = async (fields: ZetkinMemberPost): Promise<ZetkinMemberGet[] | null> => {
  console.log("findZetkinMemberBy not implemented")
  return []
}

export const createZetkinMember = async (
  { customFields, ...fields }: Partial<ZetkinMemberPost>
): Promise<ZetkinMemberGet | null> => {
  const client = await getZetkinInstance()
  const member: ZetkinMemberGet = (await client
    .resource('orgs', process.env.ZETKIN_ORG_ID, 'people')
    .post(fields))?.data?.data
  if (customFields && Object.keys(customFields).length > 0) {
    for (const field in customFields) {
      client
        .resource('orgs', process.env.ZETKIN_ORG_ID, 'people', member.id, 'fields', field)
        .put(customFields[field])
    }
  }
  // @ts-ignore
  return member
}

export const updateZetkinMember = async (
  personId: ZetkinMemberPost['id'],
  { customFields, ...fields }: Partial<ZetkinMemberPost>
): Promise<ZetkinMemberGet | null> => {
  const client = await getZetkinInstance()
  const member: ZetkinMemberGet = (await client
    .resource('orgs', process.env.ZETKIN_ORG_ID, 'people', personId)
    .patch(fields))?.data?.data
  if (customFields && Object.keys(customFields).length > 0) {
    for (const field in customFields) {
      client
        .resource('orgs', process.env.ZETKIN_ORG_ID, 'people', personId, 'fields', field)
        .put(customFields[field])
    }
  }
  // @ts-ignore
  return member
}

export const addZetkinNoteToMember = async (personId: ZetkinMemberPost['id'], data: object) => {
  // console.log("addZetkinNoteToMember not implemented")
}