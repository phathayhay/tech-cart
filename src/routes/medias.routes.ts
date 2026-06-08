import express from 'express'
import { uploadSingleImageController, uploadSingleVideoController } from '~/controllers/medias.controllers'
import { wrapAsync } from '~/utils/handler'

const mediasRoutes = express.Router()

/* uplpad-image(single-image)
    des: nguoi dung dung form co chua hinh anh len server 
    server luu tru hinh anh tre nvao he thong 
    path: /medias/upload-image
    method: post
*/
mediasRoutes.post(
  '/upload-image', //
  wrapAsync(uploadSingleImageController)
)

mediasRoutes.post(
  '/upload-video', //
  wrapAsync(uploadSingleVideoController)
)

export default mediasRoutes
