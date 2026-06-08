import User from '~/models/User.schema'
import databaseServices from './database.services'
import { LoginReqBody, RegisterReqBody, UpdateMeReqBody } from '~/models/request/User.requests'
import { hashPassword } from '~/utils/crypto'
import { signToken } from '~/utils/jwt'
import { TokenType, UserVerifyStatus } from '~/constants/enums'
import { StringValue } from 'ms'
import dotenv from 'dotenv'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
import { USERS_MESSAGES } from '~/constants/messages'
import RefreshToken from '~/models/RefreshToken.schema'
import { ObjectId } from 'mongodb'
import { update } from 'lodash'
dotenv.config()

class UsersServices {
  private signAccessToken(user_id: string) {
    return signToken({
      payload: { user_id, token_type: TokenType.AccessToken }, //0
      options: { expiresIn: process.env.ACCESS_TOKEN_EXPRIRE_IN as StringValue },
      privateKey: process.env.JWT_SECRET_ACCESS_TOKEN as string //fix
    })
  }

  private signRefreshToken(user_id: string) {
    return signToken({
      payload: { user_id, token_type: TokenType.RefreshToken }, //1
      options: { expiresIn: process.env.REFRESH_TOKEN_EXPRIRE_IN as StringValue },
      privateKey: process.env.JWT_SECRET_REFRESH_TOKEN as string //fix
    })
  }

  async register(payload: RegisterReqBody) {
    const user_id = new ObjectId()
    const email_verify_token = await this.signEmailVerifyToken(user_id.toString())
    const result = await databaseServices.users.insertOne(
      new User({
        _id: user_id,
        username: `user${user_id}`,
        email_verify_token,
        ...payload,
        date_of_birth: new Date(payload.date_of_birth), // ghi de
        password: hashPassword(payload.password) // ghi de lai password bang mot cai password da dc ma hoa
      })
    )
    // lay id cua user vua tao de lam ac va rf
    // ky ac va rf
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user_id.toString()),
      this.signRefreshToken(user_id.toString())
    ])
    // luu refreshToken vao database (register)
    await databaseServices.refreshTokens.insertOne(
      new RefreshToken({
        token: refresh_token,
        user_id: new ObjectId(user_id)
      })
    )
    //email_verify_token thi phai gui qua email
    console.log(`http://localhost:3000/users/verify-email/?email_verify_token=${email_verify_token}`)
    return {
      access_token,
      refresh_token
    }
  }

  async checkEmailExist(email: string): Promise<boolean> {
    const user = await databaseServices.users.findOne({ email })
    return Boolean(user)
  }

  async login(payload: LoginReqBody) {
    // tim user bang cac email va password da dc ma hoa
    const user = await databaseServices.users.findOne({
      ...payload, //
      password: hashPassword(payload.password)
    })
    // neu kh co thi bao loi
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        message: USERS_MESSAGES.EMAIL_OR_PASSWORD_IS_INCORRECT
      })
    }
    // neu co thi tao ac va rf tu user_id cua user moi tim dc
    const user_id = user._id.toString()
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user_id),
      this.signRefreshToken(user_id)
    ])
    // luu refreshToken vao database (login)
    await databaseServices.refreshTokens.insertOne(
      new RefreshToken({
        token: refresh_token,
        user_id: new ObjectId(user_id)
      })
    )
    //
    return {
      access_token,
      refresh_token
    }
  }

  async checkRefreshToken({ user_id, refresh_token }: { user_id: string; refresh_token: string }) {
    const refreshToken = await databaseServices.refreshTokens.findOne({
      user_id: new ObjectId(user_id),
      token: refresh_token
    })
    // neu kh co thi bao loi
    if (!refreshToken) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNAUTHORIZED,
        message: USERS_MESSAGES.REFRESH_TOKEN_IS_INVALID
      })
    }
    //neu co thi bo qua
  }

  async logout(refresh_token: string) {
    await databaseServices.refreshTokens.deleteOne({ token: refresh_token })
  }

  private signEmailVerifyToken(user_id: string) {
    return signToken({
      payload: { user_id, token_type: TokenType.EmailVerificationToken },
      options: { expiresIn: process.env.EMAIL_VERIFY_TOKEN_EXPIRE_IN as StringValue },
      privateKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string //thêm
    })
  }

  async checkEmailVerifyToken({
    user_id, //
    email_verify_token
  }: {
    user_id: string
    email_verify_token: string
  }) {
    // tim user so huu 2 thong tin nay cung luc: kiem tra xma user co dang so  huu cai evt nay k
    const user = await databaseServices.users.findOne({
      _id: new ObjectId(user_id),
      email_verify_token
    })
    // neu kh tim thay user thi nghia la evt kh  hop le
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY, // 422
        message: USERS_MESSAGES.EMAIL_VERIFY_TOKEN_IS_INVALID
      })
    }
    //neu co thi th
  }

  async verifyEmail(user_id: string) {
    // cap nhat lai user
    await databaseServices.users.updateOne(
      {
        _id: new ObjectId(user_id)
      }, //
      [
        {
          $set: {
            email_verify_token: '',
            updated_at: '$$NOW',
            verify: UserVerifyStatus.Verified
          }
        }
      ]
    )
  }

  async getVerifyStatus(user_id: string) {
    // tim user thong qua user_id
    const user = await databaseServices.users.findOne({ _id: new ObjectId(user_id) })
    // neu kh co thi nem loi
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNAUTHORIZED, // 401
        message: USERS_MESSAGES.USER_NOT_FOUND
      })
    }
    // neu co thi
    return user.verify
    // chi return trang thai verify, kh dc return user ra controller
    // boi vi neu return ra thi bi lo rat nhieu thong tin nhay cam
  }

  async resendVerifyEmail(user_id: string) {
    // tao email_verify_token moi
    const email_verify_token = await this.signEmailVerifyToken(user_id)
    // cap nhat lai user voi email_verify_token moi
    await databaseServices.users.updateOne({ _id: new ObjectId(user_id) }, [
      {
        $set: {
          email_verify_token,
          updated_at: '$$NOW'
        }
      }
    ])
    console.log(`http://localhost:3000/users/verify-email/?email_verify_token=${email_verify_token}`)
  }

  private signForgotPasswordToken(user_id: string) {
    return signToken({
      payload: { user_id, token_type: TokenType.ForgotPasswordToken },
      options: { expiresIn: process.env.FORGOT_PASSWORD_TOKEN_EXPIRE_IN as StringValue },
      privateKey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string //thêm
    })
  }

  // forgotPassword
  async forgotPassword(email: string) {
    // tim user thong qua email de lay id de ky
    const user = await databaseServices.users.findOne({ email })
    //
    const user_id = user!._id.toString()
    // tu user_id tao forgot_password_token
    const forgot_password_token = await this.signForgotPasswordToken(user_id)
    // cap nhat lai user voi forgot_password_token moi
    await databaseServices.users.updateOne({ _id: new ObjectId(user_id) }, [
      {
        $set: {
          forgot_password_token, //
          updated_at: '$$NOW'
        }
      }
    ])
    // tao link
    console.log(`http://localhost:8000/users/reset-password/?forgot_password_token=${forgot_password_token}`)
  }

  // check forgot password
  async checkForgotPasswordToken({
    user_id, //
    forgot_password_token
  }: {
    user_id: string
    forgot_password_token: string
  }) {
    // dua vao 2 thong tin tren tim user neu kh co nghia la ma forgot_password_token khong hop le || khong con torng he thong
    const user = await databaseServices.users.findOne({
      _id: new ObjectId(user_id),
      forgot_password_token
    })
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNAUTHORIZED, // 401
        message: USERS_MESSAGES.FORGOT_PASSWORD_TOKEN_IS_INVALID
      })
    }
    // con neu co thi bo qua
  }

  async resetPassword({
    user_id, //
    password
  }: {
    user_id: string
    password: string
  }) {
    // tim va cap nhat lai password
    await databaseServices.users.updateOne({ _id: new ObjectId(user_id) }, [
      {
        $set: {
          forgot_password_token: '',
          password: hashPassword(password),
          updated_at: '$$NOW'
        }
      }
    ])
  }

  async getMe(user_id: string) {
    const user = await databaseServices.users.findOne(
      {
        _id: new ObjectId(user_id)
      },
      {
        projection: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0
        }
      }
    )
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND, //404
        message: USERS_MESSAGES.NOT_FOUND
      })
    }
    //
    return user
  }

  async updateMe({ user_id, payload }: { user_id: string; payload: UpdateMeReqBody }) {
    // payload co 2 thu can fix la date_of_birth va username
    // payload là những gì người dùng đã gữi lên ở body request
    // có vấn đề là người dùng gữi date_of_birth lên dưới dạng string iso8601
    // nhưng ta cần gữi lên mongodb dưới dạng date
    // nên ta phải làm lại payload để có date_of_birth là date
    const _payload = payload.date_of_birth //
      ? { ...payload, date_of_birth: new Date(payload.date_of_birth) }
      : payload
    // neu co muon update username
    if (_payload.username) {
      const user = await databaseServices.users.findOne({ username: _payload.username })
      // neu co nguoi dung cai username roi thi bao loi
      if (user) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
          message: USERS_MESSAGES.USERNAME_ALREADY_EXISTS
        })
      }
    }
    // tien hanh cap nhat
    const userInfor = await databaseServices.users.findOneAndUpdate(
      { _id: new ObjectId(user_id) }, // filter
      [
        {
          $set: {
            ..._payload,
            updated_at: '$$NOW'
          }
        }
      ],
      {
        returnDocument: 'after',
        projection: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0
        }
      }
    )
    //
    return userInfor
  }

  async changePassword({
    user_id, //
    old_password,
    password
  }: {
    user_id: string
    old_password: string
    password: string
  }) {
    //tìm user bằng username và old_password
    const user = await databaseServices.users.findOne({
      _id: new ObjectId(user_id),
      password: hashPassword(old_password)
    })
    // neu kh tim thay user
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY, //422
        message: USERS_MESSAGES.USER_NOT_FOUND
      })
    }
    // con neu co thi cap nhat lai mat khau moi
    // cap nhat lai password va forgot_password_token moi
    // duong nhien la se luu password a hash roi
    await databaseServices.users.updateOne(
      {
        _id: new ObjectId(user_id) //filter
      },
      [
        {
          $set: {
            password: hashPassword(password),
            updated_at: '$$NOW'
          }
        }
      ]
    )
  }

  async refreshToken({
    user_id, //
    refresh_token
  }: {
    user_id: string
    refresh_token: string
  }) {
    // xoa refresh_token cu
    // sau do se ki 2 ma moi va gui cho client
    await databaseServices.refreshTokens.deleteOne({
      user_id: new ObjectId(user_id), //
      token: refresh_token
    })

    const [access_token, new_refresh_token] = await Promise.all([
      this.signAccessToken(user_id),
      this.signRefreshToken(user_id)
    ])
    // luu refreshToken vao database (login)
    await databaseServices.refreshTokens.insertOne(
      new RefreshToken({
        token: new_refresh_token,
        user_id: new ObjectId(user_id)
      })
    )
    //
    return {
      access_token,
      refresh_token: new_refresh_token
    }
  }
}

const usersServices = new UsersServices()
export default usersServices
