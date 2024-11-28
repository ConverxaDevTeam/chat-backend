import { Test, TestingModule } from '@nestjs/testing';
import { LlmAgentController } from './llm-agent.controller';

describe('LlmAgentController', () => {
  let controller: LlmAgentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LlmAgentController],
    }).compile();

    controller = module.get<LlmAgentController>(LlmAgentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
