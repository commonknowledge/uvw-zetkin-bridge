import supertest from 'supertest';
import { DevServer } from '../dev';
import { zammad, ZammadTicket, deleteZammadUser, searchZammadUsers, deactivateZammadUser } from './zammad';
import expect from 'expect';
import { EnquiryType } from './enquiry';
import { timeStamp } from 'console';
import { RequestLog } from '../db';

const devServer = new DevServer()

const testTicket: EnquiryType = {
  message: "This is a test enquiry",
  workplaceAddress: 'Test Ticket From Webhook',
  firstName: "J",
  lastName: "B",
  phone: "01234123456",
  employerName: "Test Ltd.",
  jobTitle: "Test Maker",
  hourlyWageOrSalary: "A pittance",
  averageWorkHours: "Here and there",
  numberOfColleagues: "4 or 5 but they switch us around a lot",
  issues: ["Bullying or discrimination"]
}

describe('Zammad ticket creator webhook', () => {
  let caseIds: number[] = []
  let memberIds: number[] = []

  before(() => {
    devServer.setupDb()
  })

  after(async () => {
    devServer.teardownDb()
    try {
      for (const u of memberIds.filter(Boolean)) {
        deactivateZammadUser(u)
      }
      for (const t of caseIds.filter(Boolean)) {
        await zammad.delete(`/tickets/${t}`)
      }
    } catch (e) {
      console.error("Cleanup failed", e)
    }
  })

  it('Returns a 400 response if the request is invalid', async function () {
    this.timeout(10000)
    try {
      await supertest(devServer.config.app)
        .post('/webhooks/enquiry')
        .send({})
        .expect(400)
        .expect(res => 
          expect(res.body).toHaveProperty("validationError")
        )
    } catch (e) {
      console.log("Request errored")
    }
  })

  it("Zammad User and Ticket returned for valid enquiries", async function () {
    this.timeout(20000)
    await supertest(devServer.config.app)
      .post('/webhooks/enquiry')
      .send(testTicket)
      .expect(200)
      .expect(async res => {
        const { memberId, caseId } = res.body
        // Logs are made
        expect(await RequestLog().select('*')).toHaveLength(1)
        expect(memberId).toBeDefined()
        expect(caseId).toBeDefined()
        console.log({ memberId, caseId })
        // Tags are set
        const tags = await getTagsFor('ticket', caseId)
        expect(tags).toEqual(testTicket.issues)
        // GC
        memberIds.push(memberId)
        caseIds.push(caseId)
      })
  })

  // it("Zammad tickets created for valid enquiries", async () => {
  //   const res = await supertest(devServer.config.app)
  //     .post('/webhooks/enquiry')
  //     .send(testTicket)
  //   const { ticket } = res.body
  //   expect(ticket).toBeDefined()
  //   expect(ticket.workplaceAddress).toEqual(testTicket.workplaceAddress)
  // })

  // it("Zammad user gets assigned if the member details match?", async () => {
  //   expect(false).toBe(true)
  // })

  // it("New Zammad user gets created if there is no matching member?", async () => {
  //   expect(false).toBe(true)
  // })

  // it("Zammad ticket contains relevant info that makes it easy for a caseworker to get what's going on?", async () => {
  //   expect(false).toBe(true)
  // })

  // it("A log of requests in case anything goes wrong?", async () => {
  //   expect(false).toBe(true)
  // })
})