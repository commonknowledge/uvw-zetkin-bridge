import { RequestHandler } from "express"

export const handleEnquiryWebhook: RequestHandler = async (req, res) => {
  return res.status(204).send()
}