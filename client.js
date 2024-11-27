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

    signalingSocket.onopen = () => {
        signalingSocket.send(JSON.stringify({ type: "join", clientId }));
        console.log("Connected to signaling server");
    };

    //Handles incoming messages from the signaling server
    signalingSocket.onmessage = async (message) => {
        const data = JSON.parse(message.data);

        if (data.type === "signal" && data.payload) {
            const { payload } = data;
            console.log(
                `${
                    payload.type
                } signal message received at ${new Date().toISOString()}`
            );
            if (payload.type === undefined) {
                console.log("payload type undefined");
                console.log(payload);
                console.log(data);
            }
            console.log(payload.type);
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
                        type: "signal",
                        clientId,
                        payload: peerConnection.localDescription,
                    })
                );

                signalingSocket.send(
                    JSON.stringify({
                        type: "socketUsed",
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
                        type: "socketUsed",
                        clientId,
                    })
                );

                //Neither answer or offer, so we just add an iceCandidate to the peer connection
            } else if (payload.candidate) {
                await peerConnection.addIceCandidate(
                    new RTCIceCandidate(payload)
                );
            }
        }
    };

    signalingSocket.onerror = (error) =>
        console.error("Signaling error:", error);
}

// Setup WebRTC connection
async function setupWebRTC() {
    peerConnection = new RTCPeerConnection();

    const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
    });
    stream
        .getTracks()
        .forEach((track) => peerConnection.addTrack(track, stream));
    localVideo.srcObject = stream;

    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = handleIceCandidate;

    // Create an offer for the peer
    const offer = await peerConnection.createOffer();
    //Setting the SDP
    await peerConnection.setLocalDescription(offer);

    signalingSocket.send(
        JSON.stringify({
            type: "signal",

            clientId,
            payload: peerConnection.localDescription,
        })
    );
}

const handleIceCandidate = (event) => {
    if (event.candidate) {
        signalingSocket.send(
            JSON.stringify({
                type: "signal",
                clientId,
                notifier: "peerConnection",
                payload: event.candidate,
            })
        );
    }
};

// Start everything
setupSignaling();
setupWebRTC();
