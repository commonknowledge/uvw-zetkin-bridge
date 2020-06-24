export const wait = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const requestSnapshotLogger = (req, res, next) => {
  const { headers, body, url } = req
  console.log(JSON.stringify({ url, headers, body }))
  return next()
}