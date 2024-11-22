import { BadRequestException } from '@nestjs/common';

export const csvFileFilter = (
  req: any,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (file.mimetype !== 'text/csv') {
    return callback(
      new BadRequestException('Only CSV files are supported.'),
      false,
    );
  }
  callback(null, true);
};
