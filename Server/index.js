var WebSocketServer = require("websocket").server;

var server = require("http").createServer();
var clients = [];
var questions = [];
var port = process.env.PORT || 1337;

// Configure the websocket
var ws = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: true
}); 

// CONNECTION HANDLER FUNCTIONS //

// Handles new connections from clients.
function connectHandler(conn) {
    // identify the connected client
    conn.identifier = conn.remoteAddress;
    conn.on("message", messageHandler);
    conn.on("close", closeHandler);
    clients.push(conn);
    console.log("New Client connected: " + conn.identifier);
}

// Handle messages coming from clients.
function messageHandler(message) {
    var questionStr = message.utf8Data.toString();  
    var question = {
        user: this.identifier,
        question: questionStr,
        votes: 0,
    }

    questions.push(question)
    console.log("Received question from user: " + this.identifier + " message: " + question);
    broadcast();
    this.sendUTF("200");
}

// Removes a client whenever the connection with him is closed.
function closeHandler() {
    // Find the closed client connection in our list of clients
    var index = clients.indexOf(this);
    var clientID = clients[index].identifier;
    console.log("Client " + clientID + " has closed connection");
    if (index < 0) {
        console.log("The client " + clientID + " was not found in the server list of clients");
        return;
    }

    // Remove the client form our clients list.
    clients.splice(index, 1);
    console.log("Client " + clientID + " was removed successfully from registered clients");
}

function broadcast(){
    for(var i = 0 ; i < clients.length; i++){
        var c = clients[i];
        console.log("Broadcasting to: " + c.identifier);
        sendAllQuestionsToClient(c)
    }
}

function sendAllQuestionsToClient(client) {
    var msg = [];
    for (var i = 0; i < questions.length; i++) {
        var q = questions[i];
        msg.push(q.question);
    }
    console.log("Sending " + msg.toString() + " to " + client.identifier);
    client.sendUTF(msg.toString());
    console.log("Sent all currently available questions to client: " + client.identifier);
}

// EXECUTE //

// INITIALIZE SERVER //
ws.on("connect", connectHandler);
server.listen(port);
console.log("QyA listening on port: " + port);