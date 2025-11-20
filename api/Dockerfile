FROM node:20-alpine

WORKDIR /app

# Копируем package files
COPY package*.json ./

# Устанавливаем ВСЕ зависимости (включая dev для сборки)
RUN npm ci

# Копируем исходный код
COPY . .

# Собираем проект
RUN npm run build

# Удаляем dev зависимости после сборки (для уменьшения размера образа)
RUN npm prune --production

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["npm", "start"]

