const fs = require('fs');
const path = require('path');

const TESTE_DIR = path.join(__dirname, 'teste');

// Função para remover apenas o "+" nos parâmetros numéricos das controllers
const removePlusFromControllers = (folderPath, pluralName) => {
  const controllerPath = path.join(folderPath, `${pluralName}.controller.ts`);

  if (!fs.existsSync(controllerPath)) {
    console.log(`❌ Arquivo não encontrado: ${controllerPath}`);
    return;
  }

  let content = fs.readFileSync(controllerPath, 'utf8');

  // Remover apenas o "+" nos parâmetros numéricos (ex: `+id` -> `id`)
  const updatedContent = content.replace(
    /@Param\('id'\) id: string\) => this\.\w+\.\w+\(\+id/g,
    (match) => match.replace('+id', 'id'),
  );

  if (updatedContent !== content) {
    fs.writeFileSync(controllerPath, updatedContent);
    console.log(`✅ Atualizado Controller: ${controllerPath}`);
  }
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
      const pluralName = dirent.name; // Mantém o nome da pasta original
      const folderPath = path.join(TESTE_DIR, pluralName);

      if (fs.existsSync(folderPath)) {
        removePlusFromControllers(folderPath, pluralName);
      }
    });
};

updateControllers();
