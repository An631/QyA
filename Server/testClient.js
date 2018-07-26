var Question = require('./question');

//const host = "wss://qya.azurewebsites.net/";
const localhost = "ws://localhost:1337/";
var clientId;
var clientPin = process.argv[2];
var sessionId;
const WebSocket = require('ws');
var ws;

function messageHandler(messageStr) {
    console.log(messageStr.data);
    var message = JSON.parse(messageStr.data);
    switch (message.type)
    {
        case "clientId":
            clientId = message.clientId;
            console.log("Client has their clientId: " + clientId);
            msg = {
                type: "attachSession",
                clientId: clientId,
                name: "yash",
                clientPin: clientPin,
            };

            this.send(JSON.stringify(msg));
            break;

        case "sessionConnected":
            console.assert(clientId == message.clientId);
            sessionId = message.sessionId;

            var msg = {
                type: "submitQuestion",
                clientId: clientId,
                sessionId: sessionId,
                question: "This is a test question."
                };
            this.send(JSON.stringify(msg));
            //TODO verify the question was submitted successfully.
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
            var msg = {
                type: "upvoteQuestion",
                clientId: clientId,
                question: question
                };
            this.send(JSON.stringify(msg));
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

    ws.addEventListener("message", messageHandler);

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