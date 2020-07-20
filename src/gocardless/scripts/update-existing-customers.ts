import { getGoCardlessPaginatedList } from '../gocardless';
import * as GoCardless from 'gocardless-nodejs';
import { saveCustomersToDatabase, syncCustomersToZammad } from './cache-customers';

(async () => {
  const customers = await getGoCardlessPaginatedList<GoCardless.Customer>(
    'customers', { limit: 50000 }
  )
  await saveCustomersToDatabase(customers, true, true)
  await syncCustomersToZammad()
  process.exit()
})()