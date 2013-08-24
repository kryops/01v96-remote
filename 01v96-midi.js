var midi = require('midi');

/**
 * device-specific configuration
 */
var config = {
	
	channelCount: 32,
	auxCount: 8,
	auxSendCount: 2,
	busCount: 8,
	
	// sysEx message beginnings, general and device-specific
	sysExStart: [240,67,48,62],
	sysExStartSpecific: [240,67,16,62],
	
	// sysEx parameter change and parameter request
	parameterChange: function(arr, deviceSpecific) {
		return [240,67,16,62,(deviceSpecific ? 13 : 127),1].concat(arr, [247]);
	},
	
	parameterRequest: function(arr, deviceSpecific) {
		return [240,67,48,62,(deviceSpecific ? 13 : 127),1].concat(arr, [247]);
	},
	
	// sysEx message types (7th byte)
	sysExElements: {
		channelFader: 28,
		sumFader: 79,
		auxSendFader: 35,
		auxFader: 57,
		busFader: 43,
		
		channelOn: 26,
		sumOn: 77,
		auxOn: 54,
		busOn: 41
	},
	
	// aux send: 8th byte is used for aux determination
	auxSendParam: function(aux) {
		return 3*aux - 1;
	},
	
	// 10bit fader values are transmitted in 4 bytes
	// 00000000 00000000 00000nnn 0nnnnnnn
	fader2Data: function(value) {
		return [0, 0, value>>7, value&0x7F];
	},
	
	data2Fader: function(data) {
		return (data[2]<<7) + data[3];
	},
	
	// channel on values: last byte 1/0
	on2Data: function(on) {
		return [0, 0, 0, on ? 1 : 0];
	},
	
	data2On: function(data) {
		return !!data[3];
	},
	
	// request meter levels
	// sent every 50msec
	// request has to be sent every 10sec
	remoteMeterRequest: [
		0xF0,
		0x43,
		0x30,
		0x3E,
		0x0D,
		0x21,		// Remote Meter
		0x00,		// Address UL - up to 0x22 / 34
		0x00,		// Address LU - up to 5
		0x00,		// Address LL - up to 0x27 / 39
		0,			// Count H
		32,			// Count L
		0xF7
	],
	
	// interval for remote meter level transmission to the client
	// value*50msec
	remoteMeterInterval: 2
};

var controller = {
	
	/*
	 * MIDI objects
	 */
	input: false,
	output: false,
	
	// callback function that is set by the server
	messageCallback: function() {},
	
	// cache object for larger MIDI transmissions
	messageCache: false,
	
	// runtime counter for config.remoteMeterInterval
	meterFilterCount: 0,
	
	// interval to regularly request meter status
	meterInterval: false,
	
	/**
	 * open MIDI connections and set callback function
	 * @param messageCallback function that is called when a MIDI message has been dispatched
	 */
	start: function(messageCallback) {
		var i, portCount,
			foundPort = false;
		
		console.log('Starting 01v96 MIDI controller');
		
		// save callback function from server
		if(typeof messageCallback != 'undefined') {
			controller.messageCallback = messageCallback;
		}
		
		// open MIDI input
		controller.input = new midi.input();
		
		portCount = controller.input.getPortCount();
		
		controller.input.on('message', controller.midiMessageHandler);
		
		for(i = 0; i <= portCount; i++) {
			if(controller.input.getPortName(i).indexOf('Yamaha 01V96') != -1) {
				controller.input.openPort(i);
				foundPort = true;
				console.log('MIDI input port ' + i);
				break;
			}
		}
		
		if(!foundPort) {
			console.log('ERROR: No 01v96 device found!');
			return;
		}
		
		// enable Sysex, timing and active sensing
		controller.input.ignoreTypes(false, false, false);
		
		// open MIDI output
		controller.output = new midi.output();
		
		portCount = controller.output.getPortCount();
		foundPort = false;
		
		for(i = 0; i <= portCount; i++) {
			if(controller.output.getPortName(i).indexOf('Yamaha 01V96') != -1) {
				controller.output.openPort(i);
				console.log('MIDI output port ' + i);
				foundPort = true;
				break;
			}
		}
		
		if(!foundPort) {
			console.log('ERROR: No 01v96 device found! (output)');
			return;
		}
		
		// periodical remote meter request
		controller.meterInterval = setInterval(controller.sendRemoteMeterRequest, 10000);
		controller.sendRemoteMeterRequest();
	},
	
	/**
	 * close MIDI connection
	 */
	stop: function() {
		controller.input.closePort();
		controller.output.closePort();
		clearInterval(controller.meterInterval);
	},
	
	/**
	 * dispatch MIDI messages and execute server callback
	 */
	midiMessageHandler: function(deltaTime, message) {
		var outMessage = false,
			i,
			
			messageBeginsWith = function(search) {
				var length = search.length,
					i;
				
				if(message.length < search.length) {
					return false;
				}
				
				for(i = 0; i < length; i++) {
					if(message[i] !== search[i]) {
						return false;
					}
				}
				
				return true;
			};
		
		// concatenate messages that are longer than the 1024 byte limit
		if(message[0] == 240 && message.length == 1024) {
			controller.messageCache = message;
			return;
		}
		else if(controller.messageCache && message[message.length-1] == 247) {
			message = controller.messageCache.concat(message);
			controller.messageCache = false;
		}
		else if(controller.messageCache && message.length == 1024) {
			controller.messageCache.concat(message);
			return;
		}
		else {
			controller.messageCache = false;
		}
		
		// analyze message
		
		// sysEx message
		if(messageBeginsWith(config.sysExStartSpecific) || messageBeginsWith(config.sysExStart)) {
			
			// program change -> sync again
			if(message[5] == 16) {
				controller.sendSyncRequest();
				return;
			}
			// remote meter - levels
			else if(message[5] == 33) {
				
				// echo messages from meter requests are accidentally
				// recognized as meter messages
				if(message.length < 71) {
					return;
				}
				
				// do not forward every meter level message
				controller.meterFilterCount++;
				
				if(controller.meterFilterCount == config.remoteMeterInterval) {
					controller.meterFilterCount = 0;
				}
				
				if(controller.meterFilterCount != 0) {
					return;
				}
				
				outMessage = {
					type: "level",
					levels : {}
				};
				
				for(i = 0; i <= 31; i++) {
					outMessage.levels[i+1] = message[(9 + 2*i)];
				}
			}
			// fader or on-button messages
			else {
				
				switch(message[6]) {
					
					case config.sysExElements.channelFader:
						outMessage = {
							type: "fader",
							target: "channel",
							num: message[8]+1,
							value: config.data2Fader(message.slice(9))
						};
						break;
					
					case config.sysExElements.sumFader:
						outMessage = {
							type: "fader",
							target: "sum",
							num: 0,
							value: config.data2Fader(message.slice(9))
						};
						break;
					
					case config.sysExElements.auxSendFader:
						outMessage = {
							type: "fader",
							target: "auxsend",
							num: message[8]+1,
							num2: (message[7]+1)/3,
							value: config.data2Fader(message.slice(9))
						};
						break;
					
					case config.sysExElements.auxFader:
						outMessage = {
							type: "fader",
							target: "aux",
							num: message[8]+1,
							value: config.data2Fader(message.slice(9))
						};
						break;
					
					case config.sysExElements.busFader:
						outMessage = {
							type: "fader",
							target: "bus",
							num: message[8]+1,
							value: config.data2Fader(message.slice(9))
						};
						break;
					
					case config.sysExElements.channelOn:
						outMessage = {
							type: "on",
							target: "channel",
							num: message[8]+1,
							value: config.data2On(message.slice(9))
						};
						break;
					
					case config.sysExElements.sumOn:
						outMessage = {
							type: "on",
							target: "sum",
							num: 0,
							value: config.data2On(message.slice(9))
						};
						break;
					
					case config.sysExElements.auxOn:
						outMessage = {
							type: "on",
							target: "aux",
							num: message[8]+1,
							value: config.data2On(message.slice(9))
						};
						break;
					
					case config.sysExElements.busOn:
						outMessage = {
							type: "on",
							target: "bus",
							num: message[8]+1,
							value: config.data2On(message.slice(9))
						};
						break;
					
				}
			}
		}
		
		
		if(outMessage) {
			controller.messageCallback(outMessage);
		}
		// log unknown messages
		else {
			console.log('unknown message: [' + message + ']');
		}
	},
	
	/**
	 * dispatch client messages and send the corresponding midi commands
	 * @param {object} message
	 * 		{
	 *			type: fader / on,
	 *			target: channel / aux / bus / sum
	 *			num: {int}
	 *			num2: {int} aux number for target auxsend
	 *	 		value: {int} / {bool}
	 *		}
	 */
	clientMessageHandler: function(message) {
		
		switch(message.type) {
			
			// control faders
			case "fader":
				
				switch(message.target) {
					case "channel":
						controller.setChannelFader(message.num, message.value);
						break;
					
					case "auxsend":
						controller.setAuxSendFader(message.num2, message.num, message.value);
						break;
						
					case "aux":
						controller.setAuxFader(message.num, message.value);
						break;
					
					case "bus":
						controller.setBusFader(message.num, message.value);
						break;
					
					case "sum":
						controller.setSumFader(message.value);
						break;
				}
				
				break;
			
			// control On-buttons
			case "on":
				
				switch(message.target) {
					case "channel":
					case "auxsend":
						controller.setChannelOn(message.num, message.value);
						break;
						
					case "aux":
						controller.setAuxOn(message.num, message.value);
						break;
					
					case "bus":
						controller.setBusOn(message.num, message.value);
						break;
					
					case "sum":
						controller.setSumOn(message.value);
						break;
				}
				
				break;
			
			case "sync":
				controller.sendSyncRequest();
				break;
		}
	},
	
	
	/*
	 * message send functions
	 */
	
	setChannelFader: function(channel, value) {
		if(channel < 1 || channel > config.channelCount) {
			console.log('invalid channel number ' + channel);
			return;
		}
		
		controller.output.sendMessage(
			config.parameterChange(
				[config.sysExElements.channelFader,0,channel-1].concat(config.fader2Data(value))
			)
		);
	},
	
	setChannelOn: function(channel, on) {
		if(channel < 1 || channel > config.channelCount) {
			console.log('invalid channel number ' + channel);
			return;
		}
		
		controller.output.sendMessage(
			config.parameterChange(
				[config.sysExElements.channelOn,0,channel-1].concat(config.on2Data(on))
			)
		);
	},
	
	setSumFader: function(value) {
		controller.output.sendMessage(
			config.parameterChange(
				[config.sysExElements.sumFader,0,0].concat(config.fader2Data(value))
			)
		);
	},
	
	setSumOn: function(on) {
		controller.output.sendMessage(
			config.parameterChange(
				[config.sysExElements.sumOn,0,0].concat(config.on2Data(on))
			)
		);
	},
	
	setAuxSendFader: function(aux, channel, value) {
		if(aux < 1 || aux > config.auxSendCount) {
			console.log('invalid aux send number ' + aux);
			return;
		}
		
		if(channel < 1 || channel > config.channelCount) {
			console.log('invalid aux send channel number ' + channel);
			return;
		}
		
		controller.output.sendMessage(
			config.parameterChange(
				[config.sysExElements.auxSendFader,config.auxSendParam(aux),channel-1].concat(config.fader2Data(value))
			)
		);
	},
	
	setAuxFader: function(aux, value) {
		if(aux < 1 || aux > config.auxCount) {
			console.log('invalid aux number ' + aux);
			return;
		}
		
		controller.output.sendMessage(
			config.parameterChange(
				[config.sysExElements.auxFader,0,aux-1].concat(config.fader2Data(value))
			)
		);
	},
	
	setAuxOn: function(aux, on) {
		if(aux < 1 || aux > config.auxCount) {
			console.log('invalid aux number ' + aux);
			return;
		}
		
		controller.output.sendMessage(
			config.parameterChange(
				[config.sysExElements.auxOn,0,aux-1].concat(config.on2Data(on))
			)
		);
	},
	
	setBusFader: function(bus, value) {
		if(bus < 1 || bus > config.busCount) {
			console.log('invalid bus number ' + bus);
			return;
		}
		
		controller.output.sendMessage(
			config.parameterChange(
				[config.sysExElements.busFader,0,bus-1].concat(config.fader2Data(value))
			)
		);
	},
	
	setBusOn: function(bus, on) {
		if(bus < 1 || bus > config.busCount) {
			console.log('invalid bus number ' + bus);
			return;
		}
		
		controller.output.sendMessage(
			config.parameterChange(
				[config.sysExElements.busOn,0,bus-1].concat(config.on2Data(on))
			)
		);
	},
	
	/*
	 * Parameter requests
	 */
	
	sendRemoteMeterRequest: function() {
		controller.output.sendMessage(config.remoteMeterRequest);
	},
	
	sendSyncRequest: function() {
		var i, j, limit, auxSendParam;
		
		for(i in config.sysExElements) {
			
			// aux sends are handled later
			if(i.indexOf('auxSend') === 0) {
				continue;
			}
			
			if(i.indexOf('channel') === 0) {
				limit = config.channelCount;
			}
			else if(i.indexOf('aux') === 0) {
				limit = config.auxCount;
			}
			else if(i.indexOf('bus') === 0) {
				limit = config.busCount;
			}
			else {
				limit = 1;
			}
			
			for(j = 0; j < limit; j++) {
				controller.output.sendMessage(
					config.parameterRequest(
						[config.sysExElements[i],0,j]
					)
				);
			}
		}
		
		// aux send: requests for all channels for all aux
		for(i = 1; i <= config.auxSendCount; i++) {
			auxSendParam = config.auxSendParam(i);
			
			for(j = 0; j < config.channelCount; j++) {
				controller.output.sendMessage(
					config.parameterRequest(
						[config.sysExElements.auxSendFader,auxSendParam,j]
					)
				);
			}
		}
		
	}
	
};

exports.controller = controller;
