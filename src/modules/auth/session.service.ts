import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Session } from '@models/Session.entity';
import { User } from '@models/User.entity';
import { ConfigService } from '@nestjs/config';
import * as DeviceDetector from 'device-detector-js';
import { Logger } from '@nestjs/common';

export class SessionService {
  private readonly deviceDetector = new DeviceDetector();
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly configService: ConfigService,
  ) {}

  extractIpAddress(fullIpAddress: string): string {
    const ipAddressParts = fullIpAddress.split(':');
    if (ipAddressParts.length >= 2) {
      return ipAddressParts[ipAddressParts.length - 1];
    } else {
      return '0.0.0.0';
    }
  }

  async createSession(req, user: User): Promise<Session> {
    const jwtTokenRefreshExpiration: number = this.configService.get<number>('session.jwtTokenRefreshExpiration') ?? 604800; // 1 semana

    const expiredAt = new Date();
    expiredAt.setSeconds(expiredAt.getSeconds() + jwtTokenRefreshExpiration);

    const session = new Session();

    const ExtraInfo = this.deviceDetector.parse(req.headers['user-agent']);

    const ipAddress = req?.ip || '0.0.0.0';
    const browser = ExtraInfo?.client?.name || 'undefined';
    const operatingSystem = ExtraInfo?.os?.name || 'undefined';

    const userRef = new User();
    userRef.id = user.id;
    userRef.email = user.email;

    session.user = userRef;
    session.ip = this.extractIpAddress(ipAddress);
    session.browser = browser;
    session.operatingSystem = operatingSystem;
    session.expiredAt = expiredAt;

    return this.sessionRepository.save(session);
  }

  async removeSession(session: Session): Promise<void> {
    await this.sessionRepository.remove(session);
  }

  async findByIds(userId, sessionId): Promise<Session | null> {
    return this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.user', 'user')
      .where('session.id = :sessionId', { sessionId })
      .andWhere('session.userId = :userId', { userId })
      .getOne();
  }

  async removeByIds(user: User, sessionId): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, user: { id: user.id } },
    });
    if (session) {
      await this.sessionRepository.remove(session);
    }
  }

  async getSessionsByUserId(userId): Promise<Session[]> {
    return await this.sessionRepository.find({
      where: { user: { id: userId } },
    });
  }

  async findById(sessionId): Promise<Session | null> {
    return this.sessionRepository.findOne({
      where: { id: sessionId },
    });
  }
}
