import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { UpdateBarbershopDto } from './dto/update-barbershop.dto';
import { PrismaService } from '@/core/database/prisma.service';
import { IHashProvider } from '@/core/providers/hash/interface/IHashProvider';
import { Resend } from 'resend';
import axios from 'axios';
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

  async create(dto: any) {
    const checkUserExist = await this.prisma.barbershop.findFirst({
      where: { email: dto.register_information.email },
    });

    if (checkUserExist) {
      throw new ConflictException('Email já em uso!');
    }
    const slug = this.generateSlug(dto.register_information.name);
    const checkSlugExist = await this.prisma.barbershop.findFirst({
      where: { slug },
    });

    if (checkSlugExist) {
      throw new ConflictException('Nome já em uso!');
    }

    const hashedPassword = await this.hashProvider.generateHash(dto.password);
    delete dto.password;
    const response = await axios.post(
      'https://api.pagar.me/core/v5/recipients',
      dto,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            process.env.PAGARME_API + ':',
          ).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const receiver = response.data;

    return this.prisma.barbershop.create({
      data: {
        name: dto.register_information.name,
        email: dto.register_information.email,
        password: hashedPassword,
        slug,
        fee: 5,
        haveLoyalty: false,
        receiverId: receiver?.id,
        address: {
          create: {
            street: dto.register_information.address.street,
            complementary: dto.register_information.address.complement,
            street_number: dto.register_information.address.number,
            neighborhood: dto.register_information.address.neighborhood,
            city: dto.register_information.address.city,
            state: dto.register_information.address.state,
            zipCode: dto.register_information.address.zip_code,
            referencePoint: dto.register_information.address.reference_point,
          },
        },
        bank: {
          create: {
            holderName: dto.default_bank_account.legal_name,
            holderDocument: dto.default_bank_account.document_number,
            holderType: dto.default_bank_account.type,
            bank: dto.default_bank_account.bank_code,
            branchNumber: dto.default_bank_account.agencia,
            branchCheckDigit: dto.default_bank_account.agencia_dv,
            accountNumber: dto.default_bank_account.conta,
            accountCheckDigit: dto.default_bank_account.conta_dv,
            type: dto.default_bank_account.type,
          },
        },
      },
      include: { bank: true, address: true },
    });
  }
  async forgot(data: any) {
    const checkUserExist = await this.prisma.barbershop.findFirst({
      where: { email: data.email },
    });

    if (!checkUserExist) {
      throw new ConflictException('Usuário não existe.');
    }
    const token = Math.floor(100000 + Math.random() * 900000);
    await this.prisma.barbershop.update({
      where: { id: checkUserExist.id },
      data: {
        ...checkUserExist,
        code: String(token),
      },
    });
    const resend = new Resend(process.env.RESEND_API);

    resend.emails.send({
      from: 'contato@nossonutri.com',
      to: data.email,
      subject: '[CorteJa] Recuperação de senha',
      html: `<style>
  .message-content {
    font-family: Arial, Helvetica, sans-serif;
    max-width: 600px;
    font-size: 18px;
    line-height: 21px;
  }
</style>

<div class="message-content">
  <p>Olá, ${checkUserExist?.name}</p>
  <p>Parece que uma troca de senha para sua conta foi solicitada.</p>
  <p>Se foi você, então clique no link abaixo para escolher uma nova senha:</p>
  <p>
    <a href="https://nossonutri.com/empresa/redefinir-senha?token=${token}">Resetar minha senha</a>
  </p>
  <p>Obrigado <br>
    <strong>Equipe NossoNutri</strong>
  </p>
</div>`,
    });
  }
  async reset(data: any) {
    const checkUserExist = await this.prisma.barbershop.findFirst({
      where: { code: data.code },
    });

    if (!checkUserExist) {
      throw new ConflictException('Usuário não existe.');
    }
    const hashedPassword = await this.hashProvider.generateHash(data.password);

    await this.prisma.barbershop.update({
      where: { id: checkUserExist.id },
      data: {
        ...checkUserExist,
        password: hashedPassword,
      },
    });
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
const pj = {
  register_information: {
    type: 'corporation',
    document: '44527868000110',
    name: '',
    email: 'augusto@hubees.com.br',
    phone_numbers: [
      {
        ddd: '24',
        number: '998169141',
        type: 'mobile',
      },
    ],
    site_url: null,
    company_name: 'Codar Teste',
    trading_name: 'Codar INFORMATICA LTDA',
    annual_revenue: 300000,
    founding_date: '',
    address: {
      street: 'Rua Senador Irineu Machado',
      complement: 'ap 501',
      number: '10',
      neighborhood: 'Jardim Amália',
      city: 'Volta Redonda',
      state: 'RJ',
      zip_code: '27251070',
      reference_point: 'esquina',
    },
    managing_partners: [
      {
        name: 'Augusto',
        email: 'augustotf93@gmail.com',
        document: '14752479745',
        type: 'individual',
        mother_name: 'maria rita',
        birth_date: '1993-11-23',
        monthly_income: '30000',
        professional_occupation: 'empresario',
        self_declared_legal_representative: false,
        address: {
          street: 'Rua Senador Irineu Machado',
          complement: 'com',
          number: '10',
          neighborhood: 'Jardim Amália',
          city: 'Volta Redonda',
          state: 'RJ',
          zip_code: '27251070',
          reference_point: 'subida',
        },
        phone_numbers: [
          {
            ddd: '24',
            number: '998169141',
            type: 'mobile',
          },
        ],
      },
    ],
    main_address: {
      street: 'Rua Senador Irineu Machado',
      complement: 'ap 501',
      number: '10',
      neighborhood: 'Jardim Amália',
      city: 'Volta Redonda',
      state: 'RJ',
      zip_code: '27251070',
      reference_point: 'esquina',
    },
  },
  default_bank_account: {
    bank: '260',
    branch_number: '0001',
    branch_check_digit: '0',
    account_number: '10995696',
    account_check_digit: '1',
    type: 'checking',
    holder_type: 'company',
    holder_document: '44527868000110',
    holder_name: 'HOME BOX 2 LTDA',
  },
};
const pf = {
  register_information: {
    type: 'individual',
    document: '14752479745',
    name: 'Augusto fisico',
    email: 'augustotf93@gmail.com',
    phone_numbers: [
      {
        ddd: '24',
        number: '998169141',
        type: 'mobile',
      },
    ],
    site_url: null,
    company_name: '',
    trading_name: '',
    annual_revenue: '',
    founding_date: '',
    address: {
      street: 'Rua Senador Irineu Machado',
      complement: 'ap 501',
      number: '10',
      neighborhood: 'Jardim Amália',
      city: 'Volta Redonda',
      state: 'RJ',
      zip_code: '27251070',
      reference_point: 'teste',
    },
    managing_partners: [
      {
        name: 'Augusto',
        email: 'augustotf93@gmail.com',
        document: '14752479745',
        type: 'individual',
        mother_name: 'maria rita',
        birth_date: '1993-11-23',
        monthly_income: '30000',
        professional_occupation: 'empresario',
        self_declared_legal_representative: false,
        address: {
          street: 'Rua Senador Irineu Machado',
          complement: 'com',
          number: '10',
          neighborhood: 'Jardim Amália',
          city: 'Volta Redonda',
          state: 'RJ',
          zip_code: '27251070',
          reference_point: 'subida',
        },
        phone_numbers: [
          {
            ddd: '24',
            number: '998169141',
            type: 'mobile',
          },
        ],
      },
    ],
    birth_date: '1993-11-23',
    professional_occupation: 'empresario',
    mother_name: 'maria rita',
    monthly_income: '300000',
  },
  default_bank_account: {
    bank: '260',
    branch_number: '0001',
    branch_check_digit: '0',
    account_number: '10995696',
    account_check_digit: '5',
    type: 'checking',
    holder_type: 'individual',
    holder_document: '14752479745',
    holder_name: 'Augusto Telles Francisco',
  },
};
