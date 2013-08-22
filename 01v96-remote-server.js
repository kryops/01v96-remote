var http = require('http'),
	WebSocketServer = require('websocket').server,
	static = require('node-static'),
	
	// MIDI interface to the mixer
	mixer = require('./01v96-midi.js');


var config = {
	staticPort: 1337,
	webSocketPort: 1338
};

// global WebSocket connection pool
var connections = [];


// create empty http server for socket handling
var wsHTTPServer = http.createServer(function(request, response) {
    
});
wsHTTPServer.listen(config.webSocketPort);


// create web socket server
var wsServer = new WebSocketServer({
    httpServer: wsHTTPServer
});

wsServer.on('request', function(request) {
	
	// add client to connection pool
	var connection = request.accept(null, request.origin),
		index = connections.push(connection) - 1; // TODO re-use closed connection entries
	
	console.log('client connected: ' + connection.remoteAddress);
	
	// redirect client messages to the mixer controller
	connection.on('message', function(message) {
		//console.log('socket message: ' + message.utf8Data);
		mixer.controller.clientMessageHandler(JSON.parse(message.utf8Data));
	});
	
	// socket closed: remove client from connection pool
	connection.on('close', function(conn) {
		console.log('closed connection: ' + connection.remoteAddress);
		connections[index] = false;
	});
	
});


// create static file server for serving the client application
var fileServer = new static.Server('./client', { cache: 0 });

http.createServer(function (request, response) {
	request.addListener('end', function () {
		fileServer.serve(request, response);
	}).resume();
}).listen(config.staticPort);


console.log('\n\n=== 01v96 Remote server by Michael Strobel ===\n\nRunning on port ' + config.staticPort + '\n\n');


// start mixer controller with socket broadcast callback function
mixer.controller.start(function(message) {
	var i,
		content = JSON.stringify(message);
	
	for(i in connections) {
		if(connections[i]) {
			connections[i].sendUTF(content);
		}
	}
});
