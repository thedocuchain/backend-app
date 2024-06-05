import { Injectable } from '@nestjs/common';
import { DownloadResponse, Storage } from '@google-cloud/storage';

import { ConfigService } from '@nestjs/config';
import { getGCStorageConfig } from '../configs/gcstorage.config';
import { FileStorage } from './entities/file-storage.entity';

@Injectable()
export class FileStorageService {
  private storage: Storage;
  private bucket: string;

  constructor(configService: ConfigService) {
    this.storage = new Storage({
      projectId: configService.get('GCS_PROJECT_ID'),
      credentials: getGCStorageConfig(configService),
    });

    this.bucket = configService.get('GCS_BUCKET_NAME');
  }

  async save(
    path: string,
    media: Buffer,
    metadata: { [key: string]: string }[],
  ) {
    await this.checkAndConfigureBucketCors();
    const object = metadata.reduce((obj, item) => Object.assign(obj, item), {});
    const file = this.storage.bucket(this.bucket).file(path);
    const stream = file.createWriteStream();
    stream.on('finish', async () => {
      return await file.setMetadata({
        metadata: object,
      });
    });
    stream.end(media);
  }

  async delete(path: string) {
    await this.storage
      .bucket(this.bucket)
      .file(path)
      .delete({ ignoreNotFound: true });
  }

  async getWithMetaData(path: string): Promise<FileStorage> {
    const [bucketObj] = await this.storage
      .bucket(this.bucket)
      .file(path)
      .getMetadata();
    const { metadata } = bucketObj;
    const fileResponse: DownloadResponse = await this.storage
      .bucket(this.bucket)
      .file(path)
      .download();
    const [buffer] = fileResponse;

    const storageFile = new FileStorage();
    storageFile.buffer = buffer;
    storageFile.metadata = new Map<string, string>(
      Object.entries(metadata || {}) as [string, string][],
    );

    storageFile.contentType = storageFile.metadata.get('contentType');
    return storageFile;
  }

  async getSignedUrl(path: string, isDownload = false): Promise<string> {
    const responseType = isDownload
      ? 'application/octet-stream'
      : 'application/pdf';
    const [signedUrl] = await this.storage
      .bucket(this.bucket)
      .file(path)
      .getSignedUrl({
        action: 'read',
        expires: Date.now() + 24 * 1000 * 60 * 60,
        version: 'v4',
        responseType,
        responseDisposition: 'inline',
      });

    return signedUrl;
  }

  async replaceFile(
    path: string,
    newMedia: Buffer,
    newMetadata: Map<string, string>,
  ) {
    await this.delete(path);

    const metadataArray = Array.from(newMetadata.entries()).map(
      ([key, value]) => ({ [key]: value }),
    );
    await this.save(path, newMedia, metadataArray);
  }

  async configureBucketCors() {
    await this.storage.bucket(this.bucket).setCorsConfiguration([
      {
        origin: ['*'],
        method: ['*'],
        maxAgeSeconds: 3600,
        responseHeader: ['*'],
      },
    ]);
  }

  async getBucketCors() {
    const [metadata] = await this.storage.bucket(this.bucket).getMetadata();
    return metadata.cors || [];
  }

  async checkAndConfigureBucketCors() {
    const corsConfiguration = await this.getBucketCors();
    if (corsConfiguration.length === 0) {
      await this.configureBucketCors();
    }
  }
}
