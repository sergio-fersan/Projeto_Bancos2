## Para rodar:
1. Abrir o Docker
2. Abrir o terminal na pasta do projeto
3. Comando "docker-compose up -d"
4. Comando "node server.js" na pasta backend
5. Abrir index.html

## Para desligar tudo:
1. Comando "docker-compose down"
2. ctrl + C no terminal

Esta é uma lista de perguntas que os grupos devem saber responder sobre o projeto:
1.	Qual o tema do projeto? Por que este tema foi escolhido? Quais outros temas foram considerados?

R: Sistema de avaliações de filmes, pois ambos curtimos a ideia de fazer algo parecido com o letterboxd, consideramos fazer uma gerenciamento de maquina de fliperama.

2.	Quem são os integrantes do grupo?

R: Gabriel Machado Da Silva RA:22.123.005-5 & Sergio de Siqueira Santos

3.	Quais bancos serão usados? Quais dados serão armazenados em cada banco? Explique o motivo da escolha de cada banco.
R: MYSQL (RDB), MONGODB (DB1), NEO4J (DB2)
4.	Qual linguagem será utilizada e quais são os pacotes necessários? Em qual ambiente será desenvolvido? Explique o motivo da escolha.

5.	Considerando o teorema CAP, o que pode acontecer quando cada um dos bancos não estiver disponível?
6.	Descreva como cada um dos bancos trabalha com o princípio de consistência.
7.	Para os bancos não-relacionais que possuem mais do que uma réplica e/ou particionamento, o que ocorre quando uma instância do banco fica indisponível? Quantas instâncias podem ficar indisponível e ainda garantir a consistência dos dados?
8.	Como foi decidida a divisão dos dados em cada um dos bancos? Por que foi dividido desta forma?
9.	Quais outros bancos foram considerados, além dos que foram escolhidos? O que levou o grupo a escolher estes bancos e não os outros?
10.	Será utilizado ORM para conectar com o banco? Qual ORM ou por que não será usado?
11.	Qual o formato dos dados que será utilizado no programa para representar os dados no banco relacional?
12.	Seria possível armazenar os dados do banco relacional em um banco não-relacional sem perder funcionalidades do projeto? Explique sua resposta.
13.	Seria possível armazenar os dados do banco não-relacional DB1 em um banco relacional ou outro tipo de NoSQL sem perder funcionalidades do projeto?
14.	Qual banco foi escolhido para o DB1 e qual o formato (i.e., tipo) dos dados que serão armazenados? Quais outras opções foram consideradas? Explique a escolha.
15.	Qual banco foi escolhido para o DB2 e qual o formato (i.e., tipo) dos dados que serão armazenados? Quais outras opções foram consideradas? Explique a escolha.
16.	Onde o projeto será executado no dia da apresentação? Qual o mínimo necessário para que ele seja desenvolvido? Por que será feito dessa forma?
17.	Caso no dia da apresentação o equipamento utilizado para o desenvolvimento não esteja disponível, como será feita a apresentação?
