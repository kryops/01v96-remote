var http = require('http'),
    websocket = require('ws'),

    app,

    connections = [],
    listeners = [];


function parseJson(message) {
    try {
        return JSON.parse(message);
    }
    catch(e) {
        console.log('[socket] Invalid JSON message received:', message.utf8Data);
        console.log(e);
        return undefined;
    }
}

var init = function() {

    // create web socket server
    var wsServer = new websocket.Server({
        port: app.config.webSocketPort
    });

    wsServer.on('connection', function(connection) {

        connections.push(connection);

        console.log('[socket] Client connected');


        // message handling

        connection.on('message', function(message) {
            var i = listeners.length,
                obj = parseJson(message);

            if(obj === undefined) return;

            while(i--) {
                listeners[i](obj, connection);
            }

        });

        // socket closed: remove client from connection pool

        connection.on('close', function() {
            console.log('[socket] Closed connection');

            var index = connections.indexOf(connection);

            if(index !== -1) {
                connections.splice(index,1);
            }
        });

    });

    console.log('[socket] WebSocket server started at port ' + app.config.webSocketPort);

};

var send = function(socket, message) {
    var content = message;

    if(typeof(message) !== 'string') {
        content = JSON.stringify(message);
    }

    try {
        socket.send(content);
    } catch(e) {
        // do nothing
    }
};

/**
 * Broadcast message to all connected clients
 * @param {string | object} message Objects are converted to JSON string
 */
var broadcast = function(message) {
    var i = connections.length,
        content = message;

    if(typeof(message) !== 'string') {
        content = JSON.stringify(message);
    }

    while(i--) {
        try {
            connections[i].send(content);
        } catch(e) {
            // do nothing
        }
    }
};

/**
 * Broadcast message to all clients except one
 * @param socket has to be contained in the connections array
 * @param {string | object} message Objects are converted to JSON string
 */
var broadcastToOthers = function(socket, message) {
    var i = connections.length,
        content = message;

    if(typeof(message) !== 'string') {
        content = JSON.stringify(message);
    }

    while(i--) {
        if(connections[i] !== socket) {
            try {
                connections[i].send(content);
            } catch(e) {
                // do nothing
            }
        }
    }
};

/**
 * Add WebSocket message listener
 * @param listener
 */
var addListener = function(listener) {
    listeners.push(listener);
};



module.exports = function(globalApp) {

    app = globalApp;

    app.events.on('ready', init);

    return {
        send: send,
        broadcast: broadcast,
        broadcastToOthers: broadcastToOthers,
        addListener: addListener
    };

};
