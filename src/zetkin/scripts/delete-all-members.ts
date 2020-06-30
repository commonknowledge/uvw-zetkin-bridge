// import { aggressivelyRetry } from '../auth';
// import assert from 'assert';
// import { ZetkinMemberGet, findZetkinMembersByFilters, findZetkinMemberByProperties } from '../zetkin';
// import { chunk } from 'lodash';

// const ME_ID = 1045

// export const deleteAllMembers = async () => {
//   // Get list of Zetkin members
//   const people: ZetkinMemberGet[] = (await aggressivelyRetry(client =>
//     client.resource('orgs/9/people').get()
//   ))?.data?.data
//   assert(Array.isArray(people), "Didn't get a list of people")
//   // Exclude yourself so the API doesn't blow up
//   // const { id, email, first_name, last_name, ...me }: ZetkinMemberGet = (await aggressivelyRetry(client =>
//   //   client.resource('users/me').get()
//   // ))?.data?.data
//   // console.log(me)
//   // const me2 = await findZetkinMemberByProperties(me)
//   // console.log(me2)
//   // assert(!!me2?.id === true, "Couldn't find zetkin member for API admin user")
//   const peopleToDelete = people.filter(p => parseInt(p.id as any) !== parseInt(ME_ID as any))
//   assert(people.length - 1 === peopleToDelete.length, "Didn't filter out API admin user")
//   // Delete em
//   const deleteRequests = []
//   // Try to parallelise it
//   // await Promise.all(chunk(peopleToDelete, 2).map(async (people, i) => {
//   for (const person of peopleToDelete) {
//     console.log(person.id, peopleToDelete.length - deleteRequests.length, 'to go')
//     deleteRequests.push(await aggressivelyRetry(client =>
//       client.resource('orgs', process.env.ZETKIN_ORG_ID, 'people', person.id).del()
//     ))
//   }
//   // }))
//   // console.log(deleteRequests)
//   return deleteRequests
// }