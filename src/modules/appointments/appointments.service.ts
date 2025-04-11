import { BadRequestException, Injectable } from '@nestjs/common';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { PrismaService } from '@/core/database/prisma.service';

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
    // Verificar se a data e hora do agendamento já passou
    if (appointmentDate.getTime() < Date.now()) {
      throw new BadRequestException(
        'Não é possível realizar um agendamento em uma data/hora que já passou.',
      );
    }
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

    if (userBalance < serviceAmount) {
      throw new BadRequestException(
        `Saldo insuficiente! Saldo atual: ${userBalance}, Valor do serviço: ${serviceAmount}`,
      );
    }

    const parsedDate = new Date(date);
    const dayStart = new Date(parsedDate);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(parsedDate);
    dayEnd.setHours(23, 59, 59, 999);
    // Busca o schedule com os appointments daquele dia
    const scheduleForThisDate = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      select: {
        limit: true,
        appointments: {
          where: {
            date: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
          select: { id: true },
        },
      },
    });

    const totalAppointments = scheduleForThisDate?.appointments.length || 0;
    const isFull =
      scheduleForThisDate?.limit !== null &&
      totalAppointments >= (scheduleForThisDate?.limit || 0);

    if (isFull) {
      throw new BadRequestException('Esse horário já está cheio.');
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
  async runWeeklySubscriptionJob() {
    const subscriptions = await this.prisma.subscription.findMany({
      where: { active: true },
      include: {
        customer: true,
        barber: true,
        barbershop: true,
        schedule: true,
        plan: { include: { service: true } },
      },
    });

    for (const subscription of subscriptions) {
      const {
        barberId,
        customerId,
        barbershopId,
        scheduleId,
        plan,
        schedule,
        customer,
        barber,
        barbershop,
      } = subscription;

      if (
        !schedule?.weekDay ||
        !schedule?.time ||
        !plan?.service ||
        !barbershopId ||
        !barberId
      )
        continue;

      const appointmentDate = this.getNextAppointmentDate(
        parseInt(schedule?.weekDay),
        schedule?.time,
      );

      // Verificar se já existe agendamento nesse horário para o usuário
      const existingAppointment = await this.prisma.appointment.findFirst({
        where: { customerId, barbershopId, date: appointmentDate },
      });

      if (existingAppointment) continue; // Evita duplicidade

      // Verificar limite do horário
      const scheduleAppointments = await this.prisma.appointment.count({
        where: {
          scheduleId,
          date: appointmentDate,
        },
      });

      if (schedule.limit !== null && scheduleAppointments >= schedule.limit)
        continue;

      // Verifica saldo do usuário
      const balances = await this.prisma.balance.findMany({
        where: { customerId, barbershopId },
      });
      const userBalance = balances.reduce((acc, balance) => {
        return balance.type === 'INCOME'
          ? acc + (balance.amount || 0)
          : acc - (balance.amount || 0);
      }, 0);

      const serviceAmount = plan.service.amount || 0;

      if (userBalance < serviceAmount) continue; // Ignora se saldo insuficiente

      // Criar o agendamento
      await this.prisma.appointment.create({
        data: {
          barberId,
          customerId,
          barbershopId,
          scheduleId,
          serviceId: plan.service?.id,
          date: appointmentDate,
        },
      });

      // Criar balance
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
    }
  }

  private getNextAppointmentDate(weekDay: number, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();

    // Começa assumindo o dia da semana desejado
    const daysAhead = (weekDay + 7 - now.getDay()) % 7;

    // Cria uma data base com esse dia e horário
    const nextDate = new Date(now);
    nextDate.setDate(now.getDate() + daysAhead);
    nextDate.setHours(hours, minutes, 0, 0);

    // Se a data cair hoje (daysAhead === 0) e o horário já passou, agenda para a próxima semana
    if (daysAhead === 0 && nextDate <= now) {
      nextDate.setDate(nextDate.getDate() + 7);
    }

    return nextDate;
  }

  async findAll() {
    return await this.prisma.appointment.findMany();
  }

  async findAllNextFromUser(customerId: string) {
    const now = new Date();

    const upcomingAppointments = await this.prisma.appointment.findMany({
      where: {
        customerId,
        date: {
          gte: now,
        },
      },
      orderBy: {
        date: 'asc',
      },
      include: {
        barber: true,
        barbershop: true,
        service: true,
        schedule: true,
      },
    });

    return upcomingAppointments;
  }
  async findByBarberAndDate(barberId: string, date: string) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    return this.prisma.appointment.findMany({
      where: {
        barberId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
      include: {
        customer: {
          select: {
            name: true,
            avatar: true,
            phone: true,
          },
        },
        service: {
          select: {
            name: true,
          },
        },
      },
    });
  }
  async findAllPastFromUser(customerId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [appointments, total] = await this.prisma.appointment
      .findMany({
        where: {
          customerId,
          date: {
            lt: new Date(),
          },
        },
        orderBy: {
          date: 'desc',
        },
        skip,
        take: limit,
        include: {
          barber: true,
          barbershop: true,
          service: true,
          schedule: true,
        },
      })
      .then((data) => [
        data,
        this.prisma.appointment.count({
          where: {
            customerId,
            date: {
              lt: new Date(),
            },
          },
        }),
      ]);

    return {
      data: appointments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(Number(total) / limit),
      },
    };
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
    const appointment = await this.prisma.appointment.findFirst({
      where: { id },
      include: { service: true },
    });
    if (!appointment) {
      throw new BadRequestException('Agendamento não encontrado.');
    }
    // Criar balance
    await this.prisma.balance.create({
      data: {
        paymentDate: new Date(),
        status: 'received',
        amount: appointment?.service?.amount,
        type: 'INCOME',
        customerId: appointment?.customerId,
        barbershopId: appointment?.barbershopId,
      },
    });
    return await this.prisma.appointment.delete({ where: { id } });
  }
}
