import * as dotenv from 'dotenv'
import * as path from 'path'

if (process.env.NODE_ENV !== 'production') {
    dotenv.config({
      path: path.join(__dirname, '.envs', '.local', '.postgres')
    })
    dotenv.config({
      path: path.join(__dirname, '.envs', '.local', '.node')
    })
}