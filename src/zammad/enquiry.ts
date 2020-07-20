import { RequestHandler } from "express"
import * as t from 'superstruct'
import { ZammadTicket, ZammadUser, zammad, searchZammadUsers, createZammadUser, searchZammadUsersWithRefinements, ZammadTicketPost, updateZammadUser, ZammadTicketArticle, tagObject } from './zammad';
import { logRequest } from '../utils/log';

const Enquiry = t.object({
	isMember: t.optional(t.nullable(t.boolean())),
	issues: t.optional(t.nullable(t.array(t.string()))),
	message: t.string(),
	firstName: t.string(),
	lastName: t.string(),
	email: t.optional(t.nullable(t.string())),
	phone: t.optional(t.nullable(t.string())),
	employerName: t.string(),
	workplaceAddress: t.string(),
	jobTitle: t.string(),
	hourlyWageOrSalary: t.string(),
	averageWorkHours: t.string(),
	numberOfColleagues: t.string(),
})

export type EnquiryType = t.StructType<typeof Enquiry>

export const handleEnquiryWebhook: RequestHandler<
  {},
  {
    // Success case
    enquiry?: EnquiryType
    caseId?: number
    memberId?: number
    caseworkerId?: number
  } | {
    // Error case
    message: string,
    validationError?: t.StructError
    error: Error
  },
  unknown
> = async (req, res) => {
  try {
    logRequest(req)
    const enquiry = req.body
    t.assert(enquiry, Enquiry)
    const { ticket, member, caseworkerId } = await createTicketFromEnquiry(enquiry)
    return res.status(200).json({ enquiry, memberId: member?.id, caseId: ticket?.id, caseworkerId })
  } catch (error) {
    try {
      res.status(500)
      if (error instanceof t.StructError) {
        return res.status(400).json({
          message: "This isn't a valid enquiry object",
          validationError: error,
          error
        })
      }
      return res.json({
        message: "Couldn't process this enquiry",
        error
      })
    } catch (e) {
      return res.json({
        message: "Couldn't process this enquiry",
        error: e
      })
    }
  }
}

const createTicketFromEnquiry = async (enquiry: EnquiryType): Promise<{
  ticket?: ZammadTicket,
  member?: ZammadUser,
  caseworkerId?: number
}> => {
  const zammadUserData: Partial<ZammadUser> = {
    firstname: enquiry.firstName,
    lastname: enquiry.lastName,
    email: enquiry.email || undefined,
    phone: enquiry.phone || undefined
  }
  let member = (
    await searchZammadUsersWithRefinements({
      email: zammadUserData.email || undefined,
      phone: zammadUserData.phone || undefined
    }, [
      ['email', 'phone'],
      ['firstname', 'lastname']
    ])
  )?.[0]

  if (!member) {
    member = await createZammadUser(zammadUserData)
  }

  await updateZammadUser(member.id, {
    employer: enquiry.employerName,
    workdplace_address: enquiry.workplaceAddress,
    job_title: enquiry.jobTitle,
    wage_salary: enquiry.hourlyWageOrSalary,
    hours: enquiry.averageWorkHours,
    number_of_colleagues: enquiry.numberOfColleagues
  })

  const { message, ...metadata } = enquiry

  const groups = (await zammad.get<{ name: string, id: number }[]>('groups')) || []
  const group = (process.env.ZAMMAD_NEW_TICKET_GROUP_NAME)
    ? groups.find(g => g.name === process.env.ZAMMAD_NEW_TICKET_GROUP_NAME)
    : groups[0]

  if (!group) throw new Error("Couldn't find group")

  const zammadTicket: ZammadTicketPost = {
    customer_id: member.id,
    title: "Webform enquiry",
    group_id: group.id,
    article: {
      subject: "Webform enquiry",
      // from: `${enquiry.firstName} ${enquiry.lastName} <${enquiry.email || enquiry.phone}>`,
      type: "note",
      "body": message,
      content_type: "text/html",
      internal: false
    },
    number_of_colleagues: enquiry.numberOfColleagues,
    note: "Created via webform."
  }

  const ticket = await zammad.post<ZammadTicket, ZammadTicketPost>('tickets', {
    body: zammadTicket
  })

  await tagObject('ticket', ticket?.id, enquiry.issues, true)

  await zammad.post<ZammadTicketArticle, ZammadTicketArticle>('ticket_articles', {
    body: {
      subject: "Further details",
      // from: `${enquiry.firstName} ${enquiry.lastName} <${enquiry.email || enquiry.phone}>`,
      ticket_id: ticket?.id,
      type: "note",
      body: objectToString(metadata),
      content_type: "text/html",
      internal: false
    }
  })

  return { member, ticket, caseworkerId: ticket?.owner_id }
}

const objectToString = (o: object): string => {
  return (
    `<table>
      <tbody>
        ${
          Object.entries(o)
          .map(([key, val]) => `<tr><td>${key}&nbsp;&nbsp;</td><td>${val}</td></tr>`)
          .join(`\n`)
        }
      </tbody>
    </table>`
  )
}