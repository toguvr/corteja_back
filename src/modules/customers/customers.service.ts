import { ConflictException, Injectable } from '@nestjs/common';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PrismaService } from '@/core/database/prisma.service';
import { Prisma } from '@prisma/client';
import { IHashProvider } from '@/core/providers/hash/interface/IHashProvider';
import * as pagarme from '@pagarme/sdk';
import { Resend } from 'resend';

const privateKey = process.env.PAGARME_API;
pagarme.Configuration.basicAuthUserName = privateKey;
@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashProvider: IHashProvider,
  ) {}

  async create({
    email,
    phone,
    password,
    name,
    document,
  }: Prisma.CustomerCreateInput) {
    if (!email) {
      throw new ConflictException('Email não informado!');
    }
    const checkUserExist = await this.prisma.customer.findFirst({
      where: { email: email },
    });

    if (checkUserExist) {
      throw new ConflictException('Email já em uso!');
    }
    const checkPhoneExist = await this.prisma.customer.findFirst({
      where: { phone: phone },
    });

    if (checkPhoneExist) {
      throw new ConflictException('Celular já em uso!');
    }

    const hashedPassword = await this.hashProvider.generateHash(password);
    const user = await this.prisma.customer.create({
      data: {
        password: hashedPassword,
        name,
        email,
        document,
        phone,
      },
    });

    const areaCode = phone.slice(0, 2); // Primeiro os dois dígitos
    const number = phone.slice(2); // O restante do número

    // Converte para o formato desejado
    const phones = {
      mobile_phone: {
        country_code: '55', // Código do Brasil
        area_code: areaCode,
        number,
      },
    };
    const customerRequest = new pagarme.CreateCustomerRequest({
      name,
      email,
      type: 'individual',
      document,
      phones,
      metadata: {
        user_id: user.id,
      },
    });

    const customerResponse =
      await pagarme.CustomersController.createCustomer(customerRequest);

    await this.prisma.customer.update({
      where: { id: user.id },
      data: {
        customerChargeGatewayId: customerResponse.id,
      },
    });
    return user;
  }

  async forgot(data: any) {
    const checkUserExist = await this.prisma.customer.findFirst({
      where: { email: data.email },
    });

    if (!checkUserExist) {
      throw new ConflictException('Usuário não existe.');
    }
    const token = Math.floor(100000 + Math.random() * 900000);
    await this.prisma.customer.update({
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
      subject: '[HoraCerta] Recuperação de senha',
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
    <a href="https://horacerta.app/redefinir-senha?token=${token}">Resetar minha senha</a>
  </p>
  <p>Obrigado <br>
    <strong>Equipe HoraCerta</strong>
  </p>
</div>`,
    });
  }
  async reset(data: any) {
    const checkUserExist = await this.prisma.customer.findFirst({
      where: { code: data.code },
    });

    if (!checkUserExist) {
      throw new ConflictException('Usuário não existe.');
    }
    const hashedPassword = await this.hashProvider.generateHash(data.password);

    await this.prisma.customer.update({
      where: { id: checkUserExist.id },
      data: {
        ...checkUserExist,
        password: hashedPassword,
      },
    });
  }
  async findAll() {
    return await this.prisma.customer.findMany();
  }

  async findAllUserCards(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer?.customerChargeGatewayId) {
      return [];
    }
    const cards = await pagarme.CustomersController.getCards(
      customer?.customerChargeGatewayId,
    );
    return cards?.data.map((card) => ({
      id: card.id,
      lastFourDigits: card.lastFourDigits,
      firstSixDigits: card.firstSixDigits,
      brand: card.brand,
    }));
  }

  async findMyAddress(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: { address: true },
    });
    return customer?.address;
  }

  async findOne(id: string) {
    return await this.prisma.customer.findFirst({ where: { id } });
  }

  async createCard({
    customerId,
    number,
    holder_name,
    holder_document,
    exp_month,
    exp_year,
    cvv,
    street_number,
    street,
    neighborhood,
    referencePoint,
    zipCode,
    city,
    state,
    complementary,
  }) {
    const user = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: { address: true },
    });

    if (!user?.address) {
      const address = await this.prisma.address.create({
        data: {
          city,
          complementary,
          neighborhood,
          referencePoint,
          state,
          street,
          street_number,
          zipCode,
        },
      });
      await this.prisma.customer.update({
        where: { id: customerId },
        data: { addressId: address?.id },
      });
    }

    const cardRequest = new pagarme.CreateCardRequest({
      customer_id: user?.customerChargeGatewayId,
      number,
      holderName: holder_name,
      holderDocument: holder_document,
      expMonth: exp_month,
      expYear: exp_year,
      cvv,
      billing_address: {
        line_1: `${street_number}, ${street}, ${neighborhood}`,
        line_2: `${complementary}${referencePoint ? ` - ${referencePoint}` : ''}`,
        zip_code: zipCode,
        city,
        state,
        country: 'BR',
      },
    });
    cardRequest.options = new pagarme.CreateCardOptionsRequest();
    cardRequest.options.verify_card = true;
    const cardResponse = await pagarme.CustomersController.createCard(
      user?.customerChargeGatewayId,
      cardRequest,
    );

    return await this.prisma.customer.update({
      where: { id: customerId },
      data: { cardId: cardResponse?.id },
    });
  }
  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    return await this.prisma.customer.update({
      where: { id },
      data: updateCustomerDto,
    });
  }

  async remove(id: string) {
    return await this.prisma.customer.delete({ where: { id } });
  }
}
