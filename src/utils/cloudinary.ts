import { v2 as cloudinary, UploadApiResponse } from 'cloudinary'
import dotenv from 'dotenv'

dotenv.config()

export const isCloudinaryConfigured = (): boolean => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  )
}

const configureCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  })
}

export const uploadBufferToCloudinary = (
  buffer: Buffer,
  options: { folder?: string; public_id?: string; resource_type?: 'image' | 'video' | 'auto' } = {}
): Promise<UploadApiResponse> => {
  configureCloudinary()
  const folder = options.folder || process.env.CLOUDINARY_FOLDER || 'shopping_cart_be'

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: options.public_id,
        resource_type: options.resource_type || 'image',
        overwrite: true
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error('Cloudinary upload failed'))
        }
        resolve(result)
      }
    )
    uploadStream.end(buffer)
  })
}

export const uploadFileToCloudinary = async (
  filePath: string,
  options: { folder?: string; public_id?: string; resource_type?: 'image' | 'video' | 'auto' } = {}
): Promise<UploadApiResponse> => {
  configureCloudinary()
  const folder = options.folder || process.env.CLOUDINARY_FOLDER || 'shopping_cart_be'

  return cloudinary.uploader.upload(filePath, {
    folder,
    public_id: options.public_id,
    resource_type: options.resource_type || 'auto',
    overwrite: true
  })
}

