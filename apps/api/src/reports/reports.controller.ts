import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import {
  REPORT_STATUSES,
  reportInputSchema,
  reportUpdateSchema,
} from '@fieldreport/shared';
import type { Response } from 'express';
import { z } from 'zod';
import { AuthGuard, type AuthedRequest } from '../auth/auth.guard.js';
import { ZodPipe } from '../zod.pipe.js';
import { ReportsService } from './reports.service.js';

const listQuerySchema = z.object({
  status: z.enum(REPORT_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  async create(
    @Req() req: AuthedRequest,
    @Body(new ZodPipe(reportInputSchema))
    body: z.output<typeof reportInputSchema>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { report, created } = await this.reports.create(req.user.sub, body);
    res.status(created ? 201 : 200);
    return report;
  }

  @Get()
  list(
    @Req() req: AuthedRequest,
    @Query(new ZodPipe(listQuerySchema)) q: z.output<typeof listQuerySchema>,
  ) {
    return this.reports.list(req.user.sub, q);
  }

  @Get(':id')
  get(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.reports.get(req.user.sub, id);
  }

  @Put(':id')
  update(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodPipe(reportUpdateSchema))
    body: z.output<typeof reportUpdateSchema>,
  ) {
    return this.reports.update(req.user.sub, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.reports.remove(req.user.sub, id);
  }
}
