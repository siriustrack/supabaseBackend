# Usa uma imagem base oficial do Node.js com versão >=18
FROM node:18

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia o arquivo package.json para o diretório de trabalho
COPY package.json ./

# Instala o Yarn globalmente e as dependências do projeto
RUN npm install -g yarn && yarn install

# Copia todo o código fonte para o diretório de trabalho
COPY . .

# Compila o código TypeScript para JavaScript
RUN yarn build

# Exponha a porta 3000 (ou ajuste conforme necessário)
EXPOSE 3000

# Comando para iniciar o aplicativo
CMD ["yarn", "start"]
