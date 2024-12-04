if (process.argv.includes("--debug")) {
    debug();
}

import { WebSocketServer } from "ws";

const server = new WebSocketServer({ port: 8080 });

const clients = new Map();

server.on("connection", (socket) => {
    socket.on("message", (message) => {
        const data = JSON.parse(message);

        switch (data.messageType) {
            case "join":
                // We just add the socket to the clients map so that the socket
                // becomes part of the available sockets to connect to
                clients.set(data.clientId, { socket: socket, inUse: false });
                break;

            case "iceCandidate":
                //If there isn't a target client id, then all the ice candidates go to nowhere
                if (data.targetClientId !== 0) {
                    // console.log(
                    //     `Attempting to connect ${data.clientId} to ${data.targetClientId}`
                    // );
                    const targetClient = clients.get(data.targetClientId);

                    if (targetClient && targetClient.socket) {
                        targetClient.socket.send(
                            JSON.stringify({
                                type: "signaledIceCandidate",
                                payload: data.payload,
                            })
                        );
                    } else {
                        console.log(
                            `No target socket for ${data.targetClientId}`
                        );
                    }
                }

                break;

            case "offer":
                const randomSocketId = getRandomSocketId(
                    clients,
                    data.clientId
                );
                if (randomSocketId === 0) {
                    // console.log("No available sockets");
                    break;
                } else {
                    const targetSocket = clients.get(randomSocketId).socket;
                    targetSocket.send(
                        JSON.stringify({
                            type: "signaledOffer",
                            payload: data.payload,
                            offeringClientId: data.clientId,
                        })
                    );
                }
                console.log(
                    data.clientId + " sending an offer to " + randomSocketId
                );

                break;
            case "answer": {
                console.log(
                    `Client ID: ${data.answeringClientId} answering to ${data.offeringClientId}`
                );
                const socketToAnswerTo = clients.get(
                    data.offeringClientId
                ).socket;
                // console.log(Object.keys(socketToAnswerTo));
                socketToAnswerTo.send(
                    JSON.stringify({
                        type: "signaledAnswer",
                        offeringClientId: data.offeringClientId,
                        payload: data.payload,
                    })
                );

                break;
            }

            case "socketUsed":
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
    const availableKeys = keys
        .filter((key) => key !== excludeKey)
        .filter((key) => !clients.get(key).inUse);

    if (availableKeys.length !== 0) {
        const randomKey =
            availableKeys[Math.floor(Math.random() * availableKeys.length)];
        return randomKey;
    } else {
        return 0;
    }
};

const getAvailableSocketIds = (clients) => {
    const availableSocketIds = [];
    for (const [key, value] of clients) {
        if (value.inUse === false) {
            availableSocketIds.push(key);
        }
    }
    return availableSocketIds;
};

function debug() {
    setInterval(() => {
        // console.log("Available sockets:");
        // console.log(getAvailableSocketIds(clients));
    }, 2000);
}
