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
};

// Função para converter plural para singular, levando em conta palavras irregulares
const toSingular = (word) => PLURAL_TO_SINGULAR[word] || word.replace(/s$/, '');

// Função para formatar corretamente os nomes de classes (ex: "appointments" → "Appointment")
const formatClassName = (name) => {
  return name
    .split(/[-_]/) // Divide palavras por traços ou underscores
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitaliza corretamente
    .join('');
};

// Atualiza o DTO de Update
const updateDtoFile = (folderPath, pluralName) => {
  const singularName = toSingular(pluralName); // Ajusta para singular corretamente
  const className = formatClassName(singularName);
  const dtoPath = path.join(folderPath, 'dto', `update-${singularName}.dto.ts`);
  const createDtoPath = `./create-${singularName}.dto`;

  if (!fs.existsSync(dtoPath)) {
    console.log(`❌ Arquivo não encontrado: ${dtoPath}`);
    return;
  }

  const newContent = `
import { Create${className}Dto } from '${createDtoPath}';

export type Update${className}Dto = Partial<Create${className}Dto> & {};
  `.trim();

  fs.writeFileSync(dtoPath, newContent);
  console.log(`✅ Atualizado DTO: ${dtoPath}`);
};

// Função principal para atualizar os DTOs
const updateFiles = () => {
  if (!fs.existsSync(TESTE_DIR)) {
    console.error(`❌ A pasta "${TESTE_DIR}" não existe.`);
    return;
  }

  fs.readdirSync(TESTE_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory()) // Apenas pastas
    .forEach((dirent) => {
      const pluralName = dirent.name.toLowerCase(); // Mantém o nome da pasta minúsculo
      const folderPath = path.join(TESTE_DIR, pluralName, 'dto');

      if (fs.existsSync(folderPath)) {
        updateDtoFile(path.join(TESTE_DIR, pluralName), pluralName);
      }
    });
};

updateFiles();
