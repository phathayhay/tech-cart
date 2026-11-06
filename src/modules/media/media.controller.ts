import { Controller, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Request } from 'express'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { MediaService } from './media.service'

@ApiTags('Media & Cloudinary Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-image')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'FR-USER-002 / FR-PROD-002: Compress image via Sharp and upload to Cloudinary'
  })
  async uploadImage(@Req() req: Request) {
    const data = await this.mediaService.uploadImage(req)
    return {
      message: 'Tải ảnh lên Cloudinary thành công',
      data
    }
  }
}
