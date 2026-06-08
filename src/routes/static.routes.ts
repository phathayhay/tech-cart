import express from 'express'
import { serveImageController, serveVideoController } from '~/controllers/medias.controllers'
import { wrapAsync } from '~/utils/handler'

const staticRoutes = express.Router()
staticRoutes.get(
  '/image/:filename', //
  wrapAsync(serveImageController)
)

staticRoutes.get(
  '/video/:filename', //
  wrapAsync(serveVideoController)
)

export default staticRoutes

//lchost3000/users/verify-email-token/?varify_email_token=abhedfdhgnvjbjdhcbnfijf
