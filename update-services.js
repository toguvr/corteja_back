const fs = require('fs');
const path = require('path');

const TESTE_DIR = path.join(__dirname, 'teste');

// Mapeamento de palavras comuns do plural para singular (pode ser expandido)
const PLURAL_TO_SINGULAR = {
  users: 'user',
  products: 'product',
  orders: 'order',
  appointments: 'appointment',
  customers: 'customer',
  payments: 'payment',
  balances: 'balance',
  schedules: 'schedule',
  barbers: 'barber',
  banks: 'bank',
  addresses: 'address',
};

// Função para converter plural para singular
const toSingular = (word) => {
  return PLURAL_TO_SINGULAR[word] || word.replace(/s$/, ''); // Remove 's' se não estiver no mapeamento
};

// Template do Service
const SERVICE_TEMPLATE = (className, variableName) => `
import { Injectable } from '@nestjs/common';
import { Update${className}Dto } from './dto/update-${variableName}.dto';
import { PrismaService } from '@/core/database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ${className}Service {
  constructor(private readonly prisma: PrismaService) {}

  async create(create${className}Dto: Prisma.${className}CreateInput) {
    const response = await this.prisma.${variableName}.create({
      data: { ...create${className}Dto },
    });
    return response;
  }

  async findAll() {
    const response = await this.prisma.${variableName}.findMany();
    return response;
  }

  async findOne(id: string) {
    const response = await this.prisma.${variableName}.findFirst({ where: { id } });
    return response;
  }

  async update(id: string, update${className}Dto: Update${className}Dto) {
    const response = await this.prisma.${variableName}.update({
      where: { id },
      data: update${className}Dto,
    });
    return response;
  }

  async remove(id: string) {
    const response = await this.prisma.${variableName}.delete({ where: { id } });
    return response;
  }
}
`;

// Função para formatar o nome da classe (ex: "users" → "User")
const formatClassName = (folderName) => {
  const singularName = toSingular(folderName);
  return singularName
    .split(/[-_]/) // Divide por traços ou underscores
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitaliza cada palavra
    .join('');
};

// Função para formatar o nome da variável no Prisma (ex: "users" → "user")
const formatVariableName = (folderName) => {
  const className = formatClassName(folderName);
  return className.charAt(0).toLowerCase() + className.slice(1);
};

// Função principal para atualizar os services
const updateServices = () => {
  if (!fs.existsSync(TESTE_DIR)) {
    console.error(`A pasta "${TESTE_DIR}" não existe.`);
    return;
  }

  fs.readdirSync(TESTE_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory()) // Apenas pastas
    .forEach((dirent) => {
      const folderName = dirent.name;
      const singularName = toSingular(folderName); // Converte para singular
      const className = formatClassName(folderName);
      const variableName = formatVariableName(folderName);
      const serviceFilePath = path.join(
        TESTE_DIR,
        folderName,
        `${folderName}.service.ts`,
      );

      if (!fs.existsSync(serviceFilePath)) {
        console.log(`Arquivo não encontrado: ${serviceFilePath}. Pulando...`);
        return;
      }

      // Atualiza o conteúdo do arquivo
      fs.writeFileSync(
        serviceFilePath,
        SERVICE_TEMPLATE(className, variableName),
      );
      console.log(`Service atualizado: ${serviceFilePath}`);
    });
};

updateServices();
