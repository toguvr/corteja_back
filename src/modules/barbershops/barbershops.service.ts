import { ConflictException, Injectable } from '@nestjs/common';
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
