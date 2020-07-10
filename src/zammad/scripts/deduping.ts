
import { ZammadUser, getAllUsers, updateZammadUser } from '../zammad';
import findDuplicates from 'find-duplicates';
import { alternativeNumberFormats } from '../../zetkin/zetkin';
import { mergeWith } from 'lodash';

type DuplicatePointerType<T> = {
  index: number
  value: T
}
 
interface FindDuplicates {
  <T>(members: T[], iteratee: (subject: T) => string): DuplicatePointerType<T>[][]
}
 
const debugDupes = <T>(name: string, data: ZammadUser[], serializer: (s: ZammadUser) => string) => {
  const dupes = (findDuplicates as unknown as FindDuplicates)(data, serializer)
  const dupeReport = Array.from(
    new Set(dupes.map(set => {
      const report = {
        CAN_BE_DUPLICATED: undefined,
        count: set.length,
        value: serializer(set[0].value),
        set,
        merged: set.reduce<Partial<ZammadUser>>((user, instance) => {
          user = mergeWith(user, instance.value, function customizer(objValue, srcValue) {
            if (objValue === '') {
              return srcValue
            }
            return objValue
          })
          return user
        }, {}),
        uniques: set.reduce<{ phone?: string[], email?: string[], mobile?: string[], gocardless_url?: string[] }>((o, r) => {
          if (r.value.phone) {
            o.phone = o.phone ? [...o.phone, alternativeNumberFormats(r.value.phone).e164] : [alternativeNumberFormats(r.value.phone).e164]
          }
          if (r.value.mobile) {
            o.mobile = o.mobile ? [...o.mobile, alternativeNumberFormats(r.value.mobile).e164] : [alternativeNumberFormats(r.value.mobile).e164]
          }
          if (r.value.email) {
            o.email = o.email ? [...o.email, r.value.email] : [r.value.email]
          }
          if (r.value.gocardless_url) {
            o.gocardless_url = o.gocardless_url ? [...o.gocardless_url, r.value.gocardless_url] : [r.value.gocardless_url]
          }
          return o
        }, {}),
      }
      // For same name
      const duplicated = (prop: string) => (
        report.uniques[prop]?.length > 1
        && new Set(report.uniques[prop]).size === 1
      )
      const onlyOne = (prop: string) => report.uniques[prop]?.length === 1
      const unset = (prop: string) => !report.uniques[prop] || report.uniques[prop]?.filter(Boolean).length === 0
      const unique = (prop: string) => unset(prop) || onlyOne(prop) || duplicated(prop)
      // If same emails and no conflicting phone, merge
      if(unique('gocardless_url') && unique('email') && unique('phone') && unique('mobile')) {
        // @ts-ignore
        report.CAN_BE_DUPLICATED = true
      }
      // If same phones and no conflicting email, merge
      return report
    }))
  ).sort((a, b) => b.count - a.count)

  console.log(
    name,
    dupes.length,
    `${dupeReport.filter(d => d.CAN_BE_DUPLICATED).length} duplicates`,
    dupeReport,
  )

  return dupeReport
}


const findDuplicates = async () => {
  this.timeout(60000)
  const users = await getAllUsers()
  const dupes = debugDupes('name', users, s => `${s.firstname} ${s.lastname}`)
    .filter(d => d.CAN_BE_DUPLICATED)
  for (const dupe of dupes) {
    // Get members to work on
    const dupeset = dupe.set.map(d => d.value)
    const usersToInvalidate = dupeset.filter(d => d.email !== dupe.merged.email)
    const userToUpdate = dupeset.find(d => d.email === dupe.merged.email) || dupeset[0]
    
    // Hide these users
    for (const user of usersToInvalidate) {
      await updateZammadUser(user.id, {
        active: false,
        firstname: 'IGNORE',
        lastname: 'INVALID USER'
      })
      console.log(`Deactivated dupe user`, user)
    }

    // Reuse one of the member objects
    const { id, ...merge } = dupe.merged
    try {
      const newUser = await updateZammadUser(
        userToUpdate.id,
        { ...merge, active: merge.firstname !== 'IGNORE' }
      )
      console.log(`Updated user with merged data`, newUser.id)
    } catch (e) {
      console.error(userToUpdate.id, e)
    }
  }
  debugDupes('email', users, s => s.email)
  debugDupes('phone', users, s => s.phone)
  debugDupes('mobile', users, s => s.mobile)
}