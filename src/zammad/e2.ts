import * as t from 'zod'

const Enquiry = t.object({
	isMember: t.union([ t.undefined(), t.null(), t.boolean() ]),
	issues: t.union([ t.undefined(), t.null(), t.array(t.string()) ]),
	message: t.string(),
	firstName: t.string(),
	lastName: t.string(),
	email: t.union([ t.undefined(), t.null(), t.string() ]),
	phone: t.union([ t.undefined(), t.null(), t.string() ]),
	employerName: t.string(),
	workplaceAddress: t.string(),
	jobTitle: t.string(),
	hourlyWageOrSalary: t.string(),
	averageWorkHours: t.string(),
	numberOfColleagues: t.string(),
})

export type EnquiryType = t.infer<typeof Enquiry>