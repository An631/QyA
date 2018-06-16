// CONNECTION
const host = "wss://qya.azurewebsites.net/";
//const host = "wss://localhost:1337/";
var ws;

// UI ELEMENTS
var testingResponseDiv;
var testingQuestionsList;
var inputDiv;

// Entry point for application
function initialize(){
    setupUIElements();
    setupConnection();
}

function setupUIElements(){
    testingResponseDiv = document.getElementById("Testing-Response");
    testingQuestionsList = document.getElementById("Testing-QuestionsList")
    inputDiv = document.getElementById("questionTxt");
}
// Initiates a connection with the websocket server and 
// setting up its connection listeners
function setupConnection() {
    ws = new WebSocket(host);

    ws.addEventListener("open", () => {
        console.log("Connection started");
    }, false);

    ws.addEventListener("message", (e) => {
        var str = e.data;
        console.log("Received: " + str);
        if(str == 200) {
            testingResponseDiv.innerHTML = "The question was received succesfully";
        }
        else {
            var regex = new RegExp(',','g');
            testingQuestionsList.innerHTML = str.replace(regex,'<br>');
        }

    }, false);

    ws.addEventListener("close", () => {
        console.log("Connection closed");
    }, false);

    ws.addEventListener("error", (e) => {
        console.log("The connection failed");

    }, false);
}

// ON HTML FUNCTIONS //
function sendQuestion() {
    var question = inputDiv.value;
    if (ws.readyState !== ws.OPEN) setupConnection();
    ws.send(question);
}

// INITIALIZE GAME //
window.addEventListener("load", initialize, false);