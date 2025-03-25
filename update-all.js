const fs = require('fs');
const path = require('path');

const TESTE_DIR = path.join(__dirname, 'teste');

// Mapeamento de plural para singular para palavras irregulares
const PLURAL_TO_SINGULAR = {
  addresses: 'address',
  appointments: 'appointment',
  balances: 'balance',
  banks: 'bank',
  customers: 'customer',
  payments: 'payment',
  schedules: 'schedule',
  barbers: 'barber',
  users: 'user',
};

// Função para converter plural para singular
const toSingular = (word) => PLURAL_TO_SINGULAR[word] || word.replace(/s$/, '');

// Função para formatar corretamente os nomes de classes
const formatClassName = (name) => {
  return name
    .split(/[-_]/) // Divide palavras por traços ou underscores
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitaliza corretamente
    .join('');
};

// 🟢 Atualiza o DTO de Update
const updateDtoFile = (folderPath, pluralName) => {
  const singularName = toSingular(pluralName);
  const classNameSingularName = formatClassName(singularName);
  const dtoPath = path.join(folderPath, 'dto', `update-${singularName}.dto.ts`);
  const createDtoPath = `./create-${singularName}.dto`;

  if (!fs.existsSync(dtoPath)) return;

  const newContent = `
import { Create${classNameSingularName}Dto } from '${createDtoPath}';

export type Update${classNameSingularName}Dto = Partial<Create${classNameSingularName}Dto> & {};
  `.trim();

  fs.writeFileSync(dtoPath, newContent);
  console.log(`✅ Atualizado DTO: ${dtoPath}`);
};

// 🟢 Remove o DTO do método `create`, a importação do CreateDto e corrige o nome do serviço no `constructor`
const fixController = (folderPath, pluralName) => {
  const singularName = toSingular(pluralName);
  const className = formatClassName(pluralName);
  const classNameSingular = formatClassName(singularName);
  const controllerPath = path.join(folderPath, `${pluralName}.controller.ts`);

  if (!fs.existsSync(controllerPath)) return;

  let content = fs.readFileSync(controllerPath, 'utf8');

  // Remover a tipagem do DTO no método create
  content = content.replace(
    /(@Post\(\)\s*create\(@Body\(\)\s*\w+):\s*\w+/g,
    '$1',
  );

  // Remover a importação do CreateDto
  const importRegex = new RegExp(
    `import \\{[^}]*Create${classNameSingular}Dto[^}]*\\} from './dto/create-${singularName}.dto';\\n`,
    'g',
  );
  content = content.replace(importRegex, '');

  // Corrigir a injeção do serviço no constructor
  content = content.replace(
    new RegExp(
      `constructor\$begin:math:text$private readonly (${pluralName}Service): ([a-zA-Z]+)Service\\$end:math:text$`,
      'g',
    ),
    `constructor(private readonly ${singularName}Service: ${className}Service)`,
  );

  // Corrigir a importação do serviço
  content = content.replace(
    new RegExp(
      `import \\{ ([a-zA-Z]+)Service \\} from './${pluralName}.service';`,
      'g',
    ),
    `import { ${className}Service } from './${pluralName}.service';`,
  );

  fs.writeFileSync(controllerPath, content);
  console.log(`✅ Atualizado Controller: ${controllerPath}`);
};

// 🟢 Remove `+id` dos métodos `findOne`, `update`, `remove`
const removePlusFromControllers = (folderPath, pluralName) => {
  const controllerPath = path.join(folderPath, `${pluralName}.controller.ts`);

  if (!fs.existsSync(controllerPath)) return;

  let content = fs.readFileSync(controllerPath, 'utf8');

  // Remover apenas o "+" nos parâmetros numéricos (ex: `+id` -> `id`)
  content = content.replace(/\+id/g, 'id');

  fs.writeFileSync(controllerPath, content);
  console.log(`✅ Atualizado Controller (Removido +id): ${controllerPath}`);
};

// 🟢 Atualiza os arquivos de Service
const SERVICE_TEMPLATE = (pluralClassName, variableName, singularClassName) => `
import { Injectable } from '@nestjs/common';
import { Update${singularClassName}Dto } from './dto/update-${variableName}.dto';
import { PrismaService } from '@/core/database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ${pluralClassName}Service {
  constructor(private readonly prisma: PrismaService) {}

  async create(create${singularClassName}Dto: Prisma.${singularClassName}CreateInput) {
    const response = await this.prisma.${variableName}.create({
      data: { ...create${singularClassName}Dto },
    });
    return response;
  }

  async findAll() {
    return await this.prisma.${variableName}.findMany();
  }

  async findOne(id: string) {
    return await this.prisma.${variableName}.findFirst({ where: { id } });
  }

  async update(id: string, update${singularClassName}Dto: Update${singularClassName}Dto) {
    return await this.prisma.${variableName}.update({
      where: { id },
      data: update${singularClassName}Dto,
    });
  }

  async remove(id: string) {
    return await this.prisma.${variableName}.delete({ where: { id } });
  }
}
`;

const updateServiceFiles = (folderPath, pluralName) => {
  const singularName = toSingular(pluralName);
  const classNamePlural = formatClassName(pluralName);
  const classNameSingular = formatClassName(singularName);
  const variableName = singularName.toLowerCase();
  const servicePath = path.join(folderPath, `${pluralName}.service.ts`);

  if (!fs.existsSync(servicePath)) return;

  fs.writeFileSync(
    servicePath,
    SERVICE_TEMPLATE(classNamePlural, variableName, classNameSingular),
  );
  console.log(`✅ Atualizado Service: ${servicePath}`);
};

// 🟢 Função principal para processar todas as alterações
const updateFiles = () => {
  if (!fs.existsSync(TESTE_DIR)) {
    console.error(`❌ A pasta "${TESTE_DIR}" não existe.`);
    return;
  }

  fs.readdirSync(TESTE_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .forEach((dirent) => {
      const pluralName = dirent.name;
      const folderPath = path.join(TESTE_DIR, pluralName);

      // Atualiza DTOs
      if (fs.existsSync(path.join(folderPath, 'dto'))) {
        updateDtoFile(folderPath, pluralName);
      }

      // Atualiza Controllers
      if (fs.existsSync(folderPath)) {
        fixController(folderPath, pluralName);
        removePlusFromControllers(folderPath, pluralName);
      }

      // Atualiza Services
      if (fs.existsSync(folderPath)) {
        updateServiceFiles(folderPath, pluralName);
      }
    });
};

// Executar o script
updateFiles();
