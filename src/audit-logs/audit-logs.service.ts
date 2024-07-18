import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../database/entities/auditLog.entity';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async createAuditLog(
    documentId: string,
    userId: string,
    action: string,
  ): Promise<void> {
    const auditLog = this.auditLogRepository.create({
      documentId,
      userId,
      eventName: action,
    });

    await this.auditLogRepository.save(auditLog);
  }

  async getAuditLogs(documentId: string): Promise<AuditLog[]> {
    return await this.auditLogRepository.find({ where: { documentId } });
  }
}
