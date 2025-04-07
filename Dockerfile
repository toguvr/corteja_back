# Use a imagem oficial do Node.js como base
FROM node:20

# Define o diretório de trabalho dentro do container
WORKDIR /usr/src/app

# Copia os arquivos de dependências
COPY package*.json prisma/schema.prisma ./

# Instala as dependências
RUN npm install

# Gera o Prisma Client
RUN npx prisma generate

# Copia o restante dos arquivos da aplicação
COPY . .

# Compila a aplicação NestJS
RUN npm run build

# Expõe a porta da aplicação
EXPOSE 3333

# Comando para rodar a aplicação
CMD ["node", "dist/main"]
