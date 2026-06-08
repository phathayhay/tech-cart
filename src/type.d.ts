import { Request } from 'express'
import { TokenPayLoad } from './models/request/User.requests'

declare module 'express' {
  interface Request {
    decoded_authorization?: TokenPayLoad
    decoded_refresh_token?: TokenPayLoad
    decoded_email_verify_token?: TokenPayLoad
    decoded_forgot_password_token?: TokenPayLoad
  }
}
