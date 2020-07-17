// import expect from 'expect'
// import { spoofLogin, attemptLogin, attemptUpgrade, spoofUpgrade } from './spoof';
// import { DevServer } from '../dev';
// import { times } from 'lodash';
// import { getValidTokens } from './auth';
// const devServer = new DevServer()

// describe('Zetkin auto-login should be resource-efficient', function () {
//   before(async function() { 
//     this.timeout(60000)
//     await devServer.setup()
//   })

//   after(async function() {
//     this.timeout(60000)
//     await devServer.teardown()
//   })

//   it ('Should login only once when called a few times', async function () {
//     this.timeout(60000)
//     let i

//     i = 0
//     const fn = async () => {
//       i++
//       await attemptLogin()
//     }
//     await Promise.all(times(100, () => spoofLogin(fn)))
//     expect(i).toEqual(1)
//     const tokens = await getValidTokens()
//     expect(tokens.length).toEqual(1)
//   })

//   it ('Should upgrade only once when called a few times', async function () {
//     this.timeout(60000)
//     let i

//     i = 0
//     const fn = async () => {
//       i++
//       await attemptUpgrade()
//     }
//     await Promise.all(times(100, () => spoofUpgrade(fn)))
//     expect(i).toEqual(1)
//   })
// })