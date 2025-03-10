import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class VoyageService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.voyageai.com/v1';

  constructor(private configService: ConfigService) {
    const key = this.configService.get<string>('VOYAGE_API_KEY');
    if (!key) {
      throw new Error('VOYAGE_API_KEY is not configured');
    }
    this.apiKey = key;
  }

  async getEmbedding(text: string[], model = 'voyage-01'): Promise<number[]> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/embeddings`,
        {
          input: text,
          model,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );
      return response.data.data[0].embedding;
    } catch (error) {
      throw new Error(`Failed to get embedding: ${error}`);
    }
  }
}
