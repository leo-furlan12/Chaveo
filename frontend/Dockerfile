FROM node:20-slim

# Instala as bibliotecas de C++ que o slim remove e que o Tailwind v4 precisa
RUN apt-get update && apt-get install -y --no-install-recommends \
    libc6 \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

# Instala as dependências mantendo as opcionais (necessárias para os binários nativos)
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]