import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { convert } from 'html-to-text';
import axios from 'axios';
import { FunctionTemplateService } from './function-template.service';
import { ClaudeSonetService } from 'src/services/llm-agent/claude-sonet.service';
import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';
import { FunctionTemplateApplication } from '@models/function-template/function-template-application.entity';
import { FunctionTemplate } from '@models/function-template/function-template.entity';
import { FunctionTemplateTag } from '@models/function-template/function-template-tag.entity';

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
      return [];
    }
  }

  convertHtmlToText(html: string): { text: string; relevantHeaders: string[] } {
    try {
      // Extraer headers relevantes que pueden contener información sobre la aplicación
      const $ = cheerio.load(html);
      const allHeaders: string[] = [];

      // Obtener título de la página
      const title = $('title').text().trim();
      if (title) allHeaders.push(title);

      // Obtener meta tags relevantes
      const metaTags = ['og:site_name', 'og:title', 'application-name']
        .map((name) => {
          const content = $(`meta[property="${name}"], meta[name="${name}"]`).attr('content');
          return content ? `${name}: ${content}` : null;
        })
        .filter(Boolean) as string[];

      allHeaders.push(...metaTags);

      // Obtener headers principales (h1, h2)
      const mainHeaders: string[] = [];
      $('h1, h2')
        .slice(0, 5)
        .each((_, elem) => {
          const text = $(elem).text().trim();
          if (text && text.length > 2 && text.length < 50) {
            mainHeaders.push(text);
          }
        });

      allHeaders.push(...mainHeaders);

      // Filtrar headers irrelevantes usando regex
      const irrelevantPatterns = [
        /login|sign in|register|contact|about|help|support|privacy|terms/i,
        /cookie|copyright|menu|navigation|search|cart|checkout/i,
        /account|profile|settings|preferences|faq|blog|news/i,
      ];

      const relevantHeaders = allHeaders.filter((header) => !irrelevantPatterns.some((pattern) => pattern.test(header)));

      // Convertir HTML a texto
      const text = convert(html, {
        wordwrap: 130,
        selectors: [
          { selector: 'a', options: { ignoreHref: true } },
          { selector: 'script', format: 'skip' },
          { selector: 'style', format: 'skip' },
        ],
      });

      return { text, relevantHeaders };
    } catch (error) {
      throw new HttpException('Error al procesar el contenido HTML', HttpStatus.BAD_REQUEST);
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
    relevantHeaders: string[] = [],
  ): Promise<{ templates: any[]; applicationInfo?: any; categories?: string[]; lastProcessedLine: number }> {
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

    // Crear el prompt según sea primera llamada o no
    let systemPrompt = '';

    if (isFirstCall) {
      // Prompt para la primera llamada (con información de aplicación y categorías)
      systemPrompt = `
Eres un asistente especializado en crear templates de funciones API y aplicaciones a partir de contenido web.
Tu tarea es analizar el contenido proporcionado y:
1. Sugerir una aplicación basada en el sitio web analizado
2. Proponer categorías relevantes para las funciones de la aplicación
3. Generar un template estructurado para la primera función de API

Analiza el siguiente contenido extraído de una página web (cada línea está numerada):
${chunksText}
${imagesText}
`;

      if (additionalMessage) {
        systemPrompt += `
Instrucciones adicionales: ${additionalMessage}
`;
      }

      if (relevantHeaders.length > 0) {
        systemPrompt += `
He extraído los siguientes headers relevantes de la página que podrían ayudarte a determinar el nombre de la aplicación:
${relevantHeaders.map((h) => `- ${h}`).join('\n')}

`;
      }

      systemPrompt += `
Responde ÚNICAMENTE en formato JSON con la siguiente estructura:
{
  "applicationInfo": {
    "name": "Nombre de la aplicación",
    "description": "Descripción detallada de la aplicación",
    "domain": "dominio.com",
    "logoImageId": "img_X" // ID de la imagen sugerida como logo (de la lista proporcionada)
  },
  "categories": ["Categoría 1", "Categoría 2", "Categoría 3"], // Sugerencias de categorías para organizar las funciones
  "templates": [
    {
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
      "tags": ["Tag1", "Tag2", "Tag3"], // Etiquetas relevantes para esta función
      "implementationNotes": "Notas para la implementación",
      "endLine": 123 // Número de línea donde termina esta función
    }
  ],
  "lastProcessedLine": 123 // número de la última línea procesada
}
`;
    } else {
      // Prompt para llamadas subsecuentes (solo templates)
      systemPrompt = `
Eres un asistente especializado en crear templates de funciones API a partir de contenido web.
Tu tarea es analizar el contenido proporcionado y generar templates estructurados para implementar funcionalidad similar.

Analiza el siguiente contenido extraído de una página web (cada línea está numerada):
${chunksText}
`;

      if (additionalMessage) {
        systemPrompt += `
Instrucciones adicionales: ${additionalMessage}
`;
      }

      if (relevantHeaders.length > 0) {
        systemPrompt += `
He extraído los siguientes headers relevantes de la página que podrían ayudarte a determinar el nombre de la aplicación:
${relevantHeaders.map((h) => `- ${h}`).join('\n')}

`;
      }

      systemPrompt += `
Responde ÚNICAMENTE en formato JSON con la siguiente estructura:
{
  "templates": [
    {
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
      "tags": ["Tag1", "Tag2", "Tag3"], // Etiquetas relevantes para esta función
      "implementationNotes": "Notas para la implementación",
      "endLine": 123 // Número de línea donde termina esta función
    }
  ],
  "lastProcessedLine": 123 // número de la última línea procesada
}
`;
    }

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
            templates: parsedResponse.templates || [parsedResponse.template].filter(Boolean),
            applicationInfo: parsedResponse.applicationInfo,
            categories: parsedResponse.categories,
            lastProcessedLine: lastLine,
          };
        }

        return {
          templates: parsedResponse.templates || [parsedResponse.template].filter(Boolean),
          lastProcessedLine: lastLine,
        };
      } catch (parseError) {
        throw new HttpException(
          {
            ok: false,
            message: 'Error al procesar la respuesta de la IA',
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: 'Error al comunicarse con el servicio de IA',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Método para generar template a partir de texto o HTML directamente
  async generateFromText(
    content: string,
    additionalMessage?: string,
    lastProcessedLine: number = 0,
    isNewTemplate: boolean = true,
    createdIds?: { applicationId?: string; categoryIds?: string[] },
    sourceUrl?: string,
  ) {
    // Determinar si el contenido es HTML o texto plano
    let text = content;
    let images: { id: string; url: string; alt: string; width: number; height: number }[] = [];

    // Si parece ser HTML, convertirlo a texto y extraer imágenes
    let relevantHeaders: string[] = [];
    if (content.includes('<html') || content.includes('<body') || content.includes('<div')) {
      try {
        const result = this.convertHtmlToText(content);
        text = result.text;
        relevantHeaders = result.relevantHeaders;
        // Para extraer imágenes usamos la URL proporcionada o una genérica
        const baseUrl = sourceUrl || 'https://example.com';
        images = this.extractImages(content, baseUrl);
      } catch (error) {
        // Tratando como texto plano
      }
    }

    // Preparar chunks de texto
    const textChunks = this.prepareContentChunks(text);

    // Si es una nueva plantilla, la IA debe generar información de la aplicación
    // Si es una continuación, solo se genera el template
    const isFirstCall = isNewTemplate && lastProcessedLine === 0;

    // Generar templates con IA (y posiblemente información de la aplicación si es primera llamada)
    const result = await this.generateTemplateFromText(textChunks, images, additionalMessage, lastProcessedLine, isFirstCall, relevantHeaders);
    // Si es la primera vez y tenemos información de aplicación y categorías
    if (isFirstCall && result.applicationInfo && result.categories) {
      // Verificar si ya existe la aplicación por dominio o crear una nueva
      let application: FunctionTemplateApplication;
      // Usar sourceUrl como dominio si está disponible, o el dominio proporcionado por la IA
      const domain = sourceUrl ? new URL(sourceUrl).hostname : result.applicationInfo.domain;
      const existingApp = await this.templateService.getApplicationByDomain(domain);
      if (existingApp) {
        application = existingApp;
      } else {
        // Buscar la URL de la imagen de logo
        let logoFile: Express.Multer.File | undefined;
        if (result.applicationInfo.logoImageId) {
          const logoImage = images.find((img) => img.id === result.applicationInfo.logoImageId);
          if (logoImage) {
            try {
              const response = await axios.get(logoImage.url, {
                responseType: 'arraybuffer',
                timeout: 10000, // 10 segundos de timeout
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                },
                maxRedirects: 5,
              });

              if (response.status === 200 && response.data) {
                const tempFilePath = `/tmp/${logoImage.id}`;
                await fs.writeFile(tempFilePath, response.data);

                const contentType = response.headers['content-type'] || 'image/jpeg';

                logoFile = {
                  fieldname: 'image',
                  originalname: `logo.${contentType.split('/')[1] || 'jpg'}`,
                  encoding: '7bit',
                  mimetype: contentType,
                  size: response.data.length,
                  buffer: response.data,
                  destination: '',
                  filename: 'logo',
                  path: tempFilePath,
                } as Express.Multer.File;
              } else {
                // Error al descargar imagen
              }
            } catch (error) {
              // Error al descargar la imagen del logo
            }
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
      createdIds.applicationId = application.id.toString();
      createdIds.categoryIds = processedCategories.map((c) => c.id.toString());

      // Guardar los templates generados en la base de datos
      const savedTemplates = await this.saveGeneratedTemplates(result.templates, application.id, processedCategories);

      return {
        ok: true,
        message: 'Templates y aplicación generados con éxito',
        data: {
          templates: savedTemplates,
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

      // Guardar los templates generados en la base de datos si tenemos los IDs necesarios
      let savedTemplates = result.templates;
      if (createdIds?.applicationId && categories.length > 0) {
        savedTemplates = await this.saveGeneratedTemplates(result.templates, parseInt(createdIds.applicationId), categories);
      }

      return {
        ok: true,
        message: 'Templates generados con éxito',
        data: {
          templates: savedTemplates,
          categories,
          applications,
          lastProcessedLine: result.lastProcessedLine,
          createdIds,
        },
      };
    }
  }

  /**
   * Guarda los templates generados en la base de datos
   * @param templates Templates generados por la IA
   * @param applicationId ID de la aplicación
   * @param categories Categorías disponibles
   * @returns Templates guardados
   */
  private async saveGeneratedTemplates(templates: any[], applicationId: number, categories: any[]): Promise<FunctionTemplate[]> {
    if (!templates || templates.length === 0) {
      return [];
    }

    // Crear un mapa de nombres de categorías a IDs para búsqueda rápida
    const categoryMap = new Map<string, number>();
    categories.forEach((category) => {
      categoryMap.set(category.name, category.id);
    });

    // Convertir los templates generados al formato esperado por createTemplate
    const savedTemplates: FunctionTemplate[] = [];

    for (const template of templates) {
      try {
        // Obtener el ID de la categoría sugerida o usar la primera disponible
        const categoryId = template.suggestedCategory && categoryMap.has(template.suggestedCategory) ? categoryMap.get(template.suggestedCategory) : categories[0]?.id;

        if (!categoryId) {
          continue;
        }

        // Convertir parámetros al formato esperado por createTemplate (Record<string, param>)
        const paramsArray = template.params || [];
        const params: Record<string, any> = {};

        // Convertir el array de parámetros a un objeto donde el nombre es la clave
        paramsArray.forEach((param) => {
          if (param.name) {
            params[param.name] = {
              name: param.name,
              title: param.name,
              description: param.description,
              type: param.type || 'string', // Valor por defecto si no se especifica
              required: param.required || false,
              location: param.location || 'body',
            };
          }
        });

        // Procesar tags si existen
        let tags: FunctionTemplateTag[] = [];
        if (template.tags && Array.isArray(template.tags) && template.tags.length > 0) {
          tags = await this.templateService.getTagsByNames(template.tags);
        }

        // Crear el template
        const templateDto = {
          name: template.name,
          description: template.description,
          categoryId,
          applicationId,
          url: template.endpoint || '',
          method: template.method || 'GET',
          bodyType: 'json',
          params,
          tags,
        };

        const savedTemplate = await this.templateService.createTemplate(templateDto);
        savedTemplates.push(savedTemplate);
      } catch (error) {
        console.error('Error al guardar template:', error, template);
      }
    }

    return savedTemplates;
  }

  /**
   * Muestra información sobre la línea final procesada
   * @param lastProcessedLine Número de línea final procesada
   * @param textChunks Chunks de texto procesados
   */
  private logFinalLine(lastProcessedLine: number, textChunks: Array<[number, string]>): void {
    // Buscar 10 líneas antes y 10 después de la línea final
    const startLine = Math.max(0, lastProcessedLine - 10);
    const endLine = lastProcessedLine + 10;

    const relevantChunks = textChunks.filter(([lineNum]) => lineNum >= startLine && lineNum <= endLine);

    console.log(`\nInformación sobre la línea final procesada (${lastProcessedLine}):\n`);
    relevantChunks.forEach(([lineNum, text]) => {
      const marker = lineNum === lastProcessedLine ? '>>> ' : '    ';
      console.log(`${marker}[${lineNum}] ${text}`);
    });
    console.log('\n');
  }
}
