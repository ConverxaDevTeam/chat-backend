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
    console.log('[SESSION-DEBUG-1] createSession called for user:', user.id);
    console.log('[SESSION-DEBUG-1.1] User object properties:', Object.keys(user));

    const jwtTokenRefreshExpiration: number = this.configService.get<number>('session.jwtTokenRefreshExpiration') ?? 604800; // 1 semana
    console.log('[SESSION-DEBUG-2] JWT expiration:', jwtTokenRefreshExpiration);

    const expiredAt = new Date();
    expiredAt.setSeconds(expiredAt.getSeconds() + jwtTokenRefreshExpiration);
    console.log('[SESSION-DEBUG-3] Session will expire at:', expiredAt);

    const session = new Session();

    const ExtraInfo = this.deviceDetector.parse(req.headers['user-agent']);

    const ipAddress = req?.ip || '0.0.0.0';
    const browser = ExtraInfo?.client?.name || 'undefined';
    const operatingSystem = ExtraInfo?.os?.name || 'undefined';

    // Fix: Ensure user relation is properly set by creating a minimal user reference
    const userRef = new User();
    userRef.id = user.id;
    userRef.email = user.email;

    console.log('[SESSION-DEBUG-3.1] Setting user relation with ID:', userRef.id);
    session.user = userRef;
    session.ip = this.extractIpAddress(ipAddress);
    session.browser = browser;
    session.operatingSystem = operatingSystem;
    session.expiredAt = expiredAt;

    console.log('[SESSION-DEBUG-4] Session data before save:', {
      userId: userRef.id,
      ip: session.ip,
      browser: session.browser,
      operatingSystem: session.operatingSystem,
      expiredAt: session.expiredAt,
    });

    console.log('[SESSION-DEBUG-5] About to save session to database');
    const savedSession = await this.sessionRepository.save(session);
    console.log('[SESSION-DEBUG-6] Session saved successfully with ID:', savedSession.id);
    console.log('[SESSION-DEBUG-7] Saved session data:', savedSession);

    return savedSession;
  }

  async removeSession(session: Session): Promise<void> {
    await this.sessionRepository.remove(session);
  }

  async findByIds(userId, sessionId): Promise<Session | null> {
    console.log('[SESSION-DEBUG-8] findByIds called with userId:', userId, 'sessionId:', sessionId);
    console.log('[SESSION-DEBUG-8.1] findByIds input types:', typeof userId, typeof sessionId);

    // Use query builder to properly join user relation
    const session = await this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.user', 'user')
      .where('session.id = :sessionId', { sessionId })
      .andWhere('user.id = :userId', { userId })
      .getOne();

    console.log('[SESSION-DEBUG-9] findByIds result:', session ? 'FOUND' : 'NOT FOUND');
    if (session) {
      console.log('[SESSION-DEBUG-10] Found session details:', {
        id: session.id,
        userId: session.user?.id,
        expiredAt: session.expiredAt,
        createdAt: session.created_at,
      });
    } else {
      console.log('[SESSION-DEBUG-10] Session NOT FOUND - checking if session exists at all');

      // Check if session exists without user filter
      const sessionOnly = await this.sessionRepository
        .createQueryBuilder('session')
        .leftJoinAndSelect('session.user', 'user')
        .where('session.id = :sessionId', { sessionId })
        .getOne();

      if (sessionOnly) {
        console.log('[SESSION-DEBUG-10.1] Session exists but user mismatch:', {
          sessionId: sessionOnly.id,
          sessionUserId: sessionOnly.user?.id,
          requestedUserId: userId,
        });
      } else {
        console.log('[SESSION-DEBUG-10.2] Session does not exist at all with ID:', sessionId);
      }
    }

    return session;
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
