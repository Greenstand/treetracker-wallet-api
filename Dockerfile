FROM node:16-alpine
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH
COPY package.json package-lock.json ./
RUN npm ci --silent
COPY . .
RUN npm run build
EXPOSE 3006
# CMD ["node", "dist/main"]
CMD ["npm", "run", "start:dev"]
