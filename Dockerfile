FROM node:22-alpine
WORKDIR /app
COPY . .
COPY run-migrations.sh ./run-migrations.sh
RUN chmod +x ./run-migrations.sh 
RUN npm install
RUN npm run build
EXPOSE 3000
CMD ["npm","run","start"]