import { Module } from '@nestjs/common';
import { LlmAgentController } from './llm-agent.controller';
import { LlmAgentService } from './llm-agent.service';

@Module({
  controllers: [LlmAgentController],
  providers: [LlmAgentService]
})
export class LlmAgentModule {}
