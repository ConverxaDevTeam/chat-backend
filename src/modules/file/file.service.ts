import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import * as fs from 'fs';

@Injectable()
export class FileService {
  constructor(private readonly configService: ConfigService) {}

  async saveFile(file: Express.Multer.File, path: string, fileName: string): Promise<string> {
    if (!file) throw new BadRequestException('No file uploaded');

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG and GIF are allowed');
    }

    const maxFileSize = 5 * 1024 * 1024;
    if (file.size > maxFileSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    const uploadDir = join(process.cwd(), 'uploads', path);
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const extension = file.originalname.split('.').pop();
    const finalFileName = `${fileName}.${extension}`;
    const filePath = join(uploadDir, finalFileName);

    try {
      await fs.promises.writeFile(filePath, file.buffer);
      const baseUrl = this.configService.get<string>('URL_FILES') || 'http://localhost:3001';
      return `${baseUrl}/${path}/${finalFileName}`;
    } catch (error) {
      throw new InternalServerErrorException('Failed to save the file');
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) await fs.promises.unlink(filePath);
    } catch (error) {
      throw new InternalServerErrorException('Failed to delete the file');
    }
  }
}
