//file này dùng để xử lí file
import path from 'path' //giúp lấy đc đường dẫn gốc của hệ thống
import fs from 'fs' //file system(xử lí file| xóa | thêm | tìm)
import { UPLOAD_IMAGE_TEMP_DIR, UPLOAD_IMAGE_DIR, UPLOAD_VIDEO_DIR } from '~/constants/dir'
import { Request } from 'express'
import formidable, { File } from 'formidable'

export const initFolder = () => {
  //ko có thì mới cần tạo
  ;[UPLOAD_IMAGE_TEMP_DIR, UPLOAD_IMAGE_DIR, UPLOAD_VIDEO_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  })
}

export const handleUploadSingleImage = async (req: Request) => {
  //tạo thằng formidable để parse (form data - dữ liệu từ form do client gửi lên)
  const form = formidable({
    uploadDir: path.resolve(UPLOAD_IMAGE_TEMP_DIR),
    keepExtensions: true, //giữ lại đuôi file được gửi lên
    maxFiles: 1,
    maxFileSize: 300 * 1024 * 1024, //300kb
    //thêm một hàm kiểm tra
    filter: function ({ name, originalFilename, mimetype }) {
      //điều kiện để valid
      const valid = name === 'image' && Boolean(mimetype?.includes('image/'))
      if (!valid) {
        form.emit('error' as any, new Error('Not File Type') as any)
      }
      //nếu oke
      return valid //hiện tại là true, còn false là kẹt ở trên ròi
    }
  }) // cấu hình muốn nhận vào cái gì8

  //parse dữ liệu từ form của req do client gửi lên
  return new Promise<File>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err)
      }
      if (!files.image) {
        return reject(new Error('Image is empty'))
      }
      return resolve(files.image[0] as File)
    })
  })
}

export const getNameFromFileName = (filename: string) => {
  const nameArr = filename.split('.')
  nameArr.pop()
  return nameArr.join('.')
}

export const getExtFromFileName = (filename: string) => {
  const nameArr = filename.split('.')
  return nameArr.pop()
}
//abc.png 4:1 jpg
//abc.jpg

export const handleUploadSingleVideo = async (req: Request) => {
  //tạo thằng formidable để parse (form data - dữ liệu từ form do client gửi lên)
  const form = formidable({
    uploadDir: path.resolve(UPLOAD_VIDEO_DIR),
    keepExtensions: true, //giữ lại đuôi file được gửi lên
    maxFiles: 1,
    maxFileSize: 500 * 1024 * 1024, //300kb
    //thêm một hàm kiểm tra
    filter: function ({ name, originalFilename, mimetype }) {
      //điều kiện để valid
      const valid = name === 'video' && Boolean(mimetype?.includes('video/'))
      if (!valid) {
        form.emit('error' as any, new Error('Not File Type') as any)
      }
      //nếu oke
      return valid //hiện tại là true, còn false là kẹt ở trên ròi
    }
  }) // cấu hình muốn nhận vào cái gì8

  //parse dữ liệu từ form của req do client gửi lên
  return new Promise<File>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err)
      }
      if (!files.video) {
        return reject(new Error('Video is empty'))
      }
      return resolve(files.video[0] as File)
    })
  })
}
