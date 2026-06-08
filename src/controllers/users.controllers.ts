import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import {
  ChangePasswordReqBody,
  EmailVerifyReqQuery,
  LoginReqBody,
  LogoutReqBody,
  RefreshTokenReqBody,
  RegisterReqBody,
  ResetPasswordReqBody,
  TokenPayLoad,
  UpdateMeReqBody,
  VerifyForgotPasswordTokenReqBody
} from '~/models/request/User.requests'
import { NextFunction, ParamsDictionary } from 'express-serve-static-core'
import usersServices from '~/services/users.services'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
import { USERS_MESSAGES } from '~/constants/messages'
import { UserVerifyStatus } from '~/constants/enums'
import databaseServices from '~/services/database.services'

export const loginController = async (
  req: Request<ParamsDictionary, any, LoginReqBody>, //
  res: Response
) => {
  // code ma vao dc day tuc la dang on dinh
  // chi can kiem tra dung hay kh thoi nua la ok
  const result = await usersServices.login(req.body)
  // after send result for client
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.LOGIN_SUCCESS,
    result //ac va rf de no truy cap
  })
}

export const registerController = async (
  req: Request<ParamsDictionary, any, RegisterReqBody>, //
  res: Response,
  next: NextFunction
) => {
  // kiem tra tinh dung cua du lieu co lien quan den database
  //   *** o controller du lieu da clean va full ***
  //   - check xem email nay da su dung hay chua ?
  const isExisted = await usersServices.checkEmailExist(req.body.email)
  if (isExisted) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY, //422
      message: USERS_MESSAGES.EMAIL_ALREADY_EXISTS
    })
  }
  //   - tao new user tren database
  const result = await usersServices.register(req.body)
  // response dong goi ket qua
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.REGISTER_SUCCESS,
    result
  })
}

export const logoutController = async (
  req: Request<ParamsDictionary, any, LogoutReqBody>, //
  res: Response
) => {
  const { user_id: user_id_ac } = req.decoded_authorization as TokenPayLoad
  const { user_id: user_id_fr } = req.decoded_refresh_token as TokenPayLoad
  if (user_id_ac != user_id_fr) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.UNAUTHORIZED,
      message: USERS_MESSAGES.REFRESH_TOKEN_IS_INVALID
    })
  }
  const { refresh_token } = req.body
  // kiem tra xem rf con tren he thong kh
  await usersServices.checkRefreshToken({
    user_id: user_id_fr,
    refresh_token
  })
  // neu con bth thi minh se xoa
  // neu khop ma thi xoa
  await usersServices.logout(refresh_token) // xoa rf token khoi he thong
  //
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.LOGOUT_SUCCESS
  })
}

export const emailVerifyController = async (
  req: Request<ParamsDictionary, any, any, EmailVerifyReqQuery>, //
  res: Response
) => {
  const { email_verify_token } = req.query
  const { user_id } = req.decoded_email_verify_token as TokenPayLoad
  // kiem tra email_verify_token co that su thuoc so huu cua user do kh ?
  await usersServices.checkEmailVerifyToken({
    user_id,
    email_verify_token
  })
  // verify email: xoa email_verify_token va doi verify: tu 0 thanh 1
  await usersServices.verifyEmail(user_id)
  // gui response
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.EMAIL_VERIFY_SUCCESS
  })
}

export const resendVerifyEmailController = async (
  req: Request, //
  res: Response
) => {
  // 0. lay user_id tu decoded_access_token vi minh co verify access_token trc do o middleware roi
  const { user_id } = req.decoded_authorization as TokenPayLoad
  // 1. tim thong tin user xem trang thai verify cua no the nao
  const verifyStatus = await usersServices.getVerifyStatus(user_id)
  // neu da verify thi thong bao la kh can gui lai nua
  if (verifyStatus == UserVerifyStatus.Verified) {
    return res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.EMAIL_ALREADY_VERIFIED_BEFORE
    })
  }
  if (verifyStatus == UserVerifyStatus.Banned) {
    return res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.ACCOUNT_HAS_BEEN_BANNED
    })
  }
  if (verifyStatus == UserVerifyStatus.Unverified) {
    // resendVerifyEmail: tao email_verify_token moi, cap nhat lai user va gui email
    await usersServices.resendVerifyEmail(user_id)
    return res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.RESEND_VERIFY_EMAIL_SUCCESS
    })
  }
}

export const forgotPasswordController = async (
  req: Request, //
  res: Response
) => {
  // dua vao email kiem tra xem user nay co ton tai kh
  // email nay co toon tai trong he thong kh
  const { email } = req.body
  const isExisted = await usersServices.checkEmailExist(email)
  if (!isExisted) {
    // neu email kh ton tai thi sao ma lay lai dc mk
    throw new ErrorWithStatus({
      status: HTTP_STATUS.UNAUTHORIZED,
      message: USERS_MESSAGES.USER_NOT_FOUND
    })
  }
  // neu co ton tai thi minh se tao forgot_password_token va luu vao user
  // dong thoi gui link forgot_password_token cho ng dung qua email
  await usersServices.forgotPassword(email)
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.CHECK_YOUR_EMAIL
  })
}

export const verifyForgotPasswordController = async (
  req: Request<ParamsDictionary, any, VerifyForgotPasswordTokenReqBody>, //
  res: Response
) => {
  // nguoi ta dua ma cho minh va muon biet ma da verify hay chua
  // minh da verify co nghia la do ma minh da tao ra
  // nhung minh phai xem thu ma nay la cu hay moi he thong
  // tuc la torng database co con ma nay nua hay kh
  // tuc la user_id co con so forgot_password_token nay khong
  const { user_id } = req.decoded_forgot_password_token as TokenPayLoad
  const { forgot_password_token } = req.body
  await usersServices.checkForgotPasswordToken({ user_id, forgot_password_token })
  // neu co thong tin thi oke
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.VERIFY_FORGOT_PASSWORD_TOKEN_SUCCESS
  })
}

export const resetPasswordController = async (
  req: Request<ParamsDictionary, any, ResetPasswordReqBody>, //
  res: Response
) => {
  // kiem tra xem forgot_password_token co con khop voi user_id nua khong
  const { user_id } = req.decoded_forgot_password_token as TokenPayLoad
  const { forgot_password_token, password } = req.body
  await usersServices.checkForgotPasswordToken({
    user_id,
    forgot_password_token
  })
  // neu con thi tien hanh doi mk moi do req cung cap
  await usersServices.resetPassword({ user_id, password })
  // xong thi response
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.RESET_PASSWORD_SUCCESS
  })
}

export const getMeController = async (
  req: Request, //
  res: Response
) => {
  // dung user_id tim thong tin user
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const userInfor = await usersServices.getMe(user_id)
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.GET_ME_SUCCESS,
    result: userInfor
  })
}

export const updateMeController = async (
  req: Request<ParamsDictionary, any, UpdateMeReqBody>, //
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const userInfor = await usersServices.updateMe({
    user_id, //
    payload: req.body
  })
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.UPDATE_PROFILE_SUCCESS,
    result: userInfor
  })
}

export const changePasswordController = async (
  req: Request<ParamsDictionary, any, ChangePasswordReqBody>, //
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const { password, old_password } = req.body
  // tien hanh doi mk
  await usersServices.changePassword({
    user_id,
    old_password,
    password
  })
  // neu doi password thanh cong thi
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.CHANGE_PASSWORD_SUCCESS
  })
}

export const refreshTokenController = async (
  req: Request<ParamsDictionary, any, RefreshTokenReqBody>, //
  res: Response
) => {
  // kiem tra xem refresh Token con ton tai trong he thong hay kh
  const { user_id } = req.decoded_refresh_token as TokenPayLoad
  const { refresh_token } = req.body
  await usersServices.checkRefreshToken({ user_id, refresh_token })
  //kiem tra xogn thi tien hanh tao ra cap ac va rf moi gui cho client
  const result = await usersServices.refreshToken({
    user_id,
    refresh_token
  })
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.REFRESH_TOKEN_SUCCESS,
    result
  })
}
