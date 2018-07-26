//const host = "wss://qya.azurewebsites.net/";
const localhost = "ws://localhost:1337/";
var clientId;
var clientPin = 1234;
var sessionId;
const WebSocket = require('ws');
var ws;

function adminMessageHandler(messageStr) {
    console.log(messageStr.data);
    var message = JSON.parse(messageStr.data);

    switch (message.type)
    {
        case "clientId":
            clientId = message.clientId;
            var msg = {
                type: "createSession",
                clientId: clientId,
                name: "yashAdmin",
                title: "Test Session",
                startTime: "2018-07-25T00:44",
                endTime: "2018-07-25T00:45"
            }
            this.send(JSON.stringify(msg));
            break;

        case "sessionCreated":
            console.log("Session created " + message.sessionId);
            console.log("Admin pin " + message.adminPin);
            console.log("Client pin " + message.clientPin);
            break;

        case "questions":
            console.assert(clientId == message.clientId);
            questions = message.questions;
            console.log("Got questions from server.");
            questions.forEach(question => {
                console.log(question.questionId + " " + question.questionStr);
            });
            break;

        case "question":
            console.assert(clientId == message.clientId);
            question = message.question;
            console.log("Server notified about a new question.")
            console.log(question.questionId + " " + question.questionStr);
            break;
    }
}

// Initiates a connection with the websocket server and 
// setting up its connection listeners
function setupConnection(url = localhost) {
    console.log("Opening websocket connection to: " + url);
    var ws = new WebSocket(url);

    ws.addEventListener("open", () => {
        console.log("Connection started");
    }, false);

    ws.addEventListener("message", adminMessageHandler);

    ws.addEventListener("close", () => {
        console.log("Connection closed");
    }, false);

    ws.addEventListener("error", (e) => {
        console.log("The connection failed");
        console.log("Retrying with local url");
        setupConnection(localhost);
    }, false);
}

setupConnection();