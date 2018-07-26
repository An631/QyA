var azure = require('azure-storage');
var uuid = require('uuid');
var Client = require('./client');
var Question = require('./question');
var tableService = azure.createTableService();

class Session {
    constructor(title, adminId, startTime, endTime){
        this.title = title;
        this.startTime = startTime;
        this.endTime = endTime;
        this.adminId = adminId;
        this.sessionId = "S_" + uuid();
    }

    createSession(fn){
        this.setAdminPin = false;
        this.setClientPin = false;
        this.setPin('adminPin', fn);
        this.setPin('clientPin', fn);
    }

    setPin(pinType, fn){
        tableService.createTableIfNotExists('pins', (error, result, response) => {
            if (error) {
                console.log(error);
            }else{
                console.log("created pins table");
                var pin = Math.floor((Math.random() * 100000) + 1);
                tableService.retrieveEntity('pins', pin.toString(), "pin", (error, result, response) => {
                    if (!error) {
                        //pin already exists
                        this.setPin();
                    }else{
                        console.log("pin is unique");
                        var entGen = azure.TableUtilities.entityGenerator;
                        var entity = null;
                        if(pinType === "adminPin"){
                            entity = {
                                PartitionKey: entGen.String(pin.toString()),
                                RowKey: entGen.String('pin'),
                                sessionId: entGen.String(this.sessionId),
                                type: entGen.String(pinType)
                            };
                            this.adminPin = pin;
                            this.setAdminPin = true;
                            console.log("adminPin is set: " + this.adminPin);
                            if(this.setClientPin){
                                this.addSession(fn);
                            }

                        }else{
                            entity = {
                                PartitionKey: entGen.String(pin.toString()),
                                RowKey: entGen.String('pin'),
                                sessionId: entGen.String(this.sessionId),
                                type: entGen.String(pinType)
                            };
                            this.clientPin = pin;
                            this.setClientPin = true;
                            console.log("clientPin is set: " + this.clientPin);
                            if(this.setAdminPin){
                                this.addSession(fn);
                            }
                        }

                        tableService.insertEntity('pins', entity, (error, result, response) => {
                            if (error) {
                                console.log(error);
                                return null;
                            }
                        });
                    }
                });
            }
        });
    }

    addSession(fn) {
        //create new session entry in storage
        //set adminPIN, ClientPIN, sessionID, startTime, EndTime and name
        tableService.createTableIfNotExists('sessions', function(error, result, response) {
            if (error) {
            console.log(error);
            return;
            }
        });

        var entGen = azure.TableUtilities.entityGenerator;
        var task = {
            PartitionKey: entGen.String(this.sessionId),
            title: entGen.String(this.title),
            RowKey: entGen.String("admin"),
            adminPin: entGen.String(this.adminPin.toString()),
            clientPin: entGen.String(this.clientPin.toString()),
            adminId: entGen.String(this.adminId),
            startTime: entGen.String(this.startTime),
            endTime: entGen.String(this.endTime),
            active: entGen.String("true"),       
        };

        tableService.insertEntity('sessions', task, function(error, result, response) {
            if (error) {
                console.log(error);
                return null;
            }
            console.log("inserted session in to table storage");
            fn();
        });
    }

    endSession(fn){
        // Mark session as inactive in storage
        var entGen = azure.TableUtilities.entityGenerator;
        var updatedTask = {
            PartitionKey: entGen.String(this.sessionId),
            RowKey: entGen.String("admin"),
            title: entGen.String(this.title),
            adminPin: entGen.String(this.adminPin.toString()),
            clientPin: entGen.String(this.clientPin.toString()),
            adminId: entGen.String(this.adminId),
            startTime: entGen.String(this.startTime),
            endTime: entGen.String(this.endTime),
            active: entGen.String("false"),   
        };
        
        tableService.replaceEntity('sessions', updatedTask, function(error, result, response) {
            if (!error) {
                console.log("session has been marked inactive");
                fn(true);
            }
            fn(false);
        });
    }

    submitAnswer(questionId, answer, fn){
        //retrieve question entity
        tableService.retrieveEntity('sessions', this.sessionId, questionId, (error, result, response) => {
            if(error){
                console.log(error);
                fn(false);
            }else{
                var entGen = azure.TableUtilities.entityGenerator;
                var questionEntity = {
                    PartitionKey: entGen.String(this.sessionId),
                    RowKey: entGen.String(questionId),
                    question: entGen.String(result["question"]["_"]),
                    answer: entGen.String(answer)
                }

                //add answer to question Entity
                tableService.insertOrReplaceEntity('sessions', questionEntity, (error, result, response) => {
                    if (error) {
                        console.log(error);
                        fn(false);
                    }else{
                        fn(true);
                    }
                });
            }
        });   
    }

    submitQuestion(question, cb){
        // add question to session in storage
        var questionEntity = question.toEntity();
        tableService.insertEntity('sessions', questionEntity, function(error, result, response) {
            if (error) {
                console.log(error);
                cb(false); //failed to add question
            }
            console.log("Inserted question in to table.");
            cb(true);
        });
    }

    upvoteQuestion(question, cb) {
        //retrieve question entity
        tableService.retrieveEntity('sessions', this.sessionId, question.questionId.toString(), (error, result, response) => {
            if (error) {
                console.log(error);
                cb(false);
            }
            else {
                var question = Question.toQuestion(result);
                question.upvotes += 1;
                var questionEntity = question.toEntity();
                //add answer to question Entity
                tableService.insertOrReplaceEntity('sessions', questionEntity, (error, result, response) => {
                    if (error) {
                        console.log(error);
                        cb(false, question);
                    }
                    else {
                        console.log("Upvoted question " + question.questionId);
                        cb(true, question);
                    }
                });
            }
        });
    }

    getQuestions(cb)
    {
        var entGen = azure.TableUtilities.entityGenerator;
        var query = new azure.TableQuery()
            .where('PartitionKey == ? and RowKey > ? and RowKey < ?', this.sessionId, 'Q_', 'Q`');
        tableService.queryEntities('sessions', query, null, (error, result, response) => {
            if (error) {
                console.log(error);
                cb(null);
                return null;
            }
            else {
                var resultArray = result["entries"];
                console.log("Getting all questions ... ");
                var questions = [];

                for (var i = 0; i < resultArray.length; i++) {
                    var question = Question.toQuestion(resultArray[i]);
                    console.log("Found question " + question.questionId + " " + question.questionStr);
                    questions.push(question);
                }

                cb(questions);
            }
        });
    }

    getClients(cb)
    {
        var entGen = azure.TableUtilities.entityGenerator;
        var query = new azure.TableQuery()
            .where('PartitionKey == ? and RowKey > ? and RowKey < ?', this.sessionId, 'C_', 'C`');
        tableService.queryEntities('sessions', query, null, (error, result, response) => {
            if (error) {
                console.log(error);
                cb(null);
                return null;
            }
            else {
                var resultArray = result["entries"];
                console.log("Getting all clients ... ");
                var clients = [];

                for (var i = 0; i < resultArray.length; i++) {
                    var client = Client.toClient(resultArray[i]);
                    console.log("Found client " + client.clientId);
                    clients.push(client);
                }

                cb(clients);
            }
        });
    }

    detachClient(clientId, cb) {
        var client = new Client(this.sessionId, clientId, null);
        var clientEntity = client.toEntity();
        tableService.deleteEntity("sessions", clientEntity, (error, result, response) => {
            if (error) {
                // client doesn't exist
                console.log(error);
                return false;
            }
            else {
                console.log("Successfully detached client " + clientId + " from session " + this.sessionId);
                return true;
            }
        });
    }

    static attachClient(clientPin, clientId, fn){
        Session.getSessionForPin(clientPin, (session)=>{
            if(session.active){
                console.log("retrieved session " + session.sessionId + " is active");

                var entGen = azure.TableUtilities.entityGenerator;
                var task = {
                    PartitionKey: entGen.String(session.sessionId),
                    RowKey: entGen.String(clientId.toString())      
                };

                tableService.insertOrMergeEntity('sessions', task, function(error, result, response) {
                    if (error) {
                        console.log(error);
                        return null;
                    }
                    console.log("Added client to session " + session.sessionId);
                    fn(session);
                });
            }else{
                console.log("Session " + session.sessionId + " is not active");
                fn(null);
            }
        });
    }

    static continueSession(adminId, adminPin, fn){
        Session.getSessionForPin(adminPin, (session) => {
            if(session.active){
                console.log("retrieved session " + session.sessionId + " is active");
                
                var entGen = azure.TableUtilities.entityGenerator;
                var task = {
                    PartitionKey: entGen.String(session.sessionId),
                    RowKey: entGen.String('admin'),
                    adminId: entGen.String(adminId.toString())
                };

                tableService.insertOrMergeEntity('sessions', task, function(error, result, response) {
                    if (error) {
                        console.warn(error);
                        return null;
                    }
                    session.adminId = adminId;
                    console.log("Updated session with new admin Id " + session.adminId);
                    fn(session);
                });
            }else{
                console.log("Session " + session.sessionId + " is not active");
                fn(null);
            }
        });
    }

    static getSessionForPin(pin, fn){
        tableService.retrieveEntity('pins', pin.toString(), 'pin', (error, result, response) => {
            if (error) {
                // pin doesn't exist
                console.log(error);
                return null;
            }
            
            var sessionId  = result["sessionId"]["_"];
            console.log("Retrieved sessionId for pin " + pin + ": "  + sessionId);

            console.log("Retrieving session ...");
            Session.retrieveEntity(sessionId, fn);
        });
    }

    static retrieveEntity(sessionId, fn){
        tableService.retrieveEntity('sessions', sessionId, 'admin', (error, result, response) => {
            if(error){
                // session doesn't exist
                console.warn(error);
                return null;
            }
            var title = result["title"]["_"];
            var adminId = result["adminId"]["_"];
            var startTime = result["startTime"]["_"];
            var endTime = result["endTime"]["_"];
            var adminPin = result["adminPin"]["_"];
            var clientPin = result["clientPin"]["_"];
            var active = result["active"]["_"];
            var session = new Session(title, adminId, startTime, endTime);
            session.adminPin = adminPin;
            session.clientPin = clientPin;
            session.sessionId = sessionId;
            session.active = active;
            fn(session);
        }); 
    }
}

module.exports = Session;

