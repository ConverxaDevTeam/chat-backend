import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export enum InputType {
  Document = 'document',
  Query = 'query',
}

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

  async getEmbedding(texts: string[], inputType: InputType = InputType.Document, model = 'voyage-3'): Promise<number[][]> {
    try {
      // Filtrar textos vacíos
      const filteredTexts = texts.filter((text) => text.trim().length > 0);
      if (filteredTexts.length === 0) {
        return [];
      }

      const response = await axios.post(
        `${this.baseUrl}/embeddings`,
        {
          input: filteredTexts,
          model,
          input_type: inputType,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );
      // La API devuelve un embedding por cada texto en el array de entrada
      return response.data.data.map((item) => item.embedding);
    } catch (error) {
      console.error('Error detallado:', error.response?.data || error.message);
      throw new Error(`Failed to get embedding: ${error}`);
    }
  }
}
