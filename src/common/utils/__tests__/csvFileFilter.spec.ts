import { csvFileFilter } from '../csvFileFilter';
import { BadRequestException } from '@nestjs/common';

describe('csvFileFilter', () => {
  it('should accept a CSV file', () => {
    const file = { mimetype: 'text/csv' } as Express.Multer.File;
    const callback = jest.fn();
    csvFileFilter(null, file, callback);
    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it('should reject a non-CSV file', () => {
    const file = { mimetype: 'text/plain' } as Express.Multer.File;
    const callback = jest.fn();
    csvFileFilter(null, file, callback);
    expect(callback).toHaveBeenCalledWith(
      expect.any(BadRequestException),
      false,
    );
  });
});
