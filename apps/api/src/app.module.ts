import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { HealthController } from './health/health.controller.js';
import { PrismaModule } from './prisma.module.js';
import { ReportsModule } from './reports/reports.module.js';

@Module({
  imports: [PrismaModule, AuthModule, ReportsModule],
  controllers: [HealthController],
})
export class AppModule {}
