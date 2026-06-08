import { createHash } from 'crypto'
import dotenv from 'dotenv'
dotenv.config()
// ham ma hoa noi dung bat ki thanh sha256
function sha256(content: string) {
  return createHash('sha256').update(content).digest('hex') // ma hoa theo he 16
}

// ham ma hao mat khau theo tieu chuan sha256
export function hashPassword(password: string) {
  return sha256(password + process.env.PASSWORD_SECRET)
}
