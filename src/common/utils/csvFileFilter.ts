import { BadRequestException } from '@nestjs/common';

export const csvFileFilter = (
  req: any,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  // Check for CSV MIME types or file extension
  if (
    file.mimetype === 'text/csv' ||
    file.mimetype === 'application/csv' ||
    file.mimetype === 'application/vnd.ms-excel' ||
    file.originalname.toLowerCase().endsWith('.csv')
  ) {
    callback(null, true);
  } else {
    callback(new BadRequestException('Only CSV files are supported.'), false);
  }
};
