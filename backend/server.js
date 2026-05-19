const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { MongoClient, ObjectId } = require('mongodb');
const neo4j = require('neo4j-driver');

const app = express();
app.use(cors());
app.use(express.json());


// SQLITE - Usuários
const db = new sqlite3.Database('./database.db');

// Criar tabela de usuários
db.run(`
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);


db.get("SELECT COUNT(*) as total FROM clientes", (err, row) => {
  if (!err && row.total === 0) {
    db.run(
      "INSERT INTO clientes (nome, email, senha) VALUES (?, ?, ?)",
      ['Usuário Demo', 'demo@email.com', '123456']
    );
    console.log('✅ SQLite: Usuário demo criado (email: demo@email.com, senha: 123456)');
  }
});

// ROTA DE LOGIN
app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;
  
  db.get(
    'SELECT id, nome, email FROM clientes WHERE email = ? AND senha = ?',
    [email, senha],
    (err, user) => {
      if (err) {
        res.status(500).json({ error: 'Erro no servidor' });
      } else if (user) {
        res.json({ 
          success: true, 
          user: {
            id: user.id,
            nome: user.nome,
            email: user.email
          }
        });
      } else {
        res.status(401).json({ error: 'Email ou senha inválidos' });
      }
    }
  );
});

// ROTA DE CADASTRO
app.post('/api/cadastro', (req, res) => {
  const { nome, email, senha } = req.body;
  
  db.run(
    'INSERT INTO clientes (nome, email, senha) VALUES (?, ?, ?)',
    [nome, email, senha],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          res.status(400).json({ error: 'Email já cadastrado' });
        } else {
          res.status(500).json({ error: err.message });
        }
      } else {
        res.json({ 
          success: true, 
          user: { id: this.lastID, nome, email }
        });
      }
    }
  );
});

// MONGODB - Filmes
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
      await filmesCollection.insertMany([
        { titulo: 'O Poderoso Chefão', ano: 1972, diretor: 'Francis Ford Coppola', genero: 'Drama' },
        { titulo: 'Interestelar', ano: 2014, diretor: 'Christopher Nolan', genero: 'Ficção' },
        { titulo: 'Toy Story', ano: 1995, diretor: 'John Lasseter', genero: 'Animação' },
        { titulo: 'Matrix', ano: 1999, diretor: 'Lana Wachowski', genero: 'Ficção' },
        { titulo: 'Forrest Gump', ano: 1994, diretor: 'Robert Zemeckis', genero: 'Drama' }
      ]);
      console.log('✅ MongoDB: Filmes de exemplo inseridos');
    }
  } catch (error) {
    console.error('❌ MongoDB erro:', error.message);
  }
}

// ROTAS DE FILMES
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
    res.json(filmes);
  } catch (error) {
    res.status(500).json([]);
  }
});

// NEO4J - Avaliações
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

// Criar ou atualizar avaliação
app.post('/api/avaliacoes', async (req, res) => {
    const { userId, filmeId, nota, comentario, recomendado } = req.body;
    const session = neo4jDriver.session();
    
    try {
        // Buscar nome do usuário no SQLite
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT nome FROM clientes WHERE id = ?', [userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        // Buscar título do filme no MongoDB
        const filme = await filmesCollection.findOne({ _id: new ObjectId(filmeId) });
        
        if (!filme) {
            return res.status(404).json({ error: 'Filme não encontrado' });
        }
        
        // Verificar se já existe uma avaliação
        const checkResult = await session.run(
            `MATCH (u:Usuario {id: $userId})-[r:AVALIOU]->(f:Filme {id: $filmeId})
             RETURN r`,
            {
                userId: userId.toString(),
                filmeId: filmeId.toString()
            }
        );
        
        if (checkResult.records.length > 0) {
            // update
            await session.run(
                `MATCH (u:Usuario {id: $userId})-[r:AVALIOU]->(f:Filme {id: $filmeId})
                 SET r.nota = $nota,
                     r.comentario = $comentario,
                     r.recomendado = $recomendado,
                     r.atualizado = true
                 RETURN r`,
                {
                    userId: userId.toString(),
                    filmeId: filmeId.toString(),
                    nota: parseInt(nota),
                    comentario,
                    recomendado: Boolean(recomendado)
                }
            );
            res.json({ success: true, updated: true });
        } else {
            // criar nova avaliação
            await session.run(
                `MERGE (u:Usuario {id: $userId, nome: $nome})
                 MERGE (f:Filme {id: $filmeId, titulo: $titulo})
                 CREATE (u)-[r:AVALIOU {
                     nota: $nota,
                     comentario: $comentario,
                     recomendado: $recomendado,
                     atualizado: false
                 }]->(f)`,
                {
                    userId: userId.toString(),
                    nome: user.nome,
                    filmeId: filmeId.toString(),
                    titulo: filme.titulo,
                    nota: parseInt(nota),
                    comentario,
                    recomendado: Boolean(recomendado)
                }
            );
            res.json({ success: true, updated: false });
        }
    } catch (error) {
        console.error('Erro detalhado:', error);
        res.status(500).json({ error: error.message });
    } finally {
        await session.close();
    }
});

// Buscar avaliações do usuário
app.get('/api/minhas-avaliacoes/:userId', async (req, res) => {
  const { userId } = req.params;
  const session = neo4jDriver.session();
  
  try {
    const result = await session.run(
      `MATCH (u:Usuario {id: $userId})-[r:AVALIOU]->(f:Filme)
       RETURN f.id AS filmeId, f.titulo AS titulo, 
              r.nota AS nota, r.comentario AS comentario, 
              r.recomendado AS recomendado, r.data AS data
       ORDER BY r.data DESC`,
      { userId: userId.toString() }
    );
    res.json(result.records.map(r => ({
      filmeId: r.get('filmeId'),
      titulo: r.get('titulo'),
      nota: r.get('nota'),
      comentario: r.get('comentario'),
      recomendado: r.get('recomendado'),
    })));
  } catch (error) {
    console.error('Erro:', error.message);
    res.status(500).json([]);
  } finally {
    await session.close();
  }
});

// Rota para ver todos os clientes (admin)
app.get('/api/clientes', (req, res) => {
  db.all('SELECT id, nome, email FROM clientes ORDER BY id', (err, rows) => {
    if (err) {
      res.status(500).json([]);
    } else {
      res.json(rows);
    }
  });
});

// ROTAS ADMIN - CLIENTES (SQLite)

// Atualizar cliente
app.put('/api/clientes/:id', (req, res) => {
    const { id } = req.params;
    const { nome, email } = req.body;
    
    db.run(
        'UPDATE clientes SET nome = ?, email = ? WHERE id = ?',
        [nome, email, id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else if (this.changes === 0) {
                res.status(404).json({ error: 'Cliente não encontrado' });
            } else {
                res.json({ success: true });
            }
        }
    );
});

// Deletar cliente e avaliações
app.delete('/api/clientes/:id', async (req, res) => {
    const { id } = req.params;
    const session = neo4jDriver.session();
    
    try {
        // Deletar relações no Neo4j
        await session.run(
            'MATCH (c:Usuario {id: $id}) DETACH DELETE c',
            { id: id.toString() }
        );
        
        // Deletar do SQLite
        db.run('DELETE FROM clientes WHERE id = ?', [id], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else if (this.changes === 0) {
                res.status(404).json({ error: 'Cliente não encontrado' });
            } else {
                res.json({ success: true });
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        await session.close();
    }
});

// ROTAS ADMIN - FILMES (MongoDB)

// Atualizar filme
app.put('/api/filmes/:id', async (req, res) => {
    const { id } = req.params;
    const { titulo, ano, diretor, genero } = req.body;
    
    try {
        const result = await filmesCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { titulo, ano, diretor, genero, updatedAt: new Date() } }
        );
        
        if (result.matchedCount === 0) {
            res.status(404).json({ error: 'Filme não encontrado' });
        } else {
            res.json({ success: true });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Deletar filme
app.delete('/api/filmes/:id', async (req, res) => {
    const { id } = req.params;
    const session = neo4jDriver.session();
    
    try {
        // Deletar relações no Neo4j
        await session.run(
            'MATCH (f:Filme {id: $id}) DETACH DELETE f',
            { id }
        );
        
        // Deletar do MongoDB
        const result = await filmesCollection.deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            res.status(404).json({ error: 'Filme não encontrado' });
        } else {
            res.json({ success: true });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        await session.close();
    }
});

// ROTA PARA ESTATÍSTICAS (Admin)

app.get('/api/estatisticas', async (req, res) => {
    const session = neo4jDriver.session();
    
    try {
        // Contar total de avaliações no Neo4j
        const result = await session.run(
            `MATCH (:Usuario)-[r:AVALIOU]->(:Filme)
             RETURN COUNT(r) as total`
        );
        
        const totalAvaliacoes = result.records[0].get('total').toNumber();
        
        res.json({ totalAvaliacoes });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: error.message });
    } finally {
        await session.close();
    }
});

// ROTA DE RECOMENDAÇÕES BASEADAS EM USUÁRIOS SIMILARES

app.get('/api/recomendacoes/similares/:userId', async (req, res) => {
    const { userId } = req.params;
    const session = neo4jDriver.session();
    
    try {
        // Buscar avaliações do usuário
        const userRatings = await session.run(
            `MATCH (u:Usuario {id: $userId})-[r:AVALIOU]->(f:Filme)
             WHERE f.titulo IS NOT NULL AND f.titulo <> ''
             RETURN f.id AS filmeId, r.nota AS nota, r.recomendado AS recomendado, f.titulo AS titulo`,
            { userId: userId.toString() }
        );
        
        if (userRatings.records.length === 0) {
            return res.json({ 
                message: "Avalie alguns filmes para receber recomendações!",
                recomendacoes: [] 
            });
        }
        
        // Buscar recomendações baseadas em usuários similares
        const result = await session.run(
            `MATCH (u:Usuario {id: $userId})-[r1:AVALIOU]->(f1:Filme)
             WHERE f1.titulo IS NOT NULL AND f1.titulo <> ''
             MATCH (outro:Usuario)-[r2:AVALIOU]->(f1:Filme)
             WHERE outro.id <> $userId 
               AND abs(r1.nota - r2.nota) <= 2
             MATCH (outro)-[r3:AVALIOU]->(f2:Filme)
             WHERE r3.recomendado = true
               AND f2.titulo IS NOT NULL 
               AND f2.titulo <> ''
               AND NOT EXISTS((u)-[:AVALIOU]->(f2))
             RETURN DISTINCT f2.id AS filmeId, 
                    f2.titulo AS titulo,
                    COUNT(*) AS peso,
                    AVG(r3.nota) AS mediaNota
             ORDER BY peso DESC, mediaNota DESC
             LIMIT 6`,
            { userId: userId.toString() }
        );
        
        if (result.records.length === 0) {
            const fallback = await session.run(
                `MATCH (f:Filme)<-[r:AVALIOU]-()
                 WHERE r.recomendado = true
                   AND f.titulo IS NOT NULL 
                   AND f.titulo <> ''
                   AND NOT EXISTS((:Usuario {id: $userId})-[:AVALIOU]->(f))
                 RETURN DISTINCT f.id AS filmeId, 
                        f.titulo AS titulo,
                        AVG(r.nota) AS mediaNota,
                        COUNT(*) AS totalAvaliacoes
                 ORDER BY mediaNota DESC, totalAvaliacoes DESC
                 LIMIT 6`,
                { userId: userId.toString() }
            );
            
            const recomendacoes = fallback.records
                .filter(record => record.get('titulo') && record.get('titulo') !== 'null')
                .map(record => ({
                    filmeId: record.get('filmeId'),
                    titulo: record.get('titulo'),
                    mediaNota: Math.round(record.get('mediaNota') * 10) / 10,
                    motivo: "🔥 Mais recomendado do catálogo"
                }));
            
            return res.json({ 
                recomendacoes,
                tipo: "popular"
            });
        }
        
        const recomendacoes = [];
        
        for (const record of result.records) {
            const filmeId = record.get('filmeId');
            const titulo = record.get('titulo');
            
            if (!titulo || titulo === 'null' || titulo === 'undefined') {
                continue;
            }
            
            const peso = record.get('peso').toNumber();
            const mediaNota = Math.round(record.get('mediaNota') * 10) / 10;
            
            // Buscar um exemplo de usuário similar
            const exemplo = await session.run(
                `MATCH (outro:Usuario)-[r:AVALIOU]->(f:Filme {id: $filmeId})
                 WHERE r.recomendado = true
                 WITH outro
                 LIMIT 1
                 RETURN outro.nome AS nome`,
                { filmeId: filmeId.toString() }
            );
            
            let motivo = `Recomendado por ${peso} usuário(s) similares`;
            if (exemplo.records.length > 0) {
                const nomeUsuario = exemplo.records[0].get('nome');
                if (nomeUsuario && nomeUsuario !== 'null') {
                  if (peso > 1) {
                    motivo = `👥 ${nomeUsuario} e outros ${peso - 1} usuários similares recomendam`;
                  } else {
                    motivo = `👥 Usuário ${nomeUsuario} recomenda`;
                  }
                }
            }
            
            recomendacoes.push({
                filmeId,
                titulo,
                mediaNota,
                motivo,
                peso
            });
        }
        
        res.json({ 
            recomendacoes: recomendacoes.slice(0, 6),
            tipo: recomendacoes.length > 0 ? "personalizado" : "popular"
        });
        
    } catch (error) {
        console.error('Erro detalhado:', error);
        res.json({ 
            recomendacoes: [],
            tipo: "erro",
            message: "Erro ao gerar recomendações. Tente novamente mais tarde."
        });
    } finally {
        await session.close();
    }
});

// init
async function start() {
  console.log('Iniciando backend...\n');
  console.log('SQLite rodando');
  await initMongoDB();
  await initNeo4j();
  
  app.listen(3000, () => {
    console.log('\nServidor rodando na porta 3000');
  });
}

start();