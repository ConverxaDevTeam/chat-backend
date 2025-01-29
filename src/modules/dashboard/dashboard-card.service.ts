import { Injectable, NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { DashboardCard } from '../../models/DashboardCard.entity';
import { CreateDashboardCardDto } from './dto/create-dashboard-card.dto';
import { UpdateDashboardCardDto } from './dto/update-dashboard-card.dto';
import { User } from '../../models/User.entity';
import { UserOrganization } from '../../models/UserOrganization.entity';
import { AnalyticType, StatisticsDisplayType, TimeRange } from '../../interfaces/analytics.enum';
import { UpdateLayoutDto } from './dto/update-layout-dto';

const defaultDashboardCards = [
  {
    title: 'Usuarios',
    analyticTypes: [AnalyticType.RECURRING_USERS, AnalyticType.TOTAL_USERS, AnalyticType.NEW_USERS],
    displayType: StatisticsDisplayType.METRIC,
    timeRange: TimeRange.LAST_90_DAYS,
    layout: {
      lg: { w: 18, h: 6, x: 0, y: 0, i: '1' },
      md: { w: 14, h: 6, x: 0, y: 0, i: '1' },
      sm: { w: 18, h: 6, x: 0, y: 0, i: '1' },
      xs: { w: 12, h: 6, x: 0, y: 0, i: '1' },
    },
    showLegend: true,
  },
  {
    title: 'Mensajes',
    analyticTypes: [AnalyticType.IA_MESSAGES, AnalyticType.HITL_MESSAGES],
    displayType: StatisticsDisplayType.AREA,
    timeRange: TimeRange.LAST_7_DAYS,
    layout: {
      lg: { w: 18, h: 6, x: 18, y: 0, i: '2' },
      md: { w: 15, h: 6, x: 15, y: 0, i: '2' },
      sm: { w: 18, h: 6, x: 0, y: 6, i: '2' },
      xs: { w: 12, h: 6, x: 0, y: 6, i: '2' },
    },
    showLegend: true,
  },
  {
    title: 'Avg. Mensajes IA por sesión',
    analyticTypes: [AnalyticType.IA_MESSAGES_PER_SESSION],
    displayType: StatisticsDisplayType.METRIC,
    timeRange: TimeRange.LAST_30_DAYS,
    layout: {
      lg: { w: 9, h: 5, x: 0, y: 6, i: '3' },
      md: { w: 9, h: 5, x: 0, y: 6, i: '3' },
      sm: { w: 6, h: 4, x: 0, y: 12, i: '3' },
      xs: { w: 12, h: 4, x: 0, y: 12, i: '3' },
    },
  },
  {
    title: 'Avg. Mensajes HITL por sesión',
    analyticTypes: [AnalyticType.HITL_MESSAGES_PER_SESSION],
    displayType: StatisticsDisplayType.METRIC,
    timeRange: TimeRange.LAST_30_DAYS,
    layout: {
      lg: { w: 9, h: 5, x: 9, y: 11, i: '4' },
      md: { w: 9, h: 5, x: 9, y: 6, i: '4' },
      sm: { w: 9, h: 4, x: 9, y: 20, i: '4' },
      xs: { w: 12, h: 4, x: 0, y: 24, i: '4' },
    },
  },
  {
    title: 'Avg. Sesiones por usuario',
    analyticTypes: [AnalyticType.SESSIONS_PER_USER],
    displayType: StatisticsDisplayType.METRIC,
    timeRange: TimeRange.LAST_30_DAYS,
    layout: {
      lg: { w: 9, h: 5, x: 9, y: 6, i: '5' },
      md: { w: 9, h: 5, x: 0, y: 11, i: '5' },
      sm: { w: 6, h: 4, x: 0, y: 16, i: '5' },
      xs: { w: 12, h: 4, x: 0, y: 28, i: '5' },
    },
  },
  {
    title: 'Mensajes por canal',
    analyticTypes: [AnalyticType.MESSAGES_BY_WHATSAPP, AnalyticType.MESSAGES_BY_FACEBOOK, AnalyticType.MESSAGES_BY_WEB],
    displayType: StatisticsDisplayType.PIE,
    timeRange: TimeRange.LAST_30_DAYS,
    layout: {
      lg: { w: 9, h: 5, x: 0, y: 11, i: '6' },
      md: { w: 9, h: 5, x: 9, y: 11, i: '6' },
      sm: { w: 9, h: 4, x: 0, y: 20, i: '6' },
      xs: { w: 9, h: 4, x: 3, y: 32, i: '6' },
    },
    showLegend: false,
  },
  {
    title: 'Funciones',
    analyticTypes: [AnalyticType.FUNCTIONS_PER_SESSION],
    displayType: StatisticsDisplayType.BAR,
    timeRange: TimeRange.LAST_7_DAYS,
    layout: {
      lg: { w: 36, h: 6, x: 0, y: 16, i: '7' },
      md: { w: 30, h: 6, x: 0, y: 16, i: '7' },
      sm: { w: 18, h: 6, x: 0, y: 24, i: '7' },
      xs: { w: 12, h: 6, x: 0, y: 36, i: '7' },
    },
    showLegend: true,
  },
  {
    title: 'Distribución por canal',
    analyticTypes: [AnalyticType.MESSAGES_BY_WHATSAPP, AnalyticType.MESSAGES_BY_FACEBOOK, AnalyticType.MESSAGES_BY_WEB],
    displayType: StatisticsDisplayType.PIE,
    timeRange: TimeRange.LAST_30_DAYS,
    layout: {
      lg: { w: 12, h: 10, x: 24, y: 6, i: '8' },
      md: { w: 12, h: 10, x: 18, y: 6, i: '8' },
      sm: { w: 12, h: 8, x: 6, y: 12, i: '8' },
      xs: { w: 12, h: 8, x: 0, y: 16, i: '8' },
    },
    showLegend: true,
  },
];

@Injectable()
export class DashboardCardService {
  constructor(
    @InjectRepository(DashboardCard)
    private readonly dashboardCardRepository: Repository<DashboardCard>,
    @InjectRepository(UserOrganization)
    private readonly userOrganizationRepository: Repository<UserOrganization>,
  ) {}

  private async validateUserOrganization(userId: number, organizationId?: number | null): Promise<UserOrganization | null> {
    if (!organizationId) return null;

    const userOrg = await this.userOrganizationRepository
      .createQueryBuilder('uo')
      .where('uo.user.id = :userId AND uo.organization.id = :organizationId', { userId, organizationId })
      .getOne();

    if (!userOrg) {
      throw new UnauthorizedException('User does not belong to this organization');
    }

    return userOrg;
  }

  private createDashboardCardEntities(userOrg: UserOrganization | null, dashboardCardsData: CreateDashboardCardDto[]): DashboardCard[] {
    return this.dashboardCardRepository.create(
      dashboardCardsData.map((data) => ({
        ...data,
        showLegend: data.showLegend ?? false,
        ...(userOrg && { userOrganization: userOrg }),
      })),
    );
  }

  async createDefaultDashboardCards(userOrg: UserOrganization): Promise<DashboardCard[]> {
    const defaultEntities = this.createDashboardCardEntities(userOrg, defaultDashboardCards as CreateDashboardCardDto[]);
    const savedCards = await this.dashboardCardRepository.save(defaultEntities);

    const updateLayout = (card: DashboardCard): DashboardCard => ({
      ...card,
      layout: {
        lg: { ...card.layout.lg, i: String(card.id) },
        md: { ...card.layout.md, i: String(card.id) },
        sm: { ...card.layout.sm, i: String(card.id) },
        xs: { ...card.layout.xs, i: String(card.id) },
      },
    });

    const updatedCards = savedCards.map(updateLayout);
    return this.dashboardCardRepository.save(updatedCards);
  }

  async create(user: User, createDashboardCardDto: CreateDashboardCardDto, organizationId?: number | null): Promise<DashboardCard> {
    const userOrg = await this.validateUserOrganization(user.id, organizationId || undefined);
    const dashboardCard = this.createDashboardCardEntities(userOrg, [createDashboardCardDto])[0];
    return this.dashboardCardRepository.save(dashboardCard);
  }

  async findAll(user: User, organizationId?: number | null): Promise<DashboardCard[]> {
    const userOrg = await this.validateUserOrganization(user.id, organizationId || undefined);

    if (!userOrg) {
      throw new UnauthorizedException('User does not belong to this organization');
    }

    const queryBuilder = this.dashboardCardRepository.createQueryBuilder('dashboardCard');

    queryBuilder.where('dashboardCard.userOrganization.id = :userOrgId', { userOrgId: userOrg.id });
    const existingDashboardCards = await queryBuilder.orderBy('dashboardCard.created_at', 'DESC').getMany();

    if (existingDashboardCards.length > 0) {
      return existingDashboardCards;
    }

    return this.createDefaultDashboardCards(userOrg);
  }

  async update(user: User, id: number, updateDashboardCardDto: UpdateDashboardCardDto): Promise<DashboardCard> {
    const dashboardCard = await this.dashboardCardRepository.findOne({
      where: { id, deleted_at: IsNull() },
      relations: ['userOrganization', 'userOrganization.user'],
    });

    if (!dashboardCard) {
      throw new NotFoundException(`Dashboard card with id ${id} not found`);
    }

    if (dashboardCard.userOrganization?.user.id !== user.id) {
      throw new ForbiddenException('You do not have permission to update this dashboard card');
    }

    Object.assign(dashboardCard, updateDashboardCardDto);
    return this.dashboardCardRepository.save(dashboardCard);
  }

  async updateLayout(user: User, relationId: number, updateLayoutDto: UpdateLayoutDto): Promise<DashboardCard[]> {
    const dashboardCards = await this.dashboardCardRepository.find({
      where: { userOrganization: { id: relationId }, deleted_at: IsNull() },
      relations: ['userOrganization', 'userOrganization.user'],
    });

    if (!dashboardCards.length) {
      throw new NotFoundException(`No dashboard cards found for relation ${relationId}`);
    }

    if (dashboardCards[0].userOrganization?.user.id !== user.id) {
      throw new ForbiddenException('You do not have permission to update these dashboard cards');
    }

    const updatedCards = dashboardCards.map((card) => {
      const newLayout = updateLayoutDto.layouts.find((l) => String(l.i) === String(card.id));
      if (!newLayout) return card;

      return {
        ...card,
        layout: {
          ...card.layout,
          [updateLayoutDto.breakpoint]: {
            w: newLayout.w,
            h: newLayout.h,
            x: newLayout.x,
            y: newLayout.y,
            i: String(newLayout.i),
          },
        },
      };
    });

    return this.dashboardCardRepository.save(updatedCards);
  }

  async remove(user: User, id: number, organizationId?: number | null): Promise<void> {
    const userOrg = await this.validateUserOrganization(user.id, organizationId || undefined);

    const queryBuilder = this.dashboardCardRepository.createQueryBuilder();

    if (userOrg) {
      queryBuilder.where('id = :id AND userOrganizationId = :userOrgId', { id, userOrgId: userOrg.id });
    } else {
      queryBuilder.where('id = :id AND userOrganizationId IS NULL AND userId = :userId', { id, userId: user.id });
    }

    const result = await queryBuilder.delete().execute();

    if (result.affected === 0) {
      throw new NotFoundException('Dashboard card not found');
    }
  }
}
