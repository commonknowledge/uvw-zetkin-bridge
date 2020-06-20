import { gocardless, getRelevantGoCardlessData } from './gocardless';
import * as GoCardless from 'gocardless-nodejs';
import { ZetkinMemberGet, updateZetkinMemberCustomFields } from '../zetkin/zetkin';
import { getOrCreateZetkinPersonByGoCardlessCustomer } from './zetkin-sync';
// For each GoCardless customer, match to Zetkin member and update custom fields.

export const syncGoCardlessCustomersToZetkin = async (limit?: number, customers?: GoCardless.Customer[]) => {
  // Get GoCardless customers
  // @ts-ignore
  const matches: Array<{
    customer: GoCardless.Customer,
    zetkinMember: ZetkinMemberGet,
    customFields: { [key:string]: (string|false) }
  }> = []
  if (!customers) {
    const customerList = await gocardless.customers.list({ limit } as any)
    customers = customerList.customers
  }
  // For each, update or create a Zetkin person record
  for (const customer of customers) {
    const zetkinMember = await getOrCreateZetkinPersonByGoCardlessCustomer(customer)
    const customFields = await updateZetkinMemberCustomFields(zetkinMember.id, await getRelevantGoCardlessData(customer.id))
    matches.push({ customer, zetkinMember, customFields })
  }
  // Update custom fields on that Zetkin person for GoCardless
  return matches
}