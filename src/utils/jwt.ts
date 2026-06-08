import { error } from 'console'
import jwt from 'jsonwebtoken'
import { TokenPayLoad } from '~/models/request/User.requests'

export const signToken = ({
  payload,
  // privateKey = process.env.JWT_SECRET,
  privateKey,
  options = { algorithm: 'HS256' }
}: {
  payload: object | string | Buffer //
  privateKey: string
  options?: jwt.SignOptions
}) => {
  return new Promise<string>((resolve, reject) => {
    jwt.sign(payload, privateKey as string, options, function (err, token) {
      if (err) reject(err)
      else resolve(token as string)
    })
  })
}

export const verifyToken = ({
  token, //
  // privateKey = process.env.JWT_SECRET as string
  secretOrPublicKey
}: {
  token: string
  secretOrPublicKey: string
}) => {
  return new Promise<TokenPayLoad>((resolve, reject) => {
    jwt.verify(token, secretOrPublicKey, (error, decoded) => {
      if (error) reject(error)
      resolve(decoded as TokenPayLoad)
    })
  })
}
