import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CreateBarbershopDto } from './dto/create-barbershop.dto';
import { UpdateBarbershopDto } from './dto/update-barbershop.dto';
import { PrismaService } from '@/core/database/prisma.service';
import { IHashProvider } from '@/core/providers/hash/interface/IHashProvider';

@Injectable()
export class BarbershopsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashProvider: IHashProvider,
  ) {}

  generateSlug = (name: string): string => {
    return name
      .toLowerCase() // Converte para minúsculas
      .normalize('NFD') // Remove acentos
      .replace(/[\u0300-\u036f]/g, '') // Remove caracteres especiais
      .replace(/[^a-z0-9\s-]/g, '') // Remove tudo que não for letra, número ou espaço
      .trim() // Remove espaços extras
      .replace(/\s+/g, '-'); // Substitui espaços por hífens
  };

  async create({ name, email, password }: CreateBarbershopDto) {
    const slug = this.generateSlug(name);
    const checkUserExist = await this.prisma.barbershop.findFirst({
      where: { email },
    });

    if (checkUserExist) {
      throw new ConflictException('Email já em uso!');
    }
    const checkSlugExist = await this.prisma.barbershop.findFirst({
      where: { slug },
    });

    if (checkSlugExist) {
      throw new ConflictException('Nome já em uso!');
    }

    const hashedPassword = await this.hashProvider.generateHash(password);

    const user = await this.prisma.barbershop.create({
      data: {
        name,
        email,
        password: hashedPassword,
        slug,
      },
    });

    return user;
  }

  async findAll() {
    const response = await this.prisma.barbershop.findMany();
    return response;
  }

  async findOne(id: string) {
    const barbershop = await this.prisma.barbershop.findFirst({
      where: { id },
    });

    if (!barbershop) {
      throw new ConflictException('Conta nao encontrada!');
    }
    const { password, ...barbershopWithoutPassword } = barbershop;
    return barbershopWithoutPassword;
  }
  async getDashboard(id: string) {
    const barbershop = await this.prisma.barbershop.findFirst({
      where: { id },
    });

    if (!barbershop) {
      throw new ConflictException('Conta nao encontrada!');
    }
    const barbershopId = barbershop.id;
    if (!barbershopId) {
      throw new BadRequestException('Barbershop ID is required');
    }

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        barbershopId,
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    const subscriptionsCount = await this.prisma.subscription.count({
      where: {
        barbershopId,
        active: true,
      },
    });

    const payments = await this.prisma.payment.findMany({
      where: {
        barbershopId,
        paymentDate: {
          gte: start,
          lte: end,
        },
      },
    });

    const revenue = payments.reduce(
      (sum, payment) => sum + (payment?.total || 0),
      0,
    );

    const daysInMonth: { day: string; appointments: number }[] = [];
    const revenueByDay: { day: string; revenue: number }[] = [];

    const days = end.getDate();
    for (let d = 1; d <= days; d++) {
      const dayStr =
        d.toString().padStart(2, '0') +
        '/' +
        (now.getMonth() + 1).toString().padStart(2, '0');

      const apptCount = appointments.filter(
        (appt) => appt.date.getDate() === d,
      ).length;
      const revenueSum = payments
        .filter(
          (payment) =>
            payment.paymentDate && payment.paymentDate.getDate() === d,
        )
        .reduce((sum, p) => sum + (p?.total || 0), 0);

      daysInMonth.push({ day: dayStr, appointments: apptCount });
      revenueByDay.push({ day: dayStr, revenue: revenueSum / 100 });
    }

    return {
      summary: {
        appointments: appointments.length,
        revenue: revenue / 100,
        subscriptions: subscriptionsCount,
      },
      appointmentsChart: daysInMonth,
      revenueChart: revenueByDay,
    };
  }

  async findOneBySlug(slug: string) {
    const barbershop = await this.prisma.barbershop.findFirst({
      where: { slug },
    });

    if (!barbershop) {
      throw new ConflictException('Empresa nao encontrada!');
    }

    const { password, ...barbershopWithoutPassword } = barbershop;
    return barbershopWithoutPassword;
  }

  async update(id: string, updateBarbershopDto: UpdateBarbershopDto) {
    const response = await this.prisma.barbershop.update({
      where: { id },
      data: updateBarbershopDto,
    });
    return response;
  }

  async remove(id: string) {
    const response = await this.prisma.barbershop.delete({ where: { id } });
    return response;
  }
}
