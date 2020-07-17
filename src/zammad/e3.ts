import * as t from 'runtypes'

const Enquiry = t.Record({
	isMember: t.Boolean.Or(t.Null).Or(t.Undefined),
	issues: t.Array(t.String).Or(t.Null).Or(t.Undefined),
	message: t.String,
	firstName: t.String,
	lastName: t.String,
	email: t.String.Or(t.Null).Or(t.Undefined),
	phone: t.String.Or(t.Null).Or(t.Undefined),
	employerName: t.String,
	workplaceAddress: t.String,
	jobTitle: t.String,
	hourlyWageOrSalary: t.String,
	averageWorkHours: t.String,
	numberOfColleagues: t.String,
})

export type EnquiryType = t.Static<typeof Enquiry>