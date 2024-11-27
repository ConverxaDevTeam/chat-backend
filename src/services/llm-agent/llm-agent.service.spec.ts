import { Test, TestingModule } from '@nestjs/testing';
import { LlmAgentService } from './llm-agent.service';

describe('LlmAgentService', () => {
  let service: LlmAgentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LlmAgentService],
    }).compile();

    service = module.get<LlmAgentService>(LlmAgentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
