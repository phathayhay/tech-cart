import { Request } from 'express'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import { UPLOAD_IMAGE_DIR } from '~/constants/dir'
import { getExtFromFileName, getNameFromFileName, handleUploadSingleImage, handleUploadSingleVideo } from '~/utils/file'
import { isCloudinaryConfigured, uploadBufferToCloudinary, uploadFileToCloudinary } from '~/utils/cloudinary'

const safeUnlink = (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (err) {
    console.warn(`Could not remove temporary file: ${filePath}`, err)
  }
}

class MediasServices {
  async uploadSingleImage(req: Request) {
    // Parse uploaded image into temp directory
    const file = await handleUploadSingleImage(req)
    const baseName = getNameFromFileName(file.newFilename)

    // Compress image to JPEG buffer using sharp
    const jpegBuffer = await sharp(file.filepath).jpeg({ quality: 85 }).toBuffer()

    // Clean up temp file immediately
    safeUnlink(file.filepath)

    // Upload to Cloudinary when credentials are configured
    if (isCloudinaryConfigured()) {
      const result = await uploadBufferToCloudinary(jpegBuffer, {
        public_id: baseName,
        resource_type: 'image'
      })
      return result.secure_url
    }

    // Fallback to local storage if Cloudinary env vars are not set yet
    console.warn(
      '⚠️ Cloudinary is not configured in .env (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET). Saving image locally.'
    )
    const newFileName = `${baseName}.jpg`
    const newPath = path.resolve(UPLOAD_IMAGE_DIR, newFileName)
    await fs.promises.writeFile(newPath, jpegBuffer)
    return `http://localhost:3000/static/image/${newFileName}`
  }

  async uploadSingleVideo(req: Request) {
    const file = await handleUploadSingleVideo(req)
    const baseName = getNameFromFileName(file.newFilename)
    const ext = getExtFromFileName(file.originalFilename as string)
    const finalLocalPath = `${file.filepath}.${ext}`
    fs.renameSync(file.filepath, finalLocalPath)

    if (isCloudinaryConfigured()) {
      try {
        const result = await uploadFileToCloudinary(finalLocalPath, {
          public_id: baseName,
          resource_type: 'video'
        })
        safeUnlink(finalLocalPath)
        return result.secure_url
      } catch (err) {
        safeUnlink(finalLocalPath)
        throw err
      }
    }

    console.warn(
      '⚠️ Cloudinary is not configured in .env. Keeping video locally.'
    )
    file.newFilename = `${file.newFilename}.${ext}`
    return `http://localhost:3000/static/video/${file.newFilename}`
  }
}

const mediasServices = new MediasServices()
export default mediasServices
