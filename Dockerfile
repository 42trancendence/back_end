FROM node:bullseye
EXPOSE 3000

RUN		apt-get update && apt-get upgrade -y && apt-get install ssh vim nginx -y

COPY ./ /usr/local/transpong_be/
WORKDIR /usr/local/transpong_be/
# image로 만들 때 실행되는
RUN npm install

CMD ["sh", "./entrypoint.sh"]