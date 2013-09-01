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
			// do nothing
		};
	}
	
};

midi.input.prototype = midiPrototype;
midi.output.prototype = midiPrototype;


exports.input = midi.input;
exports.output = midi.output;

/*
 * dummy data
 */

// send random fader values for channel 1
setInterval(function() {
	midi.callback(0, [240,67,16,62,13,1,28,0,0,0,0,Math.round(Math.random()),Math.round(Math.random()*127),247]);
}, 100);

// send random meter levels
setInterval(function() {
	var message = [240,67,16,62,13,33,0,0,0],
		i;
	
	for(i=0; i<=31; i++) {
		message.push(Math.round(Math.random()*32),0);
	}
	
	message.push(247);
	
	midi.callback(0, message);
}, 50);
