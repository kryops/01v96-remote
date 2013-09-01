// connect to Raspberry Pi serial port
var SerialPort = require("serialport").SerialPort;
var serialPort = new SerialPort("/dev/ttyAMA0", {
	baudrate: 38400
});

serialPort.on('open', function() {
	
	console.log('serial port opened');
	
	var message = [];
	
	// collect parameter changes and emit to controller
	serialPort.on('data', function(data) {
		var obj = data.toJSON(),
			startPosition,
			endPosition;
		
		
		
		while(true) {
			if(!obj.length) {
				return;
			}
			
			startPosition = obj.indexOf(240);
			endPosition = obj.indexOf(247);
			
			// 240 ...
			if(startPosition == 0) {
				// 240 ... 247 ... --> send
				if(endPosition != -1) {
					message = obj.slice(0, endPosition+1);
					obj = obj.slice(endPosition+1);
					
					midi.callback(0, message);
					message = [];
				}
				// 240 ... |
				else {
					message = obj;
					return;
				}
			}
			// ... ; message already started, concatenate
			else if(message.length) {
				// ... 247 | -> send
				if(endPosition != -1) {
					message = message.concat(obj.slice(0, endPosition+1));
					obj = obj.slice(endPosition+1);
					
					midi.callback(0, message);
					message = [];
				}
				// ... |
				else {
					message = message.concat(obj);
					return;
				}
			}
			// ... 240; skip unknown message part
			else if(startPosition > 0) {
				obj = obj.slice(startPosition+1);
			}
			// ... ; message not started, skip
			else {
				return;
			}
			
		}
		
	});
	
});

// emulate midi plugin with dummy
var midiPrototype = {
	
	openPort: function(port) {},
	
	getPortCount: function() {
		return 1;
	},
	
	getPortName: function(port) {
		return "Yamaha 01V96";
	},
	
	ignoreTypes: function() {},
	
	closePort: function() {}
	
};

var midi = {
	
	callback: function(deltaTime, message) {},
	
	input: function() {
		this.on = function(type, callback) {
			midi.callback = callback;
		};
	},
	
	output: function() {
		this.sendMessage = function(message) {
			serialPort.write(message);
		};
	}
	
};

midi.input.prototype = midiPrototype;
midi.output.prototype = midiPrototype;


exports.input = midi.input;
exports.output = midi.output;