// CONNECTION
const host = "wss://qya-ppe.azurewebsites.net/";
const localhost = "ws://localhost:1337/";
const api = {
    responseTypes: {
        CLIENT_ID: "clientId",
        QUESTION: "question",
        QUESTIONS: "questions",
        SESSION_NOT_FOUND: "sessionNotFound",
        SESSION_CONNECTED: "sessionConnected",
        SESSION_CREATED: "sessionCreated",
        SUBMIT_QUESTION_SUCCESS: "submitQuestionSuccess",        
        CONTINUE_SESSION_SUCCESS: "continueSessionSuccess"
    },
    requestTypes: {
        GET_QUESTIONS: "getQuestions",
        ATTACH_SESSION: "attachSession",
        SUBMIT_QUESTION: "submitQuestion",
        CONTINUE_SESSION: "continueSession",
        CREATE_SESSION: "createSession"
    }
}
var ws;

// STATE VARIABLES
var currentQuestions = [];

// UI ELEMENTS
var notificationDiv;
var testingQuestionsList;
var inputDiv;
var titleDiv;
var startTimeDiv;
var endTimeDiv;
var clientPin;
var clientId;
var question;
var titleDisplay;
var clientPinDisplay;
var adminPinDisplay;
var adminToggleButton;

// Entry point for application
function initialize() {
    setupUIElements();
    setupConnection();
}

function setupUIElements() {
    notificationDiv = document.getElementById("Notification");
    testingQuestionsList = document.getElementById("Testing-QuestionsList")
    titleDiv = document.getElementById("title");
    startTimeDiv = document.getElementById("startTime");
    endTimeDiv = document.getElementById("endTime");
    question = document.getElementById("question");

    clientPinDisplay = document.getElementById("ClientPinDisplay");
    titleDisplay = document.getElementById("TitleDisplay");
    adminPinDisplay = document.getElementById("AdminPinDisplay");
    adminToggleButton = document.getElementById("AdminToggleButton");
    adminToggleButton.style.display = "none";
    ClientPinContainer.style.display = "none";

    var currentDate = new Date();
    startTimeDiv.value = currentDate.toISOString().substring(0, 16);
    endTimeDiv.value = currentDate.toISOString().substring(0, 16);;
}

// Initiates a connection with the websocket server and 
// setting up its connection listeners
function setupConnection(url = host) {
    console.log("Opening websocket connection to: " + url);
    ws = new WebSocket(url);

    ws.addEventListener("open", () => {
        console.log("Connection started");
    }, false);

    ws.addEventListener("message", (e) => {
        var str = e.data;
        console.log("Received: " + str);

        var response = JSON.parse(str);
        if (response.type == api.responseTypes.SESSION_CREATED) {
            console.log("Successfully created session");
            //notificationDiv.innerHTML = "Admin Pin: " + response.adminPin;
            clientPin = response.clientPin.toString();
            console.log("Client PIN is: " + clientPin);
            SessionCreateContainer.style.display = "none";
            RejoinContainer.style.display = "none";
            ClientPinContainer.style.display = "block";
            adminToggleButton.style.display = "block";
            adminPinDisplay.innerHTML = response.adminPin;
            titleDisplay.innerHTML = titleDiv.value + ": Use this PIN to join this session: ";
            clientPinDisplay.innerHTML = clientPin;
        }
        else if ( response.type == api.responseTypes.CONTINUE_SESSION_SUCCESS){
            clientPin = response.clientPin.toString();
            console.log("Client PIN is: " + clientPin);
            SessionCreateContainer.style.display = "none";
            RejoinContainer.style.display = "none";
            ClientPinContainer.style.display = "block";
            adminToggleButton.style.display = "block";
            adminPinDisplay.innerHTML = response.adminPin;
            titleDisplay.innerHTML = titleDiv.value + ": Use this PIN to join this session: ";
            clientPinDisplay.innerHTML = clientPin;
            getAllQuestions();
        }
        else if (response.type == api.responseTypes.CONTINUE_SESSION_){

        }
        else if (response.type == api.responseTypes.CLIENT_ID) {
            clientId = response.clientId.toString();
            console.log("Client ID: " + clientId)
        }
        else if (response.type == api.responseTypes.QUESTIONS) {
            currentQuestions = response.questions;
            displayQuestions();
        }
        else if (response.type == api.responseTypes.QUESTION) {
            console.log("Received a question: " + response.question.questionStr);
            currentQuestions.push(response.question);
            displayQuestions();
        }


    }, false);

    ws.addEventListener("close", () => {
        console.log("Connection closed");
    }, false);

    ws.addEventListener("error", (e) => {
        console.log("The connection failed");
        console.log("Retrying with local url");
    }, false);
}

// ON HTML FUNCTIONS //

function createSession() {
    var sessionStart = new Object();
    sessionStart.title = titleDiv.value;
    sessionStart.startTime = startTimeDiv.value;
    sessionStart.endTime = endTimeDiv.value;

    if (sessionStart.title.toString() == "") {
        notificationDiv.innerHTML = "Title is empty. Please enter a title.";
        notificationDiv.style.color = "Red";
        setTimeout(clearNotification, 10000);
    }
    else {
        var msg = {
            type: api.requestTypes.CREATE_SESSION,
            clientId: clientId,
            title: sessionStart.title,
            startTime: sessionStart.startTime,
            endTime: sessionStart.endTime,
        };
        console.log(msg.toString());

        if (ws.readyState !== ws.OPEN) setupConnection();
        ws.send(JSON.stringify(msg));
    }
}

function rejoinSession() {
    if (rejoinPin.value.toString() == "") {
        notificationDiv.innerHTML = "Admin PIN is empty. Please enter a valid PIN.";
        notificationDiv.style.color = "Red";
        setTimeout(clearNotification, 10000);
    }
    else {
        var msg = {
            type: api.requestTypes.CONTINUE_SESSION,
            clientId: clientId,
            adminPin: [rejoinPin.value.toString()],
        };
        console.log(msg.toString());

        if (ws.readyState !== ws.OPEN) setupConnection();
        ws.send(JSON.stringify(msg));
    }
}

function getAllQuestions() {
    var msg = {
        type: "getQuestions",
        clientId: clientId.toString(),
    };
    console.log(msg.toString());

    if (ws.readyState !== ws.OPEN) setupConnection();
    ws.send(JSON.stringify(msg));
}

function sendQuestion() {
    var msg = {
        type: "submitQuestion",
        clientId: clientId.toString(),
        question: question.value
    };
    console.log(msg.toString());

    if (ws.readyState !== ws.OPEN) setupConnection();
    ws.send(JSON.stringify(msg));

    getAllQuestions();
}

function displayQuestions() {
    testingQuestionsList.innerHTML = "";
    for (var i = 0; i < currentQuestions.length; i++) {
        var listOrder = i + 1;
        if (i === 0) {
            testingQuestionsList.innerHTML += '<li class="list-group-item-primary list-group-item">' + listOrder + '. ' + currentQuestions[i].questionStr + '</li>';
            testingQuestionsList.innerHTML += '<h5 class="font-weight-bold"> Upcoming Questions </h5>';
        }
        else {
            testingQuestionsList.innerHTML += '<li class="list-group-item">' + listOrder + '. ' + currentQuestions[i].questionStr + '</li>';
        }
    }
}

function clearNotification() {
    notificationDiv.innerHTML = "";
}

// INITIALIZE //
window.addEventListener("load", initialize, false);