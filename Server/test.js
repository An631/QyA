function test() {
    var Session = require('./Session');
    var session = new Session("Test Session", "0.0.0.0", 1234, 100, 200);
    session.createSession(function(){
        var q1 = 'This is First question?';
        var q2 = 'This is Second question?';

        session.submitQuestion(q1, (questionKey) => {
            if (!questionKey) {
                console.log("Failed to add question " + q1);
            }
            else {
                console.log("Added question " + q1);
                session.submitQuestion(q2, (questionKey2) => {
                    if (!questionKey2) {
                        console.log("Failed to add question " + q2);
                    }
                    else {
                        console.log("Added question " + q2);
                        session.getQuestions((result) => {
                            var resultArray = result["entries"];
                            console.log("Getting all questions ...");
                            for(var i=0; i < resultArray.length; i++){
                                console.log(resultArray[i]["question"]["_"]);
                            }
                        })

                        session.submitAnswer(questionKey, "this is the answer", (success)=>{
                            if(!success){
                                console.log("Unable to ad answer");
                            }else{
                                console.log("Added answer successfully");
                            }
                        });
                    }
                });
            }
        });
    });
    //test code

    // var session  = new Session("0.0.0.0", 1234, 100, 200);

    // session.createSession(function(){
    //     console.log("in call back")
    //     console.log(session.adminPin);
    //     console.log(session.clientPin);
    // });

    // var continuedSession = Session.continueSession(98427, function(session){
    //     console.log("in call back funciton");
    //     console.log(session);
    //     console.log(session.clientPin);
    // });

    // Session.getSessionForPin(75792, "1234", function(session){
    //     console.log("in call back funciton");
    //     console.log(session);
    //     console.log(session.adminPin);
    // })

    // var continuedSession = Session.continueSession(84303, function(session){
    //     console.log("in call back funciton");
    //     console.log(session);
    //     console.log(session.adminPin);
    // });


    // var continuedSession = Session.continueSession(84303, function(session){
    //     console.log("in call back funciton");
    //     console.log(session);
    //     console.log(session.adminPin);
    // });

    console.log("done");
}

function testQuestion()
{
    var Question = require("./question");
    var azure = require('azure-storage');
    var uuid = require('uuid');

    var tableService = azure.createTableService();

    var sessionId = uuid();
    var questionId = "Q_" + uuid();
    var questionStr = "Do you know you can test question class?";
    var answerStr = "";
    var timestamp = Date.now();
    var upvotes = 0;

    var question = new Question(sessionId, questionId, questionStr, answerStr, timestamp, upvotes);
    console.log(question);
    var entity = question.toEntity();

    tableService.insertEntity('questiontest', entity, (error, result, response) => {
        if(!error) {
            console.log("Question is added.");
            tableService.retrieveEntity('questiontest', sessionId, questionId, (error, result, response) => {
                var newQuestion = Question.toQuestion(result);
                console.log(newQuestion);
            });
        }
        else {
            console.log(error);
        }
    });
}

// test();
// testQuestion();

function testActive(){
    var Session = require('./Session');
    var session  = new Session("sample_session", 1234, 100, 200);

    session.createSession(() => {
        console.log("in call back")
        console.log(session.sessionId);
        console.log(session.title);
        console.log(session.adminId);
        console.log(session.startTime);
        console.log(session.endTime);
        console.log(session.clientPin);
        console.log(session.adminPin);

        Session.attachClient(session.clientPin, 5678, (session2)=>{
            if(session2 == null){
                console.log("Attach failed");
            }
            else{
                console.log("Attached to session: " + session2.sessionId);
                console.log(session2.clientPin);

                console.log("------" + session2.adminPin);
                Session.continueSession("676767",session2.adminPin, (session3)=>{
                    if(session3 != null){
                        console.log("Session " + session3.sessionId + " has been retrieved and continued");
                        console.log(session3.adminId);
                    }
                })

                // session2.endSession((success) => {
                //     console.log("session ended");

                //     Session.attachClient(session.clientPin, 9876, (session3)=>{
                //         console.log("Attached to session: " + session2);
                //     });
                // });
            }
        })
    });
}

testActive();