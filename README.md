## Explicação do tema escolhido:
O tema escolhido é um sistema de avaliação de filmes, similar à plataforma Letterboxd. Com essa plataforma, os usuários podem escolher um filme no catálogo para avaliar com uma nota de 0 a 10, um comentário e dizerem se recomendam ou não.
Graças aos bancos de dados escolhidos, foi possível criar um sistema de recomendação, em que o sistema recomenda um filme ao usuário com base nas suas avalições. Por exemplo, se um usuário A assiste o Filme 1, do gênero Ficção, e dá uma nota de 8, o sistema recomenda o Filme 2, que também é Ficção e tem uma nota similar.

## Justificativas dos bancos utilizados:
### RDB: SQLite
Utilizado para armazenar clientes, o SQLite é um banco de dados relacional. Como todos os clientes têm tipos de dados consistentes, um banco de dados relacional é perfeito.
### DB1: MongoDB
Usado para armazenar filmes, o MongoDB é um banco de dados que utiliza documentos em vez de tabelas. Alguns filmes podem ter tipos de dados diferentes de outros (por exemplo, pode ter campos "sequel" e "prequel"). O uso de documentos .json garante essa flexibilidade e permite que o sistema seja expansível para acomodar essas variações nos dados.
### DB2: Neo4j
O Neo4j é uma Graph Database, o que significa que ele implementa um sistema de grafos. Os relacionamentos entre usuários e filmes é feito com esses grafos, para criar o sistema de recomendações.

## Recursos necessários
- Docker Desktop
- Node.js

## Passo a passo para executar:
1. Abrir o Docker
2. Abrir o terminal na pasta do projeto
3. Comando "docker-compose up -d" para subir os containers
4. Na pasta "backend", comando "npm install"
5. Comando "node server.js"
6. Na pasta "frontend", abrir index.html

## Para desligar tudo:
1. Comando "docker-compose down"
2. ctrl + C no terminal para desligar o servidor
