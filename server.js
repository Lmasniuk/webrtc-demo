const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8080 });

const clients = new Map();

server.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('message', (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case 'join':
        clients.set(data.clientId, socket);
        console.log(`Client ${data.clientId} joined`);
        break;

      case 'signal':
        console.log(data.targetId);

        //TODO: Get random socket ID and connect to it.
        const targetSocket = clients.get(data.targetId);
        if (targetSocket) {
          targetSocket.send(JSON.stringify({
            type: 'signal',
            from: data.clientId,
            payload: data.payload,
          }));
        }
        break;

      default:
        console.error('Unknown message type:', data.type);
    }
  });

  socket.on('close', () => {
    for (const [clientId, clientSocket] of clients.entries()) {
      if (clientSocket === socket) {
        clients.delete(clientId);
        console.log(`Client ${clientId} disconnected`);
        break;
      }
    }
  });
});

console.log('Signaling server running on ws://localhost:8080');

setInterval(() => {
    console.log(clients.keys())
}, 5000);
