const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const https = require('https');
const bodyParser = require('body-parser');
const axios = require('axios');

// Configuração do aplicativo
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// Carregar certificados SSL
const privateKey = fs.readFileSync('private.key', 'utf8');
const certificate = fs.readFileSync('certificate.crt', 'utf8');
const caBundle = fs.readFileSync('ca_bundle.crt', 'utf8');

const credentials = { key: privateKey, cert: certificate, ca: caBundle };

// Rota para calcular a distância
app.get('/api/distance', async (req, res) => {
  try {
    const response = await axios.get(`https://maps.googleapis.com/maps/api/distancematrix/json`, {
      params: {
        origins: req.query.origins,
        destinations: req.query.destinations,
        key: req.query.key
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching data from Google Maps API' });
  }
});

// Endpoint para gerar QR Code
app.get('/gerarqrcode', async (req, res) => {
  try {
    const { nome, cidade, valor, saida, txid, chave } = req.query;

    // Validação dos parâmetros (opcional)
    if (!nome || !cidade || !valor || !saida || !txid || !chave) {
      return res.status(400).json({ error: 'Todos os parâmetros são necessários.' });
    }

    // Faz a requisição GET para a API externa
    const response = await axios.get('https://gerarqrcodepix.com.br/api/v1', {
      params: { nome, cidade, valor, saida, txid, chave },
    });

    // Retorna o campo $.brcode da resposta da API externa
    const brcode = response.data.brcode;
    res.json({ brcode });
  } catch (error) {
    console.error('Erro ao solicitar o QR Code PIX:', error);
    res.status(500).json({ error: 'Erro ao gerar QR Code PIX.' });
  }
});

// Função para encontrar uma porta aleatória disponível
function findRandomPort() {
  return new Promise((resolve, reject) => {
    const server = https.createServer(credentials, app);
    server.listen(0, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

// Inicia o servidor HTTPS na porta aleatória
findRandomPort()
  .then(port => {
    https.createServer(credentials, app).listen(port, () => {
      console.log(`Servidor HTTPS rodando na porta ${port}`);
    });
  })
  .catch(err => {
    console.error('Erro ao encontrar uma porta aleatória:', err);
  });
