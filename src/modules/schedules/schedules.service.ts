import { Injectable } from '@nestjs/common';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { PrismaService } from '@/core/database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createScheduleDto) {
    const weekDays = createScheduleDto.map((schedule) => schedule.weekDay);
    const times = createScheduleDto.map((schedule) => schedule.time);
    const existingSchedules = await this.prisma.schedule.findMany({
      where: {
        barbershopId: {
          in: createScheduleDto.map((schedule) => schedule.barbershopId),
        }, // Filtra por barbearia
        weekDay: { in: weekDays }, // Filtra por dia da semana
        time: { in: times }, // Filtra por horário
      },
      select: { time: true, weekDay: true, barbershopId: true },
    });

    // Cria um Set de horários já cadastrados para evitar duplicatas
    const existingSet = new Set(
      existingSchedules.map(
        (schedule) =>
          `${schedule.barbershopId}-${schedule.weekDay}-${schedule.time}`,
      ),
    );

    // Filtra apenas os registros que ainda não existem
    const newSchedules = createScheduleDto.filter(
      (schedule) =>
        !existingSet.has(
          `${schedule.barbershopId}-${schedule.weekDay}-${schedule.time}`,
        ),
    );

    if (newSchedules.length === 0) {
      return {
        message:
          'Nenhum novo horário foi cadastrado, todos já existem para esta barbearia e dia da semana.',
      };
    }

    // Cadastra apenas os novos registros
    const response = await this.prisma.schedule.createManyAndReturn({
      data: newSchedules,
    });

    return response;
  }

  async findAll() {
    return await this.prisma.schedule.findMany();
  }

  async findOne(id: string) {
    return await this.prisma.schedule.findFirst({ where: { id } });
  }
  async findAllByBarbershopId(barbershopId: string, barberId: string) {
    const response = await this.prisma.schedule.findMany({
      where: { barbershopId, barberId },
      include: { appointments: true, subscriptions: true },
    });
    return response;
  }
  async update(id: string, updateScheduleDto: UpdateScheduleDto) {
    return await this.prisma.schedule.update({
      where: { id },
      data: updateScheduleDto,
    });
  }

  async remove(id: string) {
    return await this.prisma.schedule.delete({ where: { id } });
  }
}
