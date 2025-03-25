import { BadRequestException, Injectable } from '@nestjs/common';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { PrismaService } from '@/core/database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create({
    barberId,
    customerId,
    barbershopId,
    scheduleId,
    serviceId,
    date,
  }: {
    barberId: string;
    customerId: string;
    barbershopId: string;
    scheduleId: string;
    serviceId: string;
    date: Date;
  }) {
    // 1. Verificar se o barbeiro existe
    const barber = await this.prisma.barber.findUnique({
      where: { id: barberId },
    });
    if (!barber) {
      throw new BadRequestException('Barbeiro não encontrado.');
    }

    // 2. Verificar se a barbearia existe
    const barbershop = await this.prisma.barbershop.findUnique({
      where: { id: barbershopId },
    });
    if (!barbershop) {
      throw new BadRequestException('Barbearia não encontrada.');
    }

    // 3. Verificar se o cliente existe
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new BadRequestException('Cliente não encontrado.');
    }

    // 4. Verificar se o horário do agendamento é válido
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
    });
    if (!schedule || schedule.barbershopId !== barbershopId) {
      throw new BadRequestException(
        'Horário inválido ou não pertence a essa barbearia.',
      );
    }

    // 5. Verificar se o serviço existe e pertence à barbearia
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service || service.barbershopId !== barbershopId) {
      throw new BadRequestException(
        'Serviço inválido ou não pertence a essa barbearia.',
      );
    }
    if (!schedule?.time) {
      throw new BadRequestException(
        'Horário inválido ou não pertence a essa barbearia.',
      );
    }
    // 6. Verificar se o usuário já tem um agendamento no mesmo dia e horário
    const appointmentDate = new Date(date);
    appointmentDate.setHours(
      parseInt(schedule?.time.split(':')[0]),
      parseInt(schedule?.time.split(':')[1]),
      0,
      0,
    );

    const existingAppointment = await this.prisma.appointment.findFirst({
      where: {
        customerId,
        barbershopId,
        date: appointmentDate,
      },
    });

    if (existingAppointment) {
      throw new BadRequestException(
        'Você já tem um agendamento para esse horário no mesmo dia.',
      );
    }

    // Buscar todas as transações do usuário (income e outcome)
    const balances = await this.prisma.balance.findMany({
      where: { customerId, ...(barbershopId ? { barbershopId } : {}) },
    });

    // Calcular saldo total do usuário (income - outcome)
    const userBalance = balances.reduce((acc, balance) => {
      if (!balance.amount) return acc;
      return balance.type === 'INCOME'
        ? acc + balance.amount
        : acc - balance.amount;
    }, 0);

    // Verificar se o serviço tem um valor definido
    const serviceAmount = service.amount ?? 0; // Se for null ou undefined, assume 0

    console.log(
      `Saldo disponível: ${userBalance}, Valor do serviço: ${serviceAmount}`,
    );

    if (userBalance < serviceAmount) {
      throw new BadRequestException(
        `Saldo insuficiente! Saldo atual: ${userBalance}, Valor do serviço: ${serviceAmount}`,
      );
    }
    // 8. Criar o agendamento
    const appointment = await this.prisma.appointment.create({
      data: {
        barberId,
        customerId,
        barbershopId,
        scheduleId,
        serviceId,
        date: appointmentDate,
      },
    });
    await this.prisma.balance.create({
      data: {
        paymentDate: new Date(),
        status: 'received',
        amount: serviceAmount,
        type: 'OUTCOME',
        customerId,
        barbershopId,
      },
    });

    return appointment;
  }

  async findAll() {
    return await this.prisma.appointment.findMany();
  }

  async findOne(id: string) {
    return await this.prisma.appointment.findFirst({ where: { id } });
  }

  async update(id: string, updateAppointmentDto: UpdateAppointmentDto) {
    return await this.prisma.appointment.update({
      where: { id },
      data: updateAppointmentDto,
    });
  }

  async remove(id: string) {
    return await this.prisma.appointment.delete({ where: { id } });
  }
}
