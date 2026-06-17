import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../database/entities/user.entity';
import { Document } from '../database/entities/document.entity';
import { Signature } from '../database/entities/signature.entity';
import { Feedback } from '../database/entities/feedback.entity';
import { AuditLog } from '../database/entities/auditLog.entity';
import { VerificationCode } from '../database/entities/verification-code.entity';
import { BlacklistedEmail } from '../database/entities/blacklisted-email.entity';

export const getDatabaseConfig = async (
  configService: ConfigService,
): Promise<TypeOrmModuleOptions> => ({
  type: 'postgres',
  host: configService.get<string>('DATABASE_HOST'),
  port: configService.get<number>('DATABASE_PORT'),
  username: configService.get<string>('DATABASE_USER'),
  password: configService.get<string>('DATABASE_PASSWORD'),
  database: configService.get<string>('DATABASE_NAME'),
  autoLoadEntities: false,
  synchronize: false,
  migrationsTableName: 'migrations',
  entities: [
    Document,
    User,
    Signature,
    Feedback,
    AuditLog,
    VerificationCode,
    BlacklistedEmail,
  ],
  extra: {
    connectionTimeoutMillis: 5000,
    query_timeout: 60000,
  },
});
