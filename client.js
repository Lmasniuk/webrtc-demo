const signalingServerUrl = 'ws://localhost:8080';
const clientId = Math.random().toString(36).substr(2, 9); // Generate a random ID
let peerConnection;
let signalingSocket;

const peerId = prompt("Enter your peer's ID");

// Elements
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

// Initialize WebSocket connection
function setupSignaling() {
  signalingSocket = new WebSocket(signalingServerUrl);

  signalingSocket.onopen = () => {
    signalingSocket.send(JSON.stringify({ type: 'join', clientId }));
    console.log('Connected to signaling server');
  };

  signalingSocket.onmessage = async (message) => {
    console.log("Onmessage");
    
    const data = JSON.parse(message.data);

    if (data.type === 'signal' && data.payload) {
      const { payload, from } = data;
      if (payload.type === 'offer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(payload));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        signalingSocket.send(JSON.stringify({
          type: 'signal',
          clientId,
          targetId: from,
          payload: peerConnection.localDescription,
        }));
      } else if (payload.type === 'answer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(payload));
      } else if (payload.candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(payload));
      }
    }
  };

  signalingSocket.onerror = (error) => console.error('Signaling error:', error);
}

// Setup WebRTC connection
async function setupWebRTC() {
  peerConnection = new RTCPeerConnection();

  peerConnection.onicecandidate = (event) => {
    console.log(event);
    
    console.log("ice candidate");
    
    if (event.candidate) {
      signalingSocket.send(JSON.stringify({
        type: 'signal',
        clientId,
        targetId: peerId, // Target is broadcast in this basic example
        payload: event.candidate,
      }));
    }
  };

  peerConnection.ontrack = (event) => {
    console.log("ontrack");
    
    remoteVideo.srcObject = event.streams[0];
  };

  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));
  localVideo.srcObject = stream;

  // Create an offer for the peer
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  signalingSocket.send(JSON.stringify({
    type: 'signal',
    clientId,
    targetId: peerId, // Target is broadcast in this basic example
    payload: peerConnection.localDescription,
  }));
}

// Start everything
setupSignaling();
setupWebRTC();
