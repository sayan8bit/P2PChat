const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const clearButton = document.getElementById("clearButton");

// Generate a unique ID for this window/session
const currentWindowId =
  sessionStorage.getItem("windowId") || Date.now().toString();
sessionStorage.setItem("windowId", currentWindowId);

// Initialize message storage in localStorage
if (!localStorage.getItem("chatMessages")) {
  localStorage.setItem("chatMessages", JSON.stringify([]));
}

// Load and display messages from localStorage once
function loadMessages() {
  const storedMessages = JSON.parse(localStorage.getItem("chatMessages"));
  storedMessages.forEach(({ message, senderId }) => {
    const isLocal = senderId === currentWindowId;
    addMessage(message, isLocal, false);
  });
}

// Save messages to localStorage
function saveMessage(message, senderId) {
  const storedMessages = JSON.parse(localStorage.getItem("chatMessages"));
  storedMessages.push({ message, senderId });
  localStorage.setItem("chatMessages", JSON.stringify(storedMessages));
}

// Add a message to the chat
function addMessage(message, isLocal, persist = true) {
  const messageDiv = document.createElement("div");
  messageDiv.className = isLocal ? "local" : "remote"; // Align based on sender
  messageDiv.textContent = message;

  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto-scroll to the latest message

  // Save the message to local storage only if required
  if (persist) {
    saveMessage(message, isLocal ? currentWindowId : null); // Attach the senderId
  }
}

// Set up WebRTC and DataChannel
function setupWebRTC() {
  localConnection = new RTCPeerConnection();

  // Create a data channel
  dataChannel = localConnection.createDataChannel("chat");
  dataChannel.onopen = () => console.log("Data channel is open!");
  dataChannel.onmessage = (event) => {
    const receivedMessage = event.data;
    addMessage(receivedMessage, false); // Add the remote message to chat
  };

  // Handle ICE candidates
  localConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("ICE Candidate", JSON.stringify(event.candidate));
    }
  };

  // Handle incoming data channels
  localConnection.ondatachannel = (event) => {
    dataChannel = event.channel;
    dataChannel.onmessage = (e) => addMessage(e.data, false);
  };
}

// Create an offer
function createOffer() {
  localConnection.createOffer().then((offer) => {
    localConnection.setLocalDescription(offer);
    console.log("Offer", JSON.stringify(offer));
  });
}

// Handle received messages for SDP and ICE candidates
function handleMessage(input) {
  const data = JSON.parse(input);
  if (data.type === "offer") {
    localConnection
      .setRemoteDescription(new RTCSessionDescription(data))
      .then(() => {
        localConnection.createAnswer().then((answer) => {
          localConnection.setLocalDescription(answer);
          console.log("Answer", JSON.stringify(answer));
        });
      });
  } else if (data.type === "answer") {
    localConnection.setRemoteDescription(new RTCSessionDescription(data));
  } else if (data.candidate) {
    localConnection.addIceCandidate(new RTCIceCandidate(data));
  }
}

// Send a message
sendButton.addEventListener("click", () => {
  const message = messageInput.value.trim();
  if (message) {
    addMessage(message, true); // Display locally
    dataChannel.send(message); // Send to remote peer
    messageInput.value = ""; // Clear input box
  }
});

// Clear localStorage and messages
clearButton.addEventListener("click", () => {
  localStorage.removeItem("chatMessages");
  messagesDiv.innerHTML = ""; // Clear messages on screen
});

// Initialize chat
setupWebRTC();
createOffer();
loadMessages();

// For testing, allow manual message handling
window.handleMessage = handleMessage;
//perfect 2.0
