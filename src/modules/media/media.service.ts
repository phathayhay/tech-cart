import { BadRequestException, Injectable } from '@nestjs/common'
import { Request } from 'express'
import * as fs from 'fs'
import sharp from 'sharp'
import { uploadBufferToCloudinary } from '../../utils/cloudinary'
import { getNameFromFileName, handleUploadSingleImage } from '../../utils/file'

@Injectable()
export class MediaService {
  /**
   * Parses multipart image upload via Formidable, verifies image buffer with Sharp
   * (stripping EXIF metadata and resizing max 1200x1200), deletes temp file,
   * and streams directly to Cloudinary (`shopping_cart_be` folder).
   */
  async uploadImage(req: Request) {
    try {
      const file = await handleUploadSingleImage(req)
      const baseName = getNameFromFileName(file.newFilename)

      const metadata = await sharp(file.filepath).metadata()
      if (!metadata.format || !['jpeg', 'png', 'webp', 'gif'].includes(metadata.format)) {
        fs.unlink(file.filepath, () => undefined)
        throw new BadRequestException({
          code: 'INVALID_IMAGE_FORMAT',
          message: 'Chỉ chấp nhận định dạng ảnh JPEG, PNG hoặc WebP hợp lệ'
        })
      }

      const optimizedBuffer = await sharp(file.filepath)
        .rotate() // Auto-orient and strip EXIF metadata
        .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer()

      await fs.promises.unlink(file.filepath).catch(() => undefined)

      const cloudResult = await uploadBufferToCloudinary(optimizedBuffer, {
        public_id: baseName,
        resource_type: 'image'
      })

      return {
        url: cloudResult.secure_url,
        public_id: cloudResult.public_id,
        format: 'jpg'
      }
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        throw err
      }
      throw new BadRequestException({
        code: 'MEDIA_UPLOAD_FAILED',
        message: err?.message || 'Tải ảnh lên Cloudinary thất bại'
      })
    }
  }
}
