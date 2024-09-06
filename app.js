const express = require('express');
const path = require('path');
const cors = require('cors');
const socketIO = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const bodyParser = require('body-parser');
const axios = require('axios');
const http = require('http');
const fs = require('fs');

// Configuração do aplicativo
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota para calcular a distância
app.get('/api/distance', async (req, res) => {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
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


app.get('/api/whatsapp', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});



const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// Função para adicionar um footer às mensagens
const addFooter = (message) => {
  return `${message}\n\n---\n_Coxinha Gourmet & Hamburgueria Artesanal_`;
};

// Função para enviar uma mensagem após um atraso
const sendDelayedMessage = async (message, delay, text) => {
  await new Promise(resolve => setTimeout(resolve, delay));
  await message.reply(addFooter(text));
};

// Função para desativar o bot por um período de tempo
const disableBotTemporarily = async (client, duration) => {
  client.isBotActive = false;
  await sendDelayedMessage(client, duration, 'O atendimento foi encerrado. Se precisar, por favor, envie uma nova mensagem.');
  client.isBotActive = true;
};

// Armazena o estado do bot e o tempo da última mensagem
client.isBotActive = true;
client.messageReceivedAt = null;
client.isFirstMessage = true;
client.isAttending = true;  // Adiciona uma flag para controle de atendimento

// Mensagem de boas-vindas e menu
client.on('message', async message => {
  // Enviar menu na primeira mensagem recebida
  if (client.isFirstMessage) {
      const welcomeMessage = `
      Olá! 👋 Bem-vindo à *Coxinha Gourmet & Hamburgueria Artesanal* 🍽️
      
      Estamos felizes em te atender! Aqui está o menu com todas as nossas opções:
      
      *1. Cardápio* 🍔🍟
      *2. Endereço* 📍
      *3. Chave PIX* 💸
      *4. Falar com atendente* 💬
      *5. Encerrar atendimento* 🚪
      
      Faça sua escolha enviando o número correspondente ou digite "menu" para ver o menu novamente.
      `;
      await message.reply(addFooter(welcomeMessage));
      client.isFirstMessage = false;
      client.messageReceivedAt = new Date();
      return;
  }

  // Verificar o tempo desde a última mensagem e enviar mensagem de atendimento encerrado se necessário
  const elapsedTime = new Date() - client.messageReceivedAt;
  if (elapsedTime > 10 * 60 * 1000) { // 10 minutos em milissegundos
      await sendDelayedMessage(message, 0, '⏳ Atendimento encerrado. Se precisar, envie uma nova mensagem.');
      client.messageReceivedAt = null; // Resetar o tempo de recebimento
      return;
  }

  if (!client.isBotActive) {
      return; // Bot está desativado temporariamente
  }

  // Respostas baseadas no número
  switch (message.body) {
      case '1':
          const cardapioUrl = 'https://bit.ly/4cXsJxO'; // URL do cardápio
          await message.reply(addFooter(`🍴 Aqui está o nosso cardápio completo: ${cardapioUrl}\n\nTemos opções deliciosas como pastel, hambúrguer, coxinha e batata frita. Faça seu pedido agora!`));
          break;
      case '2':
          const endereco = 'Avenida Principal Piranga, 1, Juazeiro - Bahia';
          const mapaUrl = 'https://maps.app.goo.gl/V5xJZQ12GHXHLus19'; // URL do mapa
          await message.reply(addFooter(`📍 Nosso endereço é: ${endereco}\n🗺️ Veja o mapa aqui: ${mapaUrl}`));
          break;
      case '3':
          await message.reply(addFooter(`💸 Chave PIX para pagamento: 130b4a72-a0f9-43d6-9ecc-0f01237d7a30`));
          break;
      case '4':
          await disableBotTemporarily(client, 20 * 60 * 1000); // Desativa o bot por 20 minutos
          await message.reply(addFooter('💬 Um atendente estará com você em breve. Por favor, aguarde um momento.'));
          break;
      case '5':
          await message.reply(addFooter('🚪 Atendimento encerrado. Se precisar de algo mais, envie uma nova mensagem.'));
          client.isBotActive = false; // Desativa o bot
          client.isFirstMessage = true; // Permite reiniciar o atendimento ao receber uma nova mensagem
          break;
      case 'menu':
          const menu = `
          🍽️ *Coxinha Gourmet & Hamburgueria Artesanal* 🍽️
          
          Escolha uma das opções abaixo:
          *1. Cardápio* 🍔🍟
          *2. Endereço* 📍
          *3. Chave PIX* 💸
          *4. Falar com atendente* 💬
          *5. Encerrar atendimento* 🚪
          `;
          await message.reply(addFooter(menu));
          break;
      default:
          if (client.isFirstMessage) {
              // Ignora erros na primeira mensagem
              return;
          }
          await message.reply(addFooter('⚠️ Escolha uma opção válida, ou digite "menu" para ver o menu novamente.'));
          break;
  }
});

// Responder a mensagens de áudio
client.on('message', async message => {
  if (message.type === 'audio') {
      await message.reply(addFooter('🔊 Desculpe, ainda não consigo ouvir áudios. Por favor, envie uma mensagem de texto.'));
  }
});

// Reiniciar o atendimento quando uma nova mensagem for recebida após o encerramento
client.on('message', async message => {
  if (!client.isBotActive) {
      client.isBotActive = true;
      client.isFirstMessage = true; // Permite reiniciar o atendimento
      await message.reply(addFooter('Digite "menu" para ver o menu principal.'));
      return;
  }
});

client.initialize().catch(error => {
  console.error('Erro ao inicializar o cliente:', error);
});
// Inicia o servidor HTTP na porta 3000
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Servidor HTTP rodando na porta ${PORT}`);
});