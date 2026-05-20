import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { extname } from 'path';

@Injectable()
export class R2Service {
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;
  private readonly logger = new Logger(R2Service.name);

  constructor(private configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID', '');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID', '');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY', '');
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME', 'app-uploads');
    this.publicUrl = this.configService.get<string>(
      'R2_PUBLIC_URL',
      `https://${this.bucketName}.r2.dev`,
    );

    // Cloudflare R2 S3 endpoint structure: https://<account_id>.r2.cloudflarestorage.com
    const endpoint = accountId
      ? `https://${accountId}.r2.cloudflarestorage.com`
      : this.configService.get<string>('R2_ENDPOINT', '');

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: endpoint,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });
  }

  async uploadFile(file: Express.Multer.File, folder = 'uploads'): Promise<string> {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const fileExt = extname(file.originalname);
    const fileName = `${folder}/${uniqueSuffix}${fileExt}`;

    try {
      this.logger.log(`Iniciando upload de arquivo para R2: ${fileName}`);

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: fileName,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      // Return the public URL of the uploaded file
      const fileUrl = `${this.publicUrl}/${fileName}`;
      this.logger.log(`Upload concluído com sucesso. URL: ${fileUrl}`);
      return fileUrl;
    } catch (error) {
      this.logger.error(`Erro ao fazer upload do arquivo para R2: ${error.message}`);
      throw new Error(`Falha no upload do arquivo: ${error.message}`);
    }
  }
}
