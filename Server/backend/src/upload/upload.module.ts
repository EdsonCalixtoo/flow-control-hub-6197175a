import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { R2Service } from './r2.service';
import { UploadController } from './upload.controller';

@Module({
  imports: [ConfigModule],
  providers: [R2Service],
  controllers: [UploadController],
  exports: [R2Service],
})
export class UploadModule {}
