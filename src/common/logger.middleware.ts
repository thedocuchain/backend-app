import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = winston.createLogger({
    format: winston.format.combine(
      winston.format.timestamp(),
      nestWinstonModuleUtilities.format.nestLike(),
    ),
    transports: [new winston.transports.Console()],
  });

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, query } = req;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const normalizedUrlWithoutQuery = originalUrl.split('?')[0];
    const requestId = uuidv4();
    const excludedQueryParams = Object.entries(query)
      .map(([key, value]) => `${key}=${value}`)
      .join(' ');

    res.on('finish', () => {
      const { statusCode } = res;
      this.logger.info(
        `${requestId} ${clientIp} ${method} ${statusCode} ${normalizedUrlWithoutQuery} ${excludedQueryParams}`,
      );
    });

    next();
  }
}
