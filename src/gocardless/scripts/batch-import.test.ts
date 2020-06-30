import expect from 'expect'
import { syncGoCardlessCustomersToZetkin } from './batch-import';
import { DevServer } from '../../dev';
import { getZetkinCustomData } from '../../zetkin/zetkin';
import { gocardless } from '../gocardless';

const devServer = new DevServer()

describe('GoCardless batch process', () => {
  before(async function() { 
    this.timeout(10000)
    await devServer.setup()
  })

  after(async function() {
    await devServer.teardown()
  })

  it('Matches gocardless customers to zetkin people', async function () {
    this.timeout(1000000000)
    // const batchSize = 1
    const testCustomers = [await gocardless.customers.find('CU000STHXDH55S')]
    const out = await syncGoCardlessCustomersToZetkin(null, testCustomers)
    expect(out).toHaveLength(testCustomers.length)
    const customData = await getZetkinCustomData(out[0].zetkinMember.id)
    const customDataProperties = customData.map(property => property.field.slug)
    expect(customDataProperties).toContain('gocardless_subscription_name')
    // expect(customDataProperties).toContain('gocardless_subscription_id')
    expect(customDataProperties).toContain('gocardless_status')
    expect(customDataProperties).toContain('last_payment_date')
    expect(customDataProperties).toContain('first_payment_date')
  })

  // it('Run sync on all GoCardless members', async function () {
  //   this.timeout(1000000000)
  //   const out = await syncGoCardlessCustomersToZetkin(50000)
  //   console.log(out.map(z => z.zetkinMember.id))
  // })
})