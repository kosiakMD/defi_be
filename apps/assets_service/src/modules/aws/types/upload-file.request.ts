import { Readable } from 'stream';

export type UploadFileRequest = {
  bucket: string;
  key: string;
  content: Readable;
  contentType: string;
};
