import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { convert } from 'html-to-text';
import axios from 'axios';
import { FunctionTemplateService } from './function-template.service';
import { ClaudeSonetService } from 'src/services/llm-agent/claude-sonet.service';
import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';

@Injectable()
export class TemplateGeneratorService {
  constructor(private readonly templateService: FunctionTemplateService) {}

  async fetchHtmlFromUrl(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000, // 10 segundos de timeout
      });
      return response.data;
    } catch (error) {
      console.error('Error al obtener HTML:', error);
      throw new HttpException(
        {
          ok: false,
          message: 'Error al acceder a la URL proporcionada',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  extractImages(html: string, baseUrl: string): { id: string; url: string; alt: string; width: number; height: number }[] {
    try {
      const $ = cheerio.load(html);
      const images: { id: string; url: string; alt: string; width: number; height: number }[] = [];

      $('img').each((i, elem) => {
        const src = $(elem).attr('src');
        if (!src) return;

        // Convertir URLs relativas a absolutas
        const fullUrl = src.startsWith('http') ? src : new URL(src, baseUrl).href;

        images.push({
          id: `img_${i}`,
          url: fullUrl,
          alt: $(elem).attr('alt') || '',
          width: parseInt($(elem).attr('width') || '0', 10) || 0,
          height: parseInt($(elem).attr('height') || '0', 10) || 0,
        });
      });

      return images;
    } catch (error) {
      console.error('Error al extraer imágenes:', error);
      return [];
    }
  }

  convertHtmlToText(html: string): string {
    try {
      return convert(html, {
        wordwrap: 130,
        selectors: [
          { selector: 'a', options: { ignoreHref: true } },
          { selector: 'img', format: 'skip' },
          { selector: 'script', format: 'skip' },
          { selector: 'style', format: 'skip' },
        ],
      });
    } catch (error) {
      console.error('Error al convertir HTML a texto:', error);
      throw new HttpException(
        {
          ok: false,
          message: 'Error al procesar el contenido HTML',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  prepareContentChunks(text: string): Array<[number, string]> {
    const lines = text.split('\n');
    return lines.map((line, index) => [index + 1, line.trim()] as [number, string]).filter(([, line]) => line.length > 0);
  }

  async generateTemplateFromText(
    textChunks: Array<[number, string]>,
    images: { id: string; url: string; alt: string; width: number; height: number }[] = [],
    additionalMessage: string = '',
    lastProcessedLine: number = 0,
    isFirstCall: boolean = false,
  ): Promise<{ template: any; applicationInfo?: any; categories?: string[]; lastProcessedLine: number }> {
    // Filtrar chunks a partir de la última línea procesada
    const chunksToProcess = textChunks.filter(([lineNum]) => lineNum > lastProcessedLine);
    // Tomar solo los primeros 400 chunks para evitar exceder límites de tokens
    const chunksToSend = chunksToProcess.slice(0, 400);

    if (chunksToSend.length === 0) {
      throw new HttpException(
        {
          ok: false,
          message: 'No hay más contenido para procesar',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Preparar el prompt para Claude
    const chunksText = chunksToSend.map(([num, text]) => `[${num}] ${text}`).join('\n');

    // Preparar información de imágenes si hay alguna
    const imagesText =
      images.length > 0
        ? `
Imágenes encontradas en la página (potenciales logos):
${images.map((img) => `[${img.id}] URL: ${img.url}, Alt: ${img.alt}, Tamaño: ${img.width}x${img.height}`).join('\n')}`
        : '';

    // El prompt cambia dependiendo de si es la primera llamada o no
    const systemPrompt = isFirstCall
      ? `
Eres un asistente especializado en crear templates de funciones API y aplicaciones a partir de contenido web.
Tu tarea es analizar el contenido proporcionado y:
1. Sugerir una aplicación basada en el sitio web analizado
2. Proponer categorías relevantes para las funciones de la aplicación
3. Generar un template estructurado para la primera función de API

Analiza el siguiente contenido extraído de una página web (cada línea está numerada):
${chunksText}
${imagesText}

${additionalMessage ? `Instrucciones adicionales: ${additionalMessage}\n` : ''}

Responde ÚNICAMENTE en formato JSON con la siguiente estructura:
{
  "applicationInfo": {
    "name": "Nombre de la aplicación",
    "description": "Descripción detallada de la aplicación",
    "domain": "dominio.com",
    "logoImageId": "img_X" // ID de la imagen sugerida como logo (de la lista proporcionada)
  },
  "categories": ["Categoría 1", "Categoría 2", "Categoría 3"], // Sugerencias de categorías para organizar las funciones
  "template": {
    "name": "Nombre descriptivo del template",
    "description": "Descripción detallada",
    "endpoint": "/ruta/sugerida",
    "method": "GET|POST|PUT|DELETE",
    "params": [
      {
        "name": "nombreParametro",
        "type": "string|number|boolean|object",
        "description": "Descripción del parámetro",
        "required": true|false,
        "location": "body|query|path"
      }
    ],
    "responseSchema": {
      "type": "object",
      "properties": {
        "nombrePropiedad": {
          "type": "string|number|boolean|object|array",
          "description": "Descripción de la propiedad"
        }
      }
    },
    "suggestedCategory": "Categoría 1", // Elije una de las categorías sugeridas arriba
    "implementationNotes": "Notas para la implementación"
  },
  "lastProcessedLine": 123 // número de la última línea procesada
}
`
      : `
Eres un asistente especializado en crear templates de funciones API a partir de contenido web.
Tu tarea es analizar el contenido proporcionado y generar un template estructurado para implementar funcionalidad similar.

Analiza el siguiente contenido extraído de una página web (cada línea está numerada):
${chunksText}

${additionalMessage ? `Instrucciones adicionales: ${additionalMessage}\n` : ''}

Responde ÚNICAMENTE en formato JSON con la siguiente estructura:
{
  "template": {
    "name": "Nombre descriptivo del template",
    "description": "Descripción detallada",
    "endpoint": "/ruta/sugerida",
    "method": "GET|POST|PUT|DELETE",
    "params": [
      {
        "name": "nombreParametro",
        "type": "string|number|boolean|object",
        "description": "Descripción del parámetro",
        "required": true|false,
        "location": "body|query|path"
      }
    ],
    "responseSchema": {
      "type": "object",
      "properties": {
        "nombrePropiedad": {
          "type": "string|number|boolean|object|array",
          "description": "Descripción de la propiedad"
        }
      }
    },
    "suggestedCategory": "Categoría sugerida",
    "implementationNotes": "Notas para la implementación"
  },
  "lastProcessedLine": 123 // número de la última línea procesada
}
`;

    try {
      // Usar el método estático de ClaudeSonetService para generar contenido
      const content = await ClaudeSonetService.generateContent(systemPrompt, 'Genera el template basado en el contenido proporcionado.', 4000, 0.7);
      try {
        // Extraer solo el JSON válido de la respuesta (ignorando markdown, etc.)
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/({[\s\S]*})/);
        const jsonStr = jsonMatch ? jsonMatch[1] : content;
        const parsedResponse = JSON.parse(jsonStr);

        // Encontrar la última línea procesada o usar la última del chunk actual
        const lastLine = parsedResponse.lastProcessedLine || (chunksToSend.length > 0 ? chunksToSend[chunksToSend.length - 1][0] : lastProcessedLine);

        // Si es la primera llamada, incluir la información de la aplicación y categorías
        if (isFirstCall) {
          return {
            template: parsedResponse.template,
            applicationInfo: parsedResponse.applicationInfo,
            categories: parsedResponse.categories,
            lastProcessedLine: lastLine,
          };
        }

        return {
          template: parsedResponse.template,
          lastProcessedLine: lastLine,
        };
      } catch (parseError) {
        console.error('Error al parsear respuesta JSON:', parseError, content);
        throw new HttpException(
          {
            ok: false,
            message: 'Error al procesar la respuesta de la IA',
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      console.error('Error con la API de Anthropic:', error);
      throw new HttpException(
        {
          ok: false,
          message: 'Error al comunicarse con el servicio de IA',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async generateFromUrl(
    url: string,
    additionalMessage?: string,
    lastProcessedLine: number = 0,
    isNewTemplate: boolean = true,
    createdIds?: { applicationId?: string; categoryIds?: string[] },
  ) {
    // Obtener HTML y convertirlo a texto
    const html = await this.fetchHtmlFromUrl(url);
    const text = this.convertHtmlToText(html);

    // Extraer imágenes potenciales para logos
    const images = this.extractImages(html, url);

    // Preparar chunks de texto
    const textChunks = this.prepareContentChunks(text);

    // Si es una nueva plantilla, la IA debe generar información de la aplicación
    // Si es una continuación, solo se genera el template
    const isFirstCall = isNewTemplate && lastProcessedLine === 0;

    // Generar template con IA (y posiblemente información de la aplicación si es primera llamada)
    const result = await this.generateTemplateFromText(textChunks, images, additionalMessage, lastProcessedLine, isFirstCall);

    // Si es la primera vez y tenemos información de aplicación y categorías
    if (isFirstCall && result.applicationInfo && result.categories) {
      // Verificar si ya existe la aplicación por dominio o crear una nueva
      let application;
      const domain = result.applicationInfo.domain;
      const existingApp = await this.templateService.getApplicationByDomain(domain);

      if (existingApp) {
        application = existingApp;
      } else {
        // Buscar la URL de la imagen de logo
        let logoFile: Express.Multer.File | undefined;
        if (result.applicationInfo.logoImageId) {
          const logoImage = images.find((img) => img.id === result.applicationInfo.logoImageId);
          if (logoImage) {
            const response = await axios.get(logoImage.url, { responseType: 'arraybuffer' });
            const tempFilePath = `/tmp/${logoImage.id}`;
            await fs.writeFile(tempFilePath, response.data);

            logoFile = {
              fieldname: 'image',
              originalname: 'logo',
              encoding: '7bit',
              mimetype: response.headers['content-type'],
              size: response.data.length,
              buffer: response.data,
              destination: '',
              filename: 'logo',
              path: tempFilePath,
            } as Express.Multer.File;
          }
        }

        // Crear la aplicación
        const newAppResult = await this.templateService.createApplication(
          {
            name: result.applicationInfo.name,
            description: result.applicationInfo.description,
            domain: domain,
            isDynamicDomain: false,
          },
          logoFile,
        );

        application = newAppResult.data;
      }

      // Procesar categorías
      const existingCategories = await this.templateService.getCategoriesByNames(result.categories);
      const existingCategoryNames = new Set(existingCategories.map((c) => c.name));
      const missingCategories = result.categories
        .filter((name) => !existingCategoryNames.has(name))
        .map((name) => ({
          name,
          description: '',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

      const createdCategories = missingCategories.length > 0 ? await this.templateService.createCategoriesBulk(missingCategories) : [];

      const processedCategories = [...existingCategories, ...createdCategories];

      // Guardar IDs creados
      if (!createdIds) createdIds = {};
      createdIds.applicationId = application.id;
      createdIds.categoryIds = processedCategories.map((c) => c.id.toString());

      return {
        ok: true,
        message: 'Template y aplicación generados con éxito',
        data: {
          template: result.template,
          application,
          categories: processedCategories,
          applications: [application],
          lastProcessedLine: result.lastProcessedLine,
          createdIds,
        },
      };
    } else {
      // Obtener solo las categorías y aplicaciones especificadas
      const [categories, applications] = await Promise.all([
        createdIds?.categoryIds ? this.templateService.getCategoriesByIds(createdIds.categoryIds) : [],
        createdIds?.applicationId ? this.templateService.getApplicationsByIds([createdIds.applicationId]) : [],
      ]);

      return {
        ok: true,
        message: 'Template generado con éxito',
        data: {
          template: result.template,
          categories,
          applications,
          lastProcessedLine: result.lastProcessedLine,
          createdIds,
        },
      };
    }
  }
}
