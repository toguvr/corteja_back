const fs = require('fs');
const path = require('path');

const TESTE_DIR = path.join(__dirname, 'teste');

// Função para remover a tipagem do DTO no método create e a importação correspondente
const removeDtoFromPost = (folderPath, pluralName) => {
  const singularName = pluralName.replace(/s$/, ''); // Remove o "s" final para encontrar o nome do DTO corretamente
  const controllerPath = path.join(folderPath, `${pluralName}.controller.ts`);

  if (!fs.existsSync(controllerPath)) {
    console.log(`❌ Arquivo não encontrado: ${controllerPath}`);
    return;
  }

  let content = fs.readFileSync(controllerPath, 'utf8');

  // Expressão regular para encontrar e remover a tipagem do DTO no método create
  content = content.replace(
    /(@Post\(\)\s*create\(@Body\(\)\s*\w+):\s*\w+/g,
    '$1',
  );

  // Expressão regular para remover a importação do CreateDto
  const importRegex = new RegExp(
    `import \\{[^}]*Create${singularName.charAt(0).toUpperCase() + singularName.slice(1)}Dto[^}]*\\} from './dto/create-${singularName}.dto';\\n`,
    'g',
  );

  content = content.replace(importRegex, '');

  fs.writeFileSync(controllerPath, content);
  console.log(`✅ Atualizado Controller: ${controllerPath}`);
};

// Função principal para processar todas as controllers
const updateControllers = () => {
  if (!fs.existsSync(TESTE_DIR)) {
    console.error(`❌ A pasta "${TESTE_DIR}" não existe.`);
    return;
  }

  fs.readdirSync(TESTE_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory()) // Apenas pastas
    .forEach((dirent) => {
      const pluralName = dirent.name; // Mantém o nome original da pasta
      const folderPath = path.join(TESTE_DIR, pluralName);

      if (fs.existsSync(folderPath)) {
        removeDtoFromPost(folderPath, pluralName);
      }
    });
};

updateControllers();
