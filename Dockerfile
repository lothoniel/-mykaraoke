FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
EXPOSE 5174
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5174", "--strictPort"]
