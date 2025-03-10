import { Injectable, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import * as fs from 'fs';
import * as mammoth from 'mammoth';
import * as pdfParse from 'pdf-parse';
import * as pptx2json from 'pptx2json';

@Injectable()
export class FileService {
  constructor(private readonly configService: ConfigService) {}

  async saveFile(file: Express.Multer.File, path: string, fileName: string): Promise<string> {
    if (!file) throw new BadRequestException('No file uploaded');
    console.log('File uploaded:', file.mimetype);

    const allowedMimeTypes = [
      // Imágenes
      'image/jpeg',
      'image/png',
      'image/gif',
      // Documentos
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Texto y código
      'text/plain',
      'text/html',
      'text/css',
      'text/markdown',
      'text/x-java',
      'text/x-c',
      'text/x-c++',
      'text/x-csharp',
      'text/x-go',
      'text/x-python',
      'text/x-ruby',
      'text/x-sh',
      'text/x-tex',
      'text/javascript',
      'application/javascript',
      'application/typescript',
      'application/json',
      'application/xml',
      'text/x-php',
      'application/x-httpd-php',
    ];

    // Si el tipo MIME no está en la lista pero la extensión es válida, permitir
    const validExtensions = [
      'jpg',
      'jpeg',
      'png',
      'gif',
      'pdf',
      'doc',
      'docx',
      'ppt',
      'pptx',
      'txt',
      'html',
      'css',
      'md',
      'java',
      'c',
      'cpp',
      'cs',
      'go',
      'py',
      'rb',
      'sh',
      'tex',
      'js',
      'ts',
      'json',
      'xml',
      'php',
    ];

    const fileExtension = file.originalname.split('.').pop()?.toLowerCase() || '';
    const isValidExtension = validExtensions.includes(fileExtension);

    if (!allowedMimeTypes.includes(file.mimetype) && !isValidExtension) {
      throw new BadRequestException(`Invalid file type. Allowed extensions: ${validExtensions.join(', ')}`);
    }

    const maxFileSize = 5 * 1024 * 1024;
    if (file.size > maxFileSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    const uploadDir = join(process.cwd(), 'uploads', path);
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const extension = file.originalname.split('.').pop() || '';
    const finalFileName = `${fileName}${extension ? '.' + extension : ''}`;
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

  async deleteFileByPattern(directory: string, fileNamePattern: string): Promise<void> {
    try {
      if (!fs.existsSync(directory)) return;

      const files = fs.readdirSync(directory);
      const matchingFiles = files.filter((file) => file.startsWith(fileNamePattern + '.'));

      for (const file of matchingFiles) {
        await fs.promises.unlink(join(directory, file));
      }
    } catch (error) {
      throw new InternalServerErrorException(`Failed to delete files with pattern ${fileNamePattern}`);
    }
  }

  async extractTextFromPdf(fileBuffer: Buffer): Promise<string> {
    const data = await pdfParse(fileBuffer);
    return data.text;
  }

  async extractTextFromPptx(fileBuffer: Buffer): Promise<string> {
    const presentation = await pptx2json(fileBuffer);
    return presentation.slides.map((slide) => slide.text).join('\n');
  }

  async extractTextFromDocx(fileBuffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value;
  }

  async findAndExtractText(directory: string, fileNamePattern: string): Promise<string> {
    if (!fs.existsSync(directory)) throw new NotFoundException('Directory not found');

    const files = fs.readdirSync(directory);
    const file = files.find((f) => f.startsWith(fileNamePattern + '.'));
    if (!file) throw new NotFoundException('File not found');

    const extension = file.split('.').pop();
    const fileBuffer = await fs.promises.readFile(join(directory, file));

    switch (extension) {
      case 'pdf':
        return this.extractTextFromPdf(fileBuffer);
      case 'pptx':
        return this.extractTextFromPptx(fileBuffer);
      case 'docx':
        return this.extractTextFromDocx(fileBuffer);
      default:
        try {
          return fileBuffer.toString('utf-8');
        } catch {
          throw new BadRequestException('Unsupported file format');
        }
    }
  }
}
