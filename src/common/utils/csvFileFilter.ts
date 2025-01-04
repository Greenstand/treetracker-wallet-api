import { BadRequestException } from '@nestjs/common';

export const csvFileFilter = (
  req: any,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (
    file.mimetype === 'text/csv' ||
    file.mimetype === 'application/csv' ||
    file.mimetype === 'application/vnd.ms-excel' ||
    (file.originalname && file.originalname.toLowerCase().endsWith('.csv'))
  ) {
    callback(null, true);
  } else {
    callback(new BadRequestException('Only CSV files are supported.'), false);
  }
};
