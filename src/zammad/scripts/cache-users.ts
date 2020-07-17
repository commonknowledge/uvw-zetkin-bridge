import { saveUsersToDatabase, getAllUsersFromZammad } from '../zammad';
(async () => {
  const users = await getAllUsersFromZammad()
  console.log(`Fetched ${users.length} users`)
  await saveUsersToDatabase(users)
  process.exit()
})()