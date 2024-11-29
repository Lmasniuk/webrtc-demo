// const signalingServerUrl = "wss://webrtc-demo-rd3t.onrender.com";
const signalingServerUrl = "ws://localhost:8080";

const clientId = Math.random().toString(36).substring(2, 9); // Generate a random ID
let peerConnection;
let signalingSocket;

// Elements
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

// Initialize WebSocket connection
function setupSignaling() {
    signalingSocket = new WebSocket(signalingServerUrl);

    signalingSocket.onopen = connectToSignalServer;

    //Handles incoming messages from the signaling server
    signalingSocket.onmessage = processMessageFromSignalServer;

    signalingSocket.onerror = (error) =>
        console.error("Signaling error:", error);
}

// Setup WebRTC connection
async function setupWebRTC() {
    const servers = {
        iceServers: [
            {
                urls: [
                    "stun:stun1.l.google.com:19302",
                    "stun:stun2.l.google.com:19302",
                    "stun:stun3.l.google.com:19302",
                ],
            },
        ],
    };
    peerConnection = new RTCPeerConnection(servers);

    const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
    });
    localVideo.srcObject = stream;

    //This adds the audio/video data to the local webRTC stream
    stream
        .getTracks()
        .forEach((track) => peerConnection.addTrack(track, stream));

    // console.log("Get tracks:");
    // console.log(stream.getTracks());

    //This will get fired when a remote peer sends a media stream track
    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = handleIceCandidate;

    const offer = await peerConnection.createOffer();

    //Setting the SDP. This will begin to generate ICE candidates
    await peerConnection.setLocalDescription(offer);

    //Send the offer to the websocket, seeing if any other clients will "take it"
    signalingSocket.send(
        JSON.stringify({
            messageType: "offer",
            clientId,
            payload: peerConnection.localDescription,
        })
    );
}

/**
 * Handle ice candidate event.
 * @param {RTCPeerConnectionIceEvent} event - The event emitted by RTCPeerConnection.
 */
let iceCandies = 0;
const handleIceCandidate = (event) => {
    // console.log("Sending ICE candidate:", event.candidate);
    if (event.candidate) {
        signalingSocket.send(
            JSON.stringify({
                messageType: "iceCandidate",
                clientId,
                payload: event.candidate,
            })
        );
    }
};

const processMessageFromSignalServer = async (message) => {
    const messageData = JSON.parse(message.data);
    // console.log("Message received from signaling server");
    // console.log(messageData);

    if (messageData.type === "iceCandidateFromSignalingServer") {
        console.log("received ice candidate from another peer");
    }

    //If the message has a payload, that payload will be either a peerConnection.localDescription, or an iceCandidate
    if (messageData.type === "signal" && messageData.payload) {
        const { payload } = messageData;
        console.log(
            `${
                payload.type
            } signal message received at ${new Date().toISOString()}`
        );
        if (payload.type === undefined) {
            console.log("payload type undefined --> Candidate");
            console.log(payload);
        }
        // console.log(payload.type);
        if (payload.type === "offer") {
            console.log("payload type: offer");
            console.log(payload);
            await peerConnection.setRemoteDescription(
                new RTCSessionDescription(payload)
            );
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            signalingSocket.send(
                JSON.stringify({
                    messageType: "answer",
                    clientId,
                    payload: peerConnection.localDescription,
                })
            );

            signalingSocket.send(
                JSON.stringify({
                    messageType: "socketUsed",
                    clientId,
                })
            );
        } else if (payload.type === "answer") {
            console.log("payload type: answer");
            console.log(payload);
            await peerConnection.setRemoteDescription(
                new RTCSessionDescription(payload)
            );

            signalingSocket.send(
                JSON.stringify({
                    messageType: "socketUsed",
                    clientId,
                })
            );

            //Neither answer or offer, so we just add an iceCandidate to the peer connection
        } else if (payload.candidate) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(payload));
        }
    }
};

const connectToSignalServer = () => {
    //This adds the client id to the available sockets(managed by the signaling server) that can be connected to
    signalingSocket.send(JSON.stringify({ messageType: "join", clientId }));
    // console.log("Connected to signaling server");
};
// Start everything
setupSignaling();
setupWebRTC();
