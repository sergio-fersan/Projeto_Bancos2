const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { MongoClient } = require('mongodb');
const neo4j = require('neo4j-driver');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// SQLITE (substituto do PostgreSQL) - SEM DOR DE CABEÇA!
// ============================================
const db = new sqlite3.Database('./database.db');

// Criar tabela automaticamente
db.run(`
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Inserir dados de exemplo
db.get("SELECT COUNT(*) as total FROM clientes", (err, row) => {
  if (!err && row.total === 0) {
    db.run("INSERT INTO clientes (nome, email) VALUES (?, ?)", 
      ['Cliente Demo', 'demo@email.com']
    );
    console.log('✅ SQLite: Dados de exemplo inseridos');
  }
});

console.log('✅ SQLite: Banco de dados relacional pronto');

// ============================================
// MONGODB
// ============================================
const mongoClient = new MongoClient('mongodb://localhost:27017');
let filmesCollection;

async function initMongoDB() {
  try {
    await mongoClient.connect();
    const db = mongoClient.db('avaliacao_filmes');
    filmesCollection = db.collection('filmes');
    console.log('✅ MongoDB conectado!');
    
    const count = await filmesCollection.countDocuments();
    if (count === 0) {
      await filmesCollection.insertOne({
        titulo: 'Filme Demo',
        ano: 2024,
        diretor: 'Diretor Demo',
        genero: 'Drama'
      });
      console.log('✅ MongoDB: Dados de exemplo inseridos');
    }
  } catch (error) {
    console.error('❌ MongoDB erro:', error.message);
  }
}

// ============================================
// NEO4J
// ============================================
const neo4jDriver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'admin123')
);

async function initNeo4j() {
  try {
    await neo4jDriver.verifyConnectivity();
    console.log('✅ Neo4j conectado!');
  } catch (error) {
    console.error('❌ Neo4j erro:', error.message);
  }
}

// ============================================
// ROTAS - CLIENTES (SQLite)
// ============================================
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
      console.log(`📊 Retornando ${rows.length} clientes`);
      res.json(rows);
    }
  });
});

// ============================================
// ROTAS - FILMES (MongoDB)
// ============================================
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
    console.log(`📊 Retornando ${filmes.length} filmes`);
    res.json(filmes);
  } catch (error) {
    res.status(500).json([]);
  }
});

// ============================================
// ROTAS - AVALIAÇÕES (Neo4j)
// ============================================
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

// ============================================
// INICIALIZAÇÃO
// ============================================
async function start() {
  console.log('🚀 Iniciando backend...\n');
  console.log('✅ SQLite (RDB) rodando');
  await initMongoDB();
  await initNeo4j();
  
  app.listen(3000, () => {
    console.log('\n✅ Servidor rodando na porta 3000');
    console.log('📍 http://localhost:3000');
    console.log('\n📋 Teste rápido:');
    console.log('   curl http://localhost:3000/api/clientes\n');
  });
}

start();