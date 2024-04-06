FROM node:18-alpine as build
WORKDIR /app
RUN npm i -g @angular/cli@14
COPY . .
RUN npm ci && ng build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist/verse-client /usr/share/nginx/html
EXPOSE 80
