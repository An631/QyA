// CONNECTION
//const host = "wss://qya.azurewebsites.net/";
const host = "ws://localhost:1337/";
var ws;

// UI ELEMENTS
var notificationDiv;
var testingQuestionsList;
var inputDiv;

// Entry point for application
function initialize(){
    setupUIElements();
    setupConnection();
}

function setupUIElements(){
    notificationDiv = document.getElementById("Notification");
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
            notificationDiv.innerHTML = "The question was received succesfully";
            setTimeout(clearNotification, 3000);
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

// UI FUNCTIONS //
function clearNotification() {
    notificationDiv.innerHTML = "";
}

function questionTxtKeyPress(e){
    if(e.keyCode == 13){
        sendQuestion();
    }
}

// INITIALIZE GAME //
window.addEventListener("load", initialize, false);