
const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
const axios = require('axios');
app.use(bodyParser.json()); 






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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});


// Endpoint para receber os dados via GET e encaminhar para a API
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
