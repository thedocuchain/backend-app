import { Test, TestingModule } from '@nestjs/testing';
import { TransformFormatService } from './transform-format.service';

describe('TransformFormatService', () => {
  let service: TransformFormatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransformFormatService],
    }).compile();

    service = module.get<TransformFormatService>(TransformFormatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
