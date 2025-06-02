import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization, OrganizationType } from '@models/Organization.entity';
import { OrganizationLimit } from '@models/OrganizationLimit.entity';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationLimit)
    private readonly organizationLimitRepository: Repository<OrganizationLimit>,
  ) {}

  /**
   * Reinicia el contador de conversaciones para organizaciones de tipo CUSTOM
   * que fueron creadas en el mismo día y mes que hoy (aniversario)
   * Se ejecuta diariamente a la medianoche
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetConversationCountForCustomOrganizations() {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth() + 1; // getMonth() devuelve 0-11

    this.logger.log(`Iniciando reinicio de contador para organizaciones CUSTOM creadas el día ${currentDay} del mes ${currentMonth}`);

    try {
      // Obtener todas las organizaciones de tipo CUSTOM
      const customOrganizations = await this.organizationRepository.find({
        where: { type: OrganizationType.CUSTOM },
      });

      if (customOrganizations.length === 0) {
        this.logger.log('No se encontraron organizaciones de tipo CUSTOM');
        return;
      }

      this.logger.log(`Se encontraron ${customOrganizations.length} organizaciones de tipo CUSTOM`);

      // Filtrar organizaciones creadas en el mismo día y mes que hoy
      const organizationsCreatedToday = customOrganizations.filter((org) => {
        if (!org.created_at) return false;

        const createdAt = new Date(org.created_at);
        const creationDay = createdAt.getDate();
        const creationMonth = createdAt.getMonth() + 1; // getMonth() devuelve 0-11

        return creationDay === currentDay && creationMonth === currentMonth;
      });

      if (organizationsCreatedToday.length === 0) {
        this.logger.log(`No se encontraron organizaciones CUSTOM creadas el día ${currentDay} del mes ${currentMonth}`);
        return;
      }

      this.logger.log(`Se encontraron ${organizationsCreatedToday.length} organizaciones CUSTOM creadas el día ${currentDay} del mes ${currentMonth}`);

      // Obtener los IDs de las organizaciones
      const organizationIds = organizationsCreatedToday.map((org) => org.id);

      // Obtener los límites de las organizaciones que tienen isMonthly = true
      const limits = await this.organizationLimitRepository.find({
        where: {
          organizationId: { $in: organizationIds } as any,
          isMonthly: true,
        },
      });

      if (limits.length === 0) {
        this.logger.log(`No se encontraron organizaciones CUSTOM creadas el día ${currentDay} del mes ${currentMonth} con límites mensuales`);
        return;
      }

      // Filtrar solo las organizaciones que tienen límites mensuales
      const organizationsToReset = organizationsCreatedToday.filter((org) => limits.some((limit) => limit.organizationId === org.id));

      this.logger.log(`Reiniciando contador para ${organizationsToReset.length} organizaciones CUSTOM creadas el día ${currentDay} del mes ${currentMonth} con límites mensuales`);

      // Reiniciar el contador de conversaciones para cada organización
      for (const organization of organizationsToReset) {
        // Guardar el contador anterior para el log
        const previousCount = organization.conversationCount;

        // Reiniciar el contador
        organization.conversationCount = 0;

        // Guardar la organización actualizada
        await this.organizationRepository.save(organization);

        this.logger.log(`Reiniciado contador de conversaciones para organización ${organization.id} (${organization.name}): ${previousCount} -> 0`);
      }

      this.logger.log(`Reinicio de contador de conversaciones para organizaciones creadas el día ${currentDay} del mes ${currentMonth} completado con éxito`);
    } catch (error) {
      this.logger.error(`Error al reiniciar contador de conversaciones: ${error.message}`, error.stack);
    }
  }

  /**
   * Reinicia el contador de conversaciones para una organización específica
   * Útil para pruebas o reinicio manual
   * @param organizationId ID de la organización
   * @returns Información sobre el reinicio
   */
  async resetConversationCountForOrganization(organizationId: number): Promise<{
    success: boolean;
    previousCount?: number;
    message: string;
  }> {
    try {
      // Obtener la organización
      const organization = await this.organizationRepository.findOne({
        where: { id: organizationId },
      });

      if (!organization) {
        return {
          success: false,
          message: `Organización con ID ${organizationId} no encontrada`,
        };
      }

      // Verificar si es de tipo CUSTOM
      if (organization.type !== OrganizationType.CUSTOM) {
        return {
          success: false,
          message: `La organización con ID ${organizationId} no es de tipo CUSTOM`,
        };
      }

      // Obtener el límite de la organización
      const limit = await this.organizationLimitRepository.findOne({
        where: { organizationId },
      });

      // Verificar si tiene límites mensuales
      if (!limit || !limit.isMonthly) {
        return {
          success: false,
          message: `La organización con ID ${organizationId} no tiene límites mensuales configurados`,
        };
      }

      // Guardar el contador anterior
      const previousCount = organization.conversationCount;

      // Reiniciar el contador
      organization.conversationCount = 0;
      await this.organizationRepository.save(organization);

      return {
        success: true,
        previousCount,
        message: `Contador de conversaciones reiniciado con éxito: ${previousCount} -> 0`,
      };
    } catch (error) {
      this.logger.error(`Error al reiniciar contador para organización ${organizationId}: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Error al reiniciar contador: ${error.message}`,
      };
    }
  }
}
