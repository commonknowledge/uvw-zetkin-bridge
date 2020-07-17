// import expect from 'expect'
// import { aggressivelyRetry } from './auth';
// import { DevServer } from '../dev';
// import { createZetkinMember, deleteZetkinMember, updateZetkinMemberCustomFields, findZetkinMembersByFilters, findZetkinMemberByQuery, getZetkinMemberById, formatZetkinFields, getZetkinCustomData, addZetkinMemberTags, getZetkinMemberTags, removeZetkinMemberTags, getOrCreateZetkinTag, createZetkinTag, getZetkinTagByTitle, serialiseTagTitle, findZetkinMemberByProperties, Tag } from './zetkin';
// import { expectedCustomFields, expectedTags } from './configure';
// const devServer = new DevServer()

// describe('Zetkin authenticator', async function () {
//   beforeEach(async function() { 
//     this.timeout(10000)
//     await devServer.setup()
//   })

//   afterEach(async function() {
//     await devServer.teardown()
//   })

//   it('Should get the required custom fields from Zetkin', async function () {
//     this.timeout(60000)
//     const data = await aggressivelyRetry(async (client) =>
//       client.resource('orgs', process.env.ZETKIN_ORG_ID, 'people', 'fields').get()
//     )
//     expect(data?.data?.data).toMatchObject(expectedCustomFields)
//   })
// })

// const fixtures = {
//   invalidMember: {
//     first_name: "TEST",
//     last_name: "TEST",
//     email: "TEST@TESt.TEST",
//     phone: "077041000" // missing digits
//   },
//   member: {
//     first_name: "Sometest",
//     last_name: "Commonperson",
//     email: "sometest@commonknowledge.coop",
//     phone: "7704-100 000",
//     customFields: {
//       gocardless_status: "Active"
//     }
//   },
//   similarMember: {
//     first_name: "Sometest",
//     last_name: "Commonperson",
//     email: "sometest@commonknowledge.coop",
//     phone: "7704-100 001", // different
//     customFields: {
//       gocardless_status: "Active"
//     }
//   },
//   formatted: {
//     phone: '+447704100000'
//   },
//   customFields: {
//     gocardless_id: 1,
//     gocardless_url: "https://commonknowledge.coop"
//   },
//   deleteCustomFields: {}
// }
// Object.keys(fixtures.customFields).forEach(key => (fixtures.deleteCustomFields as any)[key] = null)

// let memberId: number

// describe('Zetkin utils', () => {
//   it ('Should reject phone numbers that are invalid', async function () {
//     expect(
//       () => formatZetkinFields(fixtures.invalidMember)
//     ).toThrowError('Invalid phone number')
//   })

//   it ('Should format data correctly before creating members', async function () {
//     const fields = formatZetkinFields(fixtures.member)
//     expect(fields.phone).toEqual(fixtures.formatted.phone)
//   })
// })

// describe('Zetkin CRUD operations', function () {
//   before(async function() { 
//     this.timeout(60000)
//     await devServer.setup()
//     // Don't allow the test to be tricked by previous tests!
//     const members = await findZetkinMembersByFilters([
//       ['email', '==', fixtures.member.email]
//     ])
//     for (const member of members) {
//       await deleteZetkinMember(member.id)
//     }
//   })

//   after(async function() {
//     this.timeout(60000)
//     await devServer.teardown()
//   })

//   it ('Should create a new member', async function () {
//     this.timeout(60000)
//     const member = await createZetkinMember(fixtures.member)
//     if (!member) { throw new Error("No member created") }
//     const member2 = await createZetkinMember(fixtures.similarMember)
//     memberId = member.id
//     const { customFields, ...standardFields } = fixtures.member
//     expect(member.first_name).toEqual(standardFields.first_name)
//     const customData = await getZetkinCustomData(member.id)
//     expect(customData.map(c => c.field.slug)).toEqual(expect.arrayContaining(Object.keys(fixtures.member.customFields)))
//     expect(customData.map(c => c.value)).toEqual(expect.arrayContaining(Object.values(fixtures.member.customFields)))
//   })

//   it ('Find a member by ID', async function () {
//     this.timeout(60000)
//     if (!memberId) throw new Error('Badly setup test')
//     const member = await getZetkinMemberById(memberId)
//     expect(member?.first_name).toEqual(fixtures.member.first_name)
//   })

//   // it ('Find a member by query', async function () {
//   //   this.timeout(60000)
//   //   if (!memberId) throw new Error('Badly setup test')
//   //   const members = await findZetkinMemberByQuery(`${fixtures.member.first_name} ${fixtures.member.last_name}`)
//   //   // @ts-ignore
//   //   expect(members).toBeInstanceOf(Array)
//   //   expect(members.length).toBeGreaterThan(0)
//   //   expect(members[0].first_name).toEqual(fixtures.member.first_name)
//   // })

//   it ('Find members by a single filter', async function () {
//     this.timeout(60000)
//     if (!memberId) throw new Error('Badly setup test')
//     const members = await findZetkinMembersByFilters([
//       ['email', '==', fixtures.member.email]
//     ])
//     expect(members).toBeInstanceOf(Array)
//     expect(members).toHaveLength(2)
//     expect(members[0]?.first_name).toEqual(fixtures.member.first_name)
//   })

//   it ('Find the right member by multiple properties', async function () {
//     this.timeout(60000)
//     if (!memberId) throw new Error('Badly setup test')
//     const member = await findZetkinMemberByProperties({
//       email: fixtures.member.email,
//       phone: fixtures.member.phone
//     })
//     expect({
//       phone: member?.phone
//     }).toEqual(formatZetkinFields({
//       phone: fixtures.member.phone
//     }))
//     expect(member?.first_name).toEqual(fixtures.member.first_name)
//   })

//   it ('Adds custom field values to a member', async function () {
//     this.timeout(60000)
//     if (!memberId) throw new Error('Badly setup test')
//     const fields = await updateZetkinMemberCustomFields(memberId, fixtures.customFields)
//     expect(fields).toEqual(withStringifiedObjectValues(fixtures.customFields))
//   })

//   it ('Remove custom fields value from a member', async function () {
//     this.timeout(60000)
//     if (!memberId) throw new Error('Badly setup test')
//     const fields = await updateZetkinMemberCustomFields(memberId, fixtures.deleteCustomFields)
//     expect(fields).toBeDefined()
//   })

//   const tagId = 35
//   it ('Add tags to a member', async function () {
//     this.timeout(60000)
//     if (!memberId) throw new Error('Badly setup test')
//     await addZetkinMemberTags(memberId, [tagId])
//   })

//   let previouslyGottenTag: Tag

//   it ('Get or create an existing tag', async function () {
//     this.timeout(60000)
//     if (!memberId) throw new Error('Badly setup test')
//     const title = expectedTags[0]
//     const tag = await getOrCreateZetkinTag(title)
//     previouslyGottenTag = tag
//     expect(tag.title).toEqual(title)
//   })

//   it ('Get an existing tag', async function () {
//     this.timeout(60000)
//     if (!memberId) throw new Error('Badly setup test')
//     const title = previouslyGottenTag?.title || expectedTags[0]
//     const tag = await getZetkinTagByTitle(title)
//     expect(tag?.title).toEqual(title)
//   })

//   it ('Create a new tag', async function () {
//     this.timeout(60000)
//     if (!memberId) throw new Error('Badly setup test')
//     // £,() are invalid characters
//     const title = "Some Random Tag Name £,()" + Math.random()
//     const tag = await createZetkinTag(title)
//     expect(tag).toBeDefined()
//     expect(tag.title).toEqual(serialiseTagTitle(title))
//     // Then delete it
//     await aggressivelyRetry(client =>
//       client.resource('orgs', process.env.ZETKIN_ORG_ID, 'people', 'tags', tag.id).del()
//     )
//   })

//   it ('Get tags for a member', async function () {
//     this.timeout(60000)
//     if (!memberId) throw new Error('Badly setup test')
//     const tags = await getZetkinMemberTags(memberId)
//     expect(tags).toBeInstanceOf(Array)
//     expect(tags.length).toBeGreaterThanOrEqual(1)
//     expect(tags?.map(t => t?.id)).toEqual(expect.arrayContaining([tagId]))
//   })

//   it ('Remove tags to a member', async function () {
//     this.timeout(60000)
//     if (!memberId) throw new Error('Badly setup test')
//     await removeZetkinMemberTags(memberId, [tagId])
//     const tags = await getZetkinMemberTags(memberId)
//     expect(tags).toHaveLength(0)
//   })

//   it ('Delete the new member', async function () {
//     this.timeout(60000)
//     if (!memberId) throw new Error('Badly setup test')
//     await deleteZetkinMember(memberId)
//     const members = await findZetkinMembersByFilters([
//       ['phone', '==', fixtures.member.phone]
//     ])
//     expect(members.length).toEqual(0)
//   })
// })

// function withStringifiedObjectValues (obj: object) {
//   return Object.entries(obj).reduce((obj, [property, value]) => {
//     (obj as any)[property] = String(value)
//     return obj
//   }, {})
// }