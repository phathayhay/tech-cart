import { Request } from 'express'
import sharp from 'sharp'
import { UPLOAD_IMAGE_DIR } from '~/constants/dir'
import { getExtFromFileName, getNameFromFileName, handleUploadSingleImage, handleUploadSingleVideo } from '~/utils/file'
import fs from 'fs'

class MediasServices {
  async uploadSingleImage(req: Request) {
    // xu ly file va luu vao upload_image_temp
    const file = await handleUploadSingleImage(req)
    const newFileName = getNameFromFileName(file.newFilename) + '.jpg'
    file.newFilename = newFileName
    const newPath = UPLOAD_IMAGE_DIR + '/' + newFileName
    // xu ly bang sharp de nen file lai
    // nhan vao link dan den file tam can xu ly
    const info = await sharp(file.filepath).jpeg().toFile(newPath)
    // xoa file trong temp di
    // fs.unlinkSync(file.filepath)
    return `http://localhost:3000/static/image/${newFileName}`
  }

  async uploadSingleVideo(req: Request) {
    const file = await handleUploadSingleVideo(req)
    const ext = await getExtFromFileName(file.originalFilename as string)
    fs.renameSync(file.filepath, file.filepath + '.' + ext)
    file.newFilename = file.newFilename + '.' + ext
    return `http://localhost:3000/static/video/${file.newFilename}`
  }
}

const mediasServices = new MediasServices()
export default mediasServices
