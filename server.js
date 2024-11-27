if (process.argv.includes("--debug")) {
    debug();
}

import { WebSocketServer } from "ws";

const server = new WebSocketServer({ port: 8080 });

const clients = new Map();

let numberOfSignals = 0;

server.on("connection", (socket) => {
    console.log("Client connected");

    socket.on("message", (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case "join":
                clients.set(data.clientId, { socket: socket, inUse: false });
                console.log(`Client ${data.clientId} joined`);
                break;

            case "signal":
                numberOfSignals++;
                console.log("Client has sent a signal");
                const randomSocketId = getRandomSocketId(
                    clients,
                    data.clientId
                );
                console.log("NumSignals:", numberOfSignals);
                //Get a potentially available socket
                if (randomSocketId === 0) {
                    console.log("No available sockets");
                    break;
                } else {
                    console.log(
                        "Random socket id is available:",
                        randomSocketId
                    );
                    console.log(clients.keys());
                    //Send the signal to peer 2 to try and connect
                    const targetSocket = clients.get(randomSocketId).socket;

                    // console.log(targetSocket);
                    // if (targetSocket) {
                    targetSocket.send(
                        JSON.stringify({
                            type: "signal",
                            from: data.clientId,
                            payload: data.payload,
                        })
                    );
                    // }
                    break;
                }

            case "socketUsed":
                console.log(`Connection made by: ${data.clientId}`);
                console.log(data);
                const socketData = clients.get(data.clientId).socket;
                clients.set(data.clientId, {
                    socket: socketData,
                    inUse: true,
                });
                break;

            default:
                console.error("Unknown message type:", data.type);
        }
    });

    socket.on("close", () => {
        for (const [clientId] of clients.entries()) {
            if (clients.get(clientId).socket === socket) {
                clients.delete(clientId);
                console.log(`Client ${clientId} disconnected`);
                break;
            }
        }
    });
});

console.log("Signaling server running on ws://localhost:8080");

//Generates a random socket id
//returns 0 if there are no available sockets
const getRandomSocketId = (clients, excludeKey) => {
    const keys = Array.from(clients.keys());
    console.log(keys.length);
    const availableKeys = keys
        .filter((key) => key !== excludeKey)
        .filter((key) => !clients.get(key).inUse);
    console.log(availableKeys);

    if (availableKeys.length !== 0) {
        const randomKey =
            availableKeys[Math.floor(Math.random() * availableKeys.length)];
        return randomKey;
    } else {
        return 0;
    }
};

function debug() {
    setInterval(() => {
        // console.log(clients.keys());

        const availableSocketIds = [];
        for (const [key, value] of clients.entries()) {
            console.log(key);
            if (value.inUse === false) {
                availableSocketIds.push(key);
            }
        }
        console.log("Available sockets:");
        console.log(availableSocketIds);
    }, 2000);
}
