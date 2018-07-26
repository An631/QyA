var azure = require('azure-storage');

class Client {
    constructor(sessionId, clientId) {
        this.sessionId = sessionId;
        this.clientId = clientId;
    }

    toEntity()
    {
        var entGen = azure.TableUtilities.entityGenerator;
        var clientEntity = {
            PartitionKey: entGen.String(this.sessionId),
            RowKey: entGen.String(this.clientId),
        };

        return clientEntity;
    }

    static toClient(result) {
        return new Client(result.PartitionKey["_"],
            result.RowKey["_"],
        );
    }
}

module.exports = Client;