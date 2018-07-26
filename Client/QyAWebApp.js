// CONNECTION
const host = "wss://qya-ppe.azurewebsites.net ";
const localhost = "ws://localhost:1337/";
const api = {
    responseTypes: {
        CLIENT_ID: "clientId",
        QUESTION: "question",
        QUESTIONS: "questions",
        SESSION_NOT_FOUND: "sessionNotFound",
        SESSION_CONNECTED: "sessionConnected",
        SUBMIT_QUESTION_SUCCESS: "submitQuestionSuccess",
    },
    requestTypes: {
        GET_QUESTIONS: "getQuestions",
        ATTACH_SESSION: "attachSession",
        SUBMIT_QUESTION: "submitQuestion",
        UPVOTE_QUESTION: "upvoteQuestion"

    }
}

const NOTIFICATION_DELAY = 10000;
var ws;
var clientId;

// UI ELEMENTS
var notificationDiv;
var pinNotificationDiv;
var pinInput;
var pinInput
var testingQuestionsList;
var inputDiv;
var pinRequestContainer;
var clientAppContainer;

// STATE VARIABLES
var currentQuestions = [];

// Entry point for application
function initialize() {
    setupUIElements();
    setupConnection();
}

function setupUIElements() {
    notificationDiv = document.getElementById("Notification");
    pinNotificationDiv = document.getElementById("PinNotification");
    testingQuestionsList = document.getElementById("Testing-QuestionsList")
    inputDiv = document.getElementById("questionTxt");
    pinInput = document.getElementById("sessionPIN");
    pinRequestContainer = document.getElementById("PinRequestContainer");
    clientAppContainer = document.getElementById("ClientAppContainer");
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
        console.log(e);
        console.log("Received: " + str);
        var response = JSON.parse(str);

        if (response.type == api.responseTypes.CLIENT_ID) {
            clientId = response.clientId.toString();
            console.log("Client ID: " + clientId)
        }
        else if (response.type == api.responseTypes.QUESTION) {
            if (!updateLocalQuestion(response.question.questionId, response.question)) {
                currentQuestions.push(response.question);
            }

            displayQuestions();
        }
        else if (response.type == api.responseTypes.QUESTIONS) {
            console.log(currentQuestions.length);
            currentQuestions = response.questions;
            displayQuestions();

        }
        else if (response.type == api.responseTypes.SESSION_NOT_FOUND) {
            console.log("We couldn't find the session, please make sure the ClientPIN is correct and try again.")
            displayPinNotification("We couldn't find the session, please make sure the ClientPIN is correct and try again.");
        }
        else if (response.type == api.responseTypes.SESSION_CONNECTED) {
            console.log("Connected to session");
            pinRequestContainer.style.display = "none";
            clientAppContainer.style.display = "block";
            getAllQuestions();
        }
        else if (response.type == api.responseTypes.SUBMIT_QUESTION_SUCCESS) {
            displayNotification("Question submmited successfully", "Green");
        }

    }, false);

    ws.addEventListener("close", () => {
        console.log("The connection has been closed.");
    }, false);

    ws.addEventListener("error", (e) => {
        console.log("The connection failed");
        console.log("Retrying with local url");
        setupConnection(localhost);
    }, false);
}

function getAllQuestions() {
    var msg = {
        type: api.requestTypes.GET_QUESTIONS,
        clientId: clientId.toString(),
    };
    console.log(msg);

    if (ws.readyState !== ws.OPEN) setupConnection();
    ws.send(JSON.stringify(msg));
}

// ON HTML FUNCTIONS //
function sendQuestion() {
    var msg = {
        type: api.requestTypes.SUBMIT_QUESTION,
        clientId: clientId.toString(),
        question: inputDiv.value
    };
    console.log("Sending question: ");
    console.log(msg);

    if (msg.question.length === 0) {
        displayNotification("Please type a question first.");
    }
    else {
        if (ws.readyState !== ws.OPEN) setupConnection();
        ws.send(JSON.stringify(msg));
    }
}

function sendPIN() {
    var clientPin = pinInput.value;
    if (clientPin.length === 0) {
        displayPinNotification("Invalid: please input a pin.");
    }
    else {
        var msg = {
            type: api.requestTypes.ATTACH_SESSION,
            clientPin: [clientPin],
            clientId: [clientId],
        };

        displayPinNotification("Searching for Session...");
        if (ws.readyState !== ws.OPEN) setupConnection();
        ws.send(JSON.stringify(msg));
    }
}

function submitUpvote(elem) {
    var questionId = elem.getAttribute("questionId");
    console.log(questionId);
    var question = getLocalQuestion(questionId);
    var msg = {
        type: api.requestTypes.UPVOTE_QUESTION,
        question: question,
        clientId: [clientId],
    };

    if (ws.readyState !== ws.OPEN) setupConnection();
    ws.send(JSON.stringify(msg));
}

function getLocalQuestion(qId) {
    for (var i = 0; i < currentQuestions.length; i++) {
        if (currentQuestions[i].questionId == qId)
            return currentQuestions[i];
    }
    return null;
}

function updateLocalQuestion(qId, question) {
    for (var i = 0; i < currentQuestions.length; i++) {
        if (currentQuestions[i].questionId == qId) {
            currentQuestions[i] = question;
            return true;
        }
    }
    return false;
}

// UI FUNCTIONS //

function displayQuestions() {
    currentQuestions.sort(function(a,b) {
        console.log("sortin");
        if (a.upvotes > b.upvotes) return -1;
        else if (a.upvotes < b.upvotes) return 1;
        else return 0;
    });
    testingQuestionsList.innerHTML = "";
    for (var i = 0; i < currentQuestions.length; i++) {
        var listOrder = i + 1;
        if (i === 0) {
            testingQuestionsList.innerHTML += '<li class="list-group-item-primary list-group-item">' + listOrder + '. ' + currentQuestions[i].questionStr + ' <span class="upvotesValue badge badge-primary badge-pill">' + currentQuestions[i].upvotes + '</span><img src="img/upvote.png" width="30px" class="upvoteButton" questionId="' + currentQuestions[i].questionId + '" onclick="submitUpvote(this)"/></li>';
            testingQuestionsList.innerHTML += '<h5 class="font-weight-bold"> Upcoming Questions </h5>';
        }
        else {
            testingQuestionsList.innerHTML += '<li class="list-group-item">' + listOrder + '. ' + currentQuestions[i].questionStr + ' <span class="upvotesValue badge badge-primary badge-pill">' + currentQuestions[i].upvotes + '</span><img src="img/upvote.png" width="30px" height="30px" class="upvoteButton" questionId="' + currentQuestions[i].questionId + '" onclick="submitUpvote(this)"/></li>';
        }
    }
}

function clearNotification() {
    notificationDiv.innerHTML = "";
}

function displayNotification(msg, color = "Red") {
    notificationDiv.innerHTML = msg;
    notificationDiv.style.color = color;
    setTimeout(clearNotification, NOTIFICATION_DELAY);
}

function clearPinNotification() {
    pinNotificationDiv.innerHTML = "";
}

function displayPinNotification(msg, color = "Red") {
    console.log("Notifying: " + msg);
    pinNotificationDiv.innerHTML = msg;
    pinNotificationDiv.style.color = color;
    setTimeout(clearPinNotification, NOTIFICATION_DELAY);
}



function questionTxtKeyPress(e) {
    if (e.keyCode == 13) {
        sendQuestion();
    }
}

// INITIALIZE GAME //
window.addEventListener("load", initialize, false);