import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ReportStatus } from '@fieldreport/shared';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // Idempotente por clientId: un reintento devuelve el reporte ya guardado.
  async create(
    technicianId: string,
    input: Omit<
      Prisma.ReportUncheckedCreateInput,
      'technicianId' | 'createdAtClient'
    > & {
      createdAtClient: string;
    },
  ) {
    try {
      const report = await this.prisma.report.create({
        data: {
          ...input,
          technicianId,
          createdAtClient: new Date(input.createdAtClient),
        },
      });
      return { report, created: true };
    } catch (e) {
      if (
        !(e instanceof Prisma.PrismaClientKnownRequestError) ||
        e.code !== 'P2002'
      ) {
        throw e;
      }
      const report = await this.prisma.report.findUniqueOrThrow({
        where: { clientId: input.clientId },
      });
      if (report.technicianId !== technicianId) {
        throw new ConflictException('clientId ya pertenece a otro usuario');
      }
      return { report, created: false };
    }
  }

  async list(
    technicianId: string,
    q: { status?: ReportStatus; page: number; limit: number },
  ) {
    const where = { technicianId, ...(q.status && { status: q.status }) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where,
        orderBy: { createdAtClient: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.report.count({ where }),
    ]);
    return { items, total, page: q.page, limit: q.limit };
  }

  async get(technicianId: string, id: string) {
    const report = await this.prisma.report.findFirst({
      where: { id, technicianId },
    });
    if (!report) throw new NotFoundException('Reporte no encontrado');
    return report;
  }

  async update(
    technicianId: string,
    id: string,
    data: Prisma.ReportUpdateInput,
  ) {
    await this.get(technicianId, id);
    return this.prisma.report.update({ where: { id }, data });
  }

  async remove(technicianId: string, id: string) {
    await this.get(technicianId, id);
    await this.prisma.report.delete({ where: { id } });
  }
}
