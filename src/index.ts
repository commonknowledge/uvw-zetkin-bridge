import '../env'
import * as express from 'express'
import * as auth from 'express-zetkin-auth';
import * as cookieParser from 'cookie-parser'
import { zetkinAuthOpts, validate, zetkinCallback, zetkinLogin, zetkinLogout, zetkinLoginAndReturn } from './auth';
const app = express()

app.use(cookieParser());
app.use(auth.initialize(zetkinAuthOpts));
app.get('/zetkin/login', zetkinLogin)
app.get('/zetkin/logout', zetkinLogout);
app.get('/zetkin/callback', zetkinCallback)

app.get('/zetkin', validate, async (req, res) => {
  try {
    // @ts-ignore
    const { data } = await req.z.resource('users', 'me').get()
    return res.json(data)
  } catch (e) {
    zetkinLoginAndReturn(req, res)
  }
})

const PORT = 7000
app.listen(PORT, () => console.log('Running at port', PORT))