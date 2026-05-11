const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { MongoClient } = require('mongodb');
const neo4j = require('neo4j-driver');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// sqlite
const db = new sqlite3.Database('./database.db');

db.run(`
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// dados de exemplo
db.get("SELECT COUNT(*) as total FROM clientes", (err, row) => {
  if (!err && row.total === 0) {
    db.run("INSERT INTO clientes (nome, email) VALUES (?, ?)", 
      ['Cliente Demo', 'demo@email.com']
    );
  }
});

console.log('SQLite OK');

// mongodb
const mongoClient = new MongoClient('mongodb://localhost:27017');
let filmesCollection;

async function initMongoDB() {
  try {
    await mongoClient.connect();
    const db = mongoClient.db('avaliacao_filmes');
    filmesCollection = db.collection('filmes');
    console.log('MongoDB OK');
    
    const count = await filmesCollection.countDocuments();
    if (count === 0) {
      await filmesCollection.insertOne({
        titulo: 'Filme Demo',
        ano: 2024,
        diretor: 'Diretor Demo',
        genero: 'Drama'
      });
    }
  } catch (error) {
    console.error('MongoDB erro:', error.message);
  }
}

// neo4j
const neo4jDriver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'admin123')
);

async function initNeo4j() {
  try {
    await neo4jDriver.verifyConnectivity();
    console.log('Neo4j OK');
  } catch (error) {
    console.error('Neo4j erro:', error.message);
  }
}

// rotas sqlite
app.post('/api/clientes', (req, res) => {
  const { nome, email } = req.body;
  
  db.run(
    'INSERT INTO clientes (nome, email) VALUES (?, ?)',
    [nome, email],
    function(err) {
      if (err) {
        console.error('Erro:', err.message);
        res.status(500).json({ error: err.message });
      } else {
        res.json({ id: this.lastID, nome, email });
      }
    }
  );
});

app.get('/api/clientes', (req, res) => {
  db.all('SELECT * FROM clientes ORDER BY id', (err, rows) => {
    if (err) {
      console.error('Erro:', err.message);
      res.status(500).json([]);
    } else {
      console.log(`Retornando ${rows.length} clientes`);
      res.json(rows);
    }
  });
});

// rotas mongodb
app.post('/api/filmes', async (req, res) => {
  const { titulo, ano, diretor, genero } = req.body;
  try {
    const result = await filmesCollection.insertOne({
      titulo, ano, diretor, genero, createdAt: new Date()
    });
    res.json({ _id: result.insertedId, titulo, ano, diretor, genero });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/filmes', async (req, res) => {
  try {
    const filmes = await filmesCollection.find({}).toArray();
    console.log(`Retornando ${filmes.length} filmes`);
    res.json(filmes);
  } catch (error) {
    res.status(500).json([]);
  }
});

// rotas neo4j
app.post('/api/avaliacoes', async (req, res) => {
  const { clienteId, filmeId, nota, comentario, recomendado } = req.body;
  const session = neo4jDriver.session();
  
  try {
    // Pega o nome do cliente do SQLite
    const cliente = await new Promise((resolve, reject) => {
      db.get('SELECT nome FROM clientes WHERE id = ?', [clienteId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    await session.run(
      `MERGE (c:Cliente {id: $clienteId, nome: $nome})
       MERGE (f:Filme {id: $filmeId})
       CREATE (c)-[r:AVALIOU {
         nota: $nota, 
         comentario: $comentario, 
         recomendado: $recomendado, 
         data: datetime()
       }]->(f)`,
      { 
        clienteId: clienteId.toString(), 
        nome: cliente.nome,
        filmeId: filmeId.toString(), 
        nota: parseInt(nota), 
        comentario, 
        recomendado: Boolean(recomendado)
      }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Erro:', error.message);
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

app.get('/api/recomendacoes/:clienteId', async (req, res) => {
  const { clienteId } = req.params;
  const session = neo4jDriver.session();
  
  try {
    const result = await session.run(
      `MATCH (c:Cliente {id: $clienteId})-[r:AVALIOU]->(f:Filme)
       WHERE r.recomendado = true
       RETURN f.id AS filmeId, r.nota AS nota, r.comentario AS comentario
       ORDER BY r.data DESC`,
      { clienteId: clienteId.toString() }
    );
    res.json(result.records.map(r => ({
      filmeId: r.get('filmeId'),
      nota: r.get('nota'),
      comentario: r.get('comentario')
    })));
  } catch (error) {
    console.error('Erro:', error.message);
    res.status(500).json([]);
  } finally {
    await session.close();
  }
});

// init
async function start() {
  await initMongoDB();
  await initNeo4j();
  
  app.listen(3000, () => {
    console.log('\nServidor na porta 3000');
  });
}

start();
