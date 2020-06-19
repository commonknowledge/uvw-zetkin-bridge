import expect from 'expect'
import { syncGoCardlessCustomersToZetkin } from './batch';
import { DevServer } from './dev.test';

const devServer = new DevServer()

describe('GoCardless batch process', () => {
  beforeEach(async function() { 
    this.timeout(10000)
    await devServer.setup()
  })

  afterEach(async function() {
    await devServer.teardown()
  })

  // it('Retrieves a list of customers', async () => {
  //   const customers = await syncGoCardlessCustomersToZetkin(100)
  //   expect(customers).toHaveLength(100)
  // })
})