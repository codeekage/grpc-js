import 'dotenv/config'
import { MongooseError, createConnection } from 'mongoose'

if (!process.env.MONGO_DB_URI)
  throw new MongooseError(
    'cannot startup service when db connection is unavailable failed'
  )

const connect = (appName: string = process.env.APP_NAME!) => {
  try {
    return createConnection(process.env.MONGO_DB_URI!, {
      connectTimeoutMS: 3000,
      appName,
    })
  } catch (error) {
    console.error('connection error ', error)
    throw error
  }
}
const connection = connect()
connection.once('open', () => process.stdout.write('connection succeeded \n'))
connection.on('error', (e) => process.stderr.write('connection failed \n', e))

export { connection }
