import expect from 'expect'
import { syncGoCardlessCustomersToZetkin } from './batch-import';
import { DevServer } from '../dev';

const devServer = new DevServer()

describe('GoCardless batch process', () => {
  beforeEach(async function() { 
    this.timeout(10000)
    await devServer.setup()
  })

  afterEach(async function() {
    await devServer.teardown()
  })

  it('Matches all gocardless customers to zetkin people', async function () {
    this.timeout(1000000000)
    const batchSize = 10000
    const out = await syncGoCardlessCustomersToZetkin(batchSize)
    console.log(out)
    expect(out).toHaveLength(batchSize)
  })
})