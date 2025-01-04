import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as uuid from 'uuid';
import { csvFileFilter } from '../utils/csvFileFilter';

export const CsvFileUploadInterceptor = () =>
  FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, callback) => {
        const uniqueFilename = `${file.fieldname}-${uuid.v4()}-${file.originalname}`;
        callback(null, uniqueFilename);
      },
    }),
    fileFilter: csvFileFilter,
    limits: { fileSize: 500000 }, // Set file size limit (500KB)
  });
