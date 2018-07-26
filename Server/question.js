var azure = require('azure-storage');
var uuid = require('uuid');

class Question {
    constructor(sessionId, name, questionStr) {
        this.sessionId = sessionId;
        this.questionId = "Q_" + uuid();
        this.name = name;
        this.questionStr = questionStr;
        this.answerStr = "";
        this.timestamp = Date.now();
        this.upvotes = 0;
    }

    setAnswer(answerStr)
    {
        this.answerStr = answerStr;
    }

    incrementUpvotes()
    {
        this.upvotes++;
    }

    toEntity()
    {
        var entGen = azure.TableUtilities.entityGenerator;
        var questionEntity = {
            PartitionKey: entGen.String(this.sessionId),
            RowKey: entGen.String(this.questionId),
            name: entGen.String(this.name),
            questionStr: entGen.String(this.questionStr),
            answerStr: entGen.String(this.answerStr),
            timestamp: entGen.String(this.timestamp),
            upvotes: entGen.String(this.upvotes)
        };

        return questionEntity;
    }

    static toQuestion(result) {
        var question = new Question(result.PartitionKey["_"],
            result["name"]["_"],
            result["questionStr"]["_"]
        );

        question.questionId = result.RowKey["_"];
        question.answerStr = result["answerStr"]["_"];
        question.timestamp = result["timestamp"]["_"];
        question.upvotes = result["upvotes"]["_"];

        return question;
    }
}

module.exports = Question;