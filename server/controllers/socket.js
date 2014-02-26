var http = require('http'),
    websocket = require('websocket'),

    app,

    connections = [],
    listeners = [];


var init = function() {

    // create empty http server for socket handling
    var wsHTTPServer = http.createServer(function(request, response) {});
    wsHTTPServer.listen(app.config.webSocketPort);


    // create web socket server
    var wsServer = new websocket.server({
        httpServer: wsHTTPServer
    });

    wsServer.on('request', function(request) {

        var connection = request.accept(null, request.origin);
        connections.push(connection);

        console.log('[websocket] Client connected: ' + connection.remoteAddress);


        // message handling

        connection.on('message', function(message) {
            var i = listeners.length,
                obj;

            try {
                obj = JSON.parse(message.utf8Data);
            }
            catch(e) {
                console.log('[websocket] Invalid JSON message received:', message.utf8Data);
                console.log(e);
                return;
            }

            while(i--) {
                listeners[i](obj);
            }

        });

        // socket closed: remove client from connection pool

        connection.on('close', function() {
            console.log('[websocket] Closed connection: ' + connection.remoteAddress);

            var index = connections.indexOf(connection);

            if(index !== -1) {
                connections.splice(index,1);
            }
        });

    });

    process.on('exit', function() {
        wsHTTPServer.shutDown();
    });

    console.log('[static] WebSocket server started at port ' + app.config.webSocketPort);

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
        connections[i].sendUTF(content);
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
        broadcast: broadcast,
        addListener: addListener
    };

};
