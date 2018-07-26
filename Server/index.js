var Session = require('./Session');
var Client = require('./client');
var Question = require('./question');
var WebSocketServer = require("websocket").server;

var server = require("http").createServer();
var port = process.env.PORT || 1337;

var clientIdToConn = {}
var clientIdToName = {}
var connToClientId = {}
var clientIdToSession = {}
var adminIdToSession = {}

// Configure the websocket
var ws = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: true
}); 

firstId = 0; //Date.now;

function getNewClientId()
{
    return "C_" + ++firstId;
}

// CONNECTION HANDLER FUNCTIONS //

// Handles new connections from clients.
function connectHandler(conn) {
    // identify the connected client
    conn.clientId = getNewClientId();
    conn.on("message", messageHandler);
    conn.on("close", closeHandler);
    clientIdToConn[conn.clientId] = conn;
    connToClientId[conn] = conn.clientId;

    message = {
        type: "clientId",
        clientId: conn.clientId
    };

    conn.sendUTF(JSON.stringify(message));
    console.log("New client connected: " + conn.clientId);
}

// Removes a client whenever the connection with him is closed.
function closeHandler() {
    // Find the closed client connection in our list of clients
    var clientId = connToClientId[this];

    console.log("Client " + clientId + " has closed connection");
    if (clientId == null) {
        console.log("The client " + clientId + " was not found in the server list of clients");
        return;
    }

    // Remove the client from our clients list.
    console.log("Removing client Id: " + clientId);
    var isAdmin;
    var session = clientIdToSession[clientId] ? clientIdToSession[clientId] : adminIdToSession[clientId];

    if (session != null) {
        if (clientIdToSession[clientId] != null) {
            console.log("Detaching client " + clientId + " from session " + session.sessionId);
            session.detachClient(clientId, (success) => {
                if (success) {
                    console.log("Client detached.");
                }
                else {
                    console.log("[BUG][BUG]: Client detached failed. Client id " + clientId);
                }

                delete clientIdToSession[clientId];
            });
        }
        else {
            session.adminId = null;
            delete adminIdToSession[clientId];
        }
    }
    
    delete connToClientId[this];
    delete clientIdToConn[clientId];
    delete clientIdToName[clientId];
    console.log("Removed connection for " + clientId);
}

// Handle messages coming from clients.
function messageHandler(messageStr) {
    console.log(messageStr);
    var message = JSON.parse(messageStr.type == 'utf8' ? messageStr.utf8Data : messageStr.data);
    switch (message.type)
    {
        case "createSession":
            clientId = message.clientId;
            name = (message.name == null) ? "Anonymous" : message.name;
            title = message.title;
            startTime = message.startTime;
            endTime = message.endTime;

            clientIdToName[clientId] = name;
            var session = new Session(title, clientId, startTime, endTime);
            session.createSession(() => {
                console.log("Session created with session Id " + session.sessionId);
                var msg = {
                    type: "sessionCreated",
                    clientId: clientId,
                    clientPin: session.clientPin,
                    adminPin: session.adminPin,
                    sessionId: session.sessionId,
                  };
                
                  adminIdToSession[clientId] = session;
                  this.sendUTF(JSON.stringify(msg));
            });
            break;

        case "continueSession":
            clientId = message.clientId;
            adminPin = message.adminPin;
            name = (message.name == null) ? "Anonymous" : message.name;

            clientIdToName[clientId] = name;

            Session.continueSession(clientId, adminPin, (session) => {
                console.log("Continuing session with session Id " + session.sessionId);
                var msg = {
                    type: "continueSessionSuccess",
                    clientId: clientId,
                    clientPin: session.clientPin,
                    adminPin: session.adminPin,
                    session: session
                  };
                
                  adminIdToSession[clientId] = session;
                  this.sendUTF(JSON.stringify(msg));
            });
            break;

        case "attachSession":
            clientId = message.clientId;
            name = (message.name == null) ? "Anonymous" : message.name;
            clientIdToName[clientId] = name;
            console.log("Request to attach from client: " + clientId);
            conn = this;
            clientPin = message.clientPin;
            Session.attachClient(clientPin, clientId, (session) => {
                if (session != null) {
                    var msg = {
                        type: "sessionConnected",
                        clientId: clientId,
                        clientPin: clientPin,
                        sessionId: session.Id,
                    };

                    clientIdToSession[clientId] = session;
                }
                else {
                    var msg = {
                        type: "sessionNotFound",
                        clientId: clientId,
                        clientPin: clientPin,
                        error: "No session found for the specified pin."
                    };
                }

                conn.sendUTF(JSON.stringify(msg));
            });
            break;

        case "submitQuestion":
            clientId = message.clientId;
            questionStr = message.question;
            conn = this;
            session = clientIdToSession[clientId];

            if (session != null)
            {
                var question = new Question(session.sessionId, clientIdToName[clientId], questionStr);
                session.submitQuestion(question, (question) => {
                    if (question) {
                        console.log("Added question " + message.question);
                    }
                })
                var msg = {
                    type: "submitQuestionSuccess",
                    clientId: clientId,
                    question: question
                }
            }
            else
            {
                var msg = {
                    type: "sessionNotConnected",
                    clientId: clientId,
                    error: "Client is not connected to any session."
                  };
            }

            conn.sendUTF(JSON.stringify(msg));
            broadcastV2(session, question);
            break;

        case "getQuestions":
            clientId = message.clientId;
            conn = this;
            console.assert(conn == clientIdToConn[clientId]);
            session = clientIdToSession[clientId] ? clientIdToSession[clientId] : adminIdToSession[clientId];
            
            if (session != null)
            {
                session.getQuestions((questions)=>{
                    var msg = {
                        type: "questions",
                        clientId: clientId,
                        sessionId: session.Id,
                        questions: questions
                    }
                    conn.sendUTF(JSON.stringify(msg));
                })
            }
            else
            {
                var msg = {
                    type: "sessionNotConnected",
                    clientId: clientId,
                    error: "Client is not connected to any session."
                  };
                  conn.sendUTF(JSON.stringify(msg));
            }
            break;

        case "upvoteQuestion":
            clientId = message.clientId;
            question = message.question;
            session = clientIdToSession[clientId];

            if (session != null) {
                session.upvoteQuestion(question, (result, updatedQuestion) => {
                    var msg;
                    if (result) {
                        console.log("Upvote question " + updatedQuestion.questionId + " for session " + session.sessionId);
                        console.log("New upvote count " + updatedQuestion.upvotes);

                        msg = {
                            type: "upvoteQuestionSuccess",
                            clientId: clientId,
                            question: updatedQuestion
                        }
                    }
                    else {
                        msg = {
                            type: "upvoteQuestionFailure",
                            clientId: clientId,
                            question: updatedQuestion
                        }
                    }
                    this.sendUTF(JSON.stringify(msg));
                    broadcastV2(session, updatedQuestion);
                });
            }
            else {
                var msg = {
                    type: "sessionNotConnected",
                    clientId: clientId,
                    error: "Client is not connected to any session."
                  };

                this.sendUTF(JSON.stringify(msg));
            }
            break;

        case "submitAnswer":
            clientId = message.clientId;
            questionId = message.questionId;
            answer = message.answer;
            session = clientIdToSession[clientId];

            if (session != null)
            {
                session.submitAnswer(questionId, (result, question) => {
                    var msg;
                    if (result) {
                        console.log("Submitted answer for " + questionId + " for session " + session.sessionId);
                        msg = {
                            type: "submitAnswerSuccess",
                            clientId: clientId,
                            question: question
                        }
                    }
                    else {
                        msg = {
                            type: "submitAnswerFailure",
                            clientId: clientId,
                            questionId: questionId,
                            answer: answer
                        }
                    }
                    this.sendUTF(JSON.stringify(msg));
                });
            }
            else
            {
                var msg = {
                    type: "sessionNotConnected",
                    clientId: clientId,
                    error: "Client is not connected to any session."
                  };
                this.sendUTF(JSON.stringify(msg));
            }

            break;

        case "getClients":
            clientId = message.clientId;
            conn = this;
            console.assert(conn == clientIdToConn[clientId]);
            session = clientIdToSession[clientId] ? clientIdToSession[clientId] : adminIdToSession[clientId];
            
            if (session != null)
            {
                session.getClients((clients) => {
                    var msg = {
                        type: "clients",
                        clientId: clientId,
                        sessionId: session.Id,
                        clients: clients
                    }
                    conn.sendUTF(JSON.stringify(msg));
                });
            }
            else
            {
                var msg = {
                    type: "sessionNotConnected",
                    clientId: clientId,
                    error: "Client is not connected to any session."
                  };
                  conn.sendUTF(JSON.stringify(msg));
            }
            break;
    }
}

function broadcastV2(session, question){
    session.getClients((clientsToBroadcast) => {
        for (var i = 0 ; i < clientsToBroadcast.length; i++) {
            var client = clientsToBroadcast[i];
            console.log("Broadcasting to: " + client.clientId);
            var msg = {
                type: "question",
                clientId: client.clientId,
                sessionId: session.sessionId,
                question: question,
            }

            clientIdToConn[client.clientId].sendUTF(JSON.stringify(msg));
        }
    });

    if (session.adminId != null) {
        console.log("Broadcasting to: " + session.adminId);
        var msg = {
            type: "question",
            clientId: session.adminId,
            sessionId: session.sessionId,
            question: question,
        }
        clientIdToConn[session.adminId].sendUTF(JSON.stringify(msg));
    }
}

// EXECUTE //

// INITIALIZE SERVER //
ws.on("connect", connectHandler);
server.listen(port);
console.log("QyA listening on port: " + port);