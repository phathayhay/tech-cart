import express from 'express'
import {
  changePasswordController,
  emailVerifyController,
  forgotPasswordController,
  getMeController,
  loginController,
  logoutController,
  refreshTokenController,
  registerController,
  resendVerifyEmailController,
  resetPasswordController,
  updateMeController,
  verifyForgotPasswordController
} from '~/controllers/users.controllers'
import { filterMiddleware } from '~/middlewares/common.middlewares'
import {
  accessTokenValidator,
  changePasswordValidator,
  emailVerifyTokenValidator,
  forgotPasswordTokenValidator,
  forgotPasswordValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  resetPasswordValidator,
  updateMeValidator
} from '~/middlewares/users.middleware'
import { ChangePasswordReqBody, RefreshTokenReqBody, UpdateMeReqBody } from '~/models/request/User.requests'
import { wrapAsync } from '~/utils/handler'
import databaseServices from '~/services/database.services'
const usersRoutes = express.Router()

/*chuc nang login
path: users/login
method: post
body: {
    email: string,
    password: string 
}
loginValidator: kiem tra email va password
loginController: dong goi kien hang va gui ket qua
*/
//Request: headers(gui nhung mk ma server cho minh), body(mk cua minh gui len server), param, query

usersRoutes.post(
  '/login', //
  loginValidator,
  wrapAsync(loginController)
)

/*** register
path: users/register
method: post
body: {
    email: string,
    name: string,
    password: string,
    confirm_password,
    data_of_birth: ISO8601 
}
*/
usersRoutes.post(
  '/register',
  registerValidator, //
  wrapAsync(registerController)
)

/* Logout:
path: /users/logout
method: post
-- dau tien xac dinh la ng so huu la ai o headers (gui access thong qua duong nay)
headers{
  Authorization: 'Bearer access_token'
}
body: {
  refresh_token: string,  (muc dich dung de xin mot access moi)
}
---- Muc dich cua viec dang xuat la ng so huu la ai va kiem tra co dung cap ma hay kh 
*/
usersRoutes.post(
  '/logout', //
  accessTokenValidator,
  refreshTokenValidator,
  wrapAsync(logoutController)
)

/* verify-email
  des: nguoi dung click vao link xac thuc, link nay thuc chat la gui email_verify_token len server de server xac thuc 
  path: /users/verify-email/?email_verify_token=string
  method: get ( vi nguoi dung chi bam vao link)
  query: {
    email_verify_token: string 
  }
 */
usersRoutes.get(
  '/verify-email/', //
  emailVerifyTokenValidator,
  wrapAsync(emailVerifyController)
)

/* resend-verify-email
  des: nguoi dung muon verify email nhung chua co link hoac kh co link 
  path: users/resend-verify-email
  method: post( can biet nguoi dung la ai de gui mail cua nguoi dung do )
  headers: {
    Authorization: 'Bearer access_token'
  }
 */
usersRoutes.post(
  '/resend-verify-email', //
  accessTokenValidator, // ham nay da lam r
  wrapAsync(resendVerifyEmailController)
)

/* forgot-password
path: /uesrs/forgot-password
method: post
body: {
  email: string 
}
 */
usersRoutes.post(
  '/forgot-password', //
  forgotPasswordValidator,
  wrapAsync(forgotPasswordController)
)

/*verify-forgot-password
  des: khi nguoi dung vao mail click vao link de verify ho se gui forgot_password_token cho front-end,
  front-end se gui token nay len server de verify,
  neu on thi hien thi form nhap mat khau moi,
  path: /users/verify-forgot-password
  method: post
  body: {
    forgot_password_token: string 
  }
 */
usersRoutes.post(
  '/verify-forgot-password', //
  forgotPasswordTokenValidator,
  wrapAsync(verifyForgotPasswordController)
)

/* reset-password
des:front-end se gui password va confirm_password, lem voi forgot_password_token
len cho backend tien hanh xac thuc va doi mk 
path: /users/reset-password
method: post
body: {
  password: string
  confirm_password: string
  forgot_password_token: string 
}
*/
usersRoutes.post(
  '/reset-password', //
  forgotPasswordTokenValidator, // ham kiem tra ma
  resetPasswordValidator, // kiem tra password va confirm_password moi
  wrapAsync(resetPasswordController)
)
// test chuc nang: login | forgot-password | reset-password

/* getMe
des: lay thong tin cua hinh minh, cua user dang dang nhap
path: /users/me 
method: post 
headers{
  Authorization: 'Bearer access_token'
}
*/
usersRoutes.post(
  '/me', //
  accessTokenValidator,
  wrapAsync(getMeController)
)

/*
des: update profile của user
path: '/me'
method: patch
Header: {Authorization: Bearer <access_token>}
body: {
  name?: string
  date_of_birth?: Date
  bio?: string // optional
  location?: string // optional
  website?: string // optional
  username?: string // optional
  avatar?: string // optional
  cover_photo?: string // optional}
*/

usersRoutes.patch(
  '/me', //
  accessTokenValidator,
  updateMeValidator,
  filterMiddleware<UpdateMeReqBody>([
    'name', //
    'avatar',
    'bio',
    'cover_photo',
    'date_of_birth',
    'location',
    'username',
    'website'
  ]),
  wrapAsync(updateMeController)
)

/* change-password
  des: khi nguoi dung da dang nhap va dang muon doi mat khau 
  path: '/change-password'
  method: PUT
  headers: {
    Authorization: Bearer <access_token>
  }
  Body: {
    old_password: string,
    password: string, 
    confirm_password: string
  }
g}
*/
usersRoutes.put(
  '/change-password', //
  accessTokenValidator,
  changePasswordValidator,
  filterMiddleware<ChangePasswordReqBody>([
    'old_password', //
    'password',
    'confirm_password'
  ]),
  wrapAsync(changePasswordController)
)

/*
  des: khi ma access_token het han, thi client se gui refresh_token
       len de xin access_token va refresh_token moi 
  path: 'users/refresh-token'
  method: POST
  Body: {
    refresh_token: string
  }
}
  */
usersRoutes.post(
  '/refresh-token', //
  refreshTokenValidator,
  filterMiddleware<RefreshTokenReqBody>(['refresh_token']),
  wrapAsync(refreshTokenController)
)

/*
  des: dev-helper to fetch simulated token data
*/
usersRoutes.get(
  '/debug/latest-tokens',
  wrapAsync(async (req, res) => {
    const users = await databaseServices.users.find().toArray()
    if (users.length === 0) {
      return res.json({ message: 'No users found' })
    }
    const lastUser = users[users.length - 1]
    return res.json({
      email: lastUser.email,
      email_verify_token: lastUser.email_verify_token,
      forgot_password_token: lastUser.forgot_password_token
    })
  })
)

export default usersRoutes
