/**
 * 01V96 Remote
 * @author Michael Strobel, michael@kryops.de
 */
var remoteApp = {
	
	/*
	 * PROPERTIES
	 */
	
	/**
	 * application-wide configuration
	 */
	config: {
		// WebSocket server location
		socketHost: window.location.hostname,
		socketPort: 1338,
		
		// maximal CSS top value for .fader-handle elements
		maxHandlePercent: 85,
		
		// maximal value for fader messages
		maxFaderValue: 255,
		
		// height difference #content-.fader for computation fallback [e.g. CSS calc(100% - 210px)] 
		faderHeightDifference: 210,

        // minimum distance to send fader change value
		faderMoveMinValueDistance: 5,
		
		// maximal value for level display
		maxLevelValue: 32,
		
		/**
		 * configuration for initial tabs and controls
		 *
		 * tab-id: {
		 *	label: tab-label
		 *	fader: [
		 *		[target, number, big label, number2]
		 *	]
		 * }
		 * targets: channel, sum, aux, bus
		 */
		controls: {
			ch116: {
				label: "CH 1-16",
				faders: [
					["channel", 1, "1"],
					["channel", 2, "2"],
					["channel", 3, "3"],
					["channel", 4, "4"],
					["channel", 5, "5"],
					["channel", 6, "6"],
					["channel", 7, "7"],
					["channel", 8, "8"],
					["channel", 9, "9"],
					["channel", 10, "10"],
					["channel", 11, "11"],
					["channel", 12, "12"],
					["channel", 13, "13"],
					["channel", 14, "14"],
					["channel", 15, "15"],
					["channel", 16, "16"],
					["sum", 0, "S"]
				]
			},
			
			ch1732: {
				label: "CH 17-32",
				faders: [
					["channel", 17, "17"],
					["channel", 18, "18"],
					["channel", 19, "19"],
					["channel", 20, "20"],
					["channel", 21, "21"],
					["channel", 22, "22"],
					["channel", 23, "23"],
					["channel", 24, "24"],
					["channel", 25, "25"],
					["channel", 26, "26"],
					["channel", 27, "27"],
					["channel", 28, "28"],
					["channel", 29, "29"],
					["channel", 30, "30"],
					["channel", 31, "31"],
					["channel", 32, "32"],
					["sum", 0, "S"]
				]
			},
			
			aux1: {
				label: "AUX 1",
				faders: [
					["auxsend", 1, "1", 1],
					["auxsend", 2, "2", 1],
					["auxsend", 3, "3", 1],
					["auxsend", 4, "4", 1],
					["auxsend", 5, "5", 1],
					["auxsend", 6, "6", 1],
					["auxsend", 7, "7", 1],
					["auxsend", 8, "8", 1],
					["auxsend", 9, "9", 1],
					["auxsend", 10, "10", 1],
					["auxsend", 11, "11", 1],
					["auxsend", 12, "12", 1],
					["auxsend", 13, "13", 1],
					["auxsend", 14, "14", 1],
					["auxsend", 15, "15", 1],
					["auxsend", 16, "16", 1],
					["sum", 0, "S"]
				]
			},
			
			aux2: {
				label: "AUX 2",
				faders: [
					["auxsend", 1, "1", 2],
					["auxsend", 2, "2", 2],
					["auxsend", 3, "3", 2],
					["auxsend", 4, "4", 2],
					["auxsend", 5, "5", 2],
					["auxsend", 6, "6", 2],
					["auxsend", 7, "7", 2],
					["auxsend", 8, "8", 2],
					["auxsend", 9, "9", 2],
					["auxsend", 10, "10", 2],
					["auxsend", 11, "11", 2],
					["auxsend", 12, "12", 2],
					["auxsend", 13, "13", 2],
					["auxsend", 14, "14", 2],
					["auxsend", 15, "15", 2],
					["auxsend", 16, "16", 2],
					["sum", 0, "S"]
				]
			},
			
			master: {
				label: "MASTER",
				faders: [
					["aux", 1, "A1"],
					["aux", 2, "A2"],
					["aux", 3, "A3"],
					["aux", 4, "A4"],
					["aux", 5, "A5"],
					["aux", 6, "A6"],
					["aux", 7, "A7"],
					["aux", 8, "A8"],
					["bus", 1, "B1"],
					["bus", 2, "B2"],
					["bus", 3, "B3"],
					["bus", 4, "B4"],
					["bus", 5, "B5"],
					["bus", 6, "B6"],
					["bus", 7, "B7"],
					["bus", 8, "B8"],
					["sum", 0, "S"]
				]
			}
		}
	},
	
	/**
	 * current application status
	 */
	status: {
		/*
		 * control status; control-id = target+num2+num
		 * control-id: value
		 */
		
		// current status of the on-buttons
		on: {},
		
		// current fader values
		fader: {},
		
		// current channel levels
		level: {},
		
		
		// id of the currently active tab
		activeTab: false,
		
		// current height of a fader; used for value computation when dragging handle
		faderHeight: 0,
		
		// currently moved faders [id: true]; disabled automatic repositioning on value change
		movedFaders: {},
		
		// initial waiting for document.ready and socket initialization
		pendingOperations: 2
	},
	
	/**
	 * WebSocket connection to the server
	 * @property {WebSocket}
	 */
	connection: false,
	
	
	/*
	 * METHODS
	 */
	
	
	/**
	 * debug helper methods; not used inside the application
	 */
	debug: {
		/**
		 * benchmarks a function with the high precision API
		 * @param {function} func
		 */
		benchmark: function(func) {
			window.performance = window.performance || {};
			performance.now = (function() {
			  return performance.now       ||
					 performance.mozNow    ||
					 performance.msNow     ||
					 performance.oNow      ||
					 performance.webkitNow ||
					 function() { return new Date().getTime(); };
			})();
			
			var time = window.performance.now();
			func();
			console.log((window.performance.now()-time) + 'ms');
		},
		
		/**
		 * calls the socket message handler automatically with random values
		 * @param {int} ms interval of the calls in milliseconds; default 10
		 */
		localDemo: function(ms) {
			
			ms = ms || 10;
			
			window.setInterval(function() {
				remoteApp.messageHandler({
					type:"level",
					target:"channel",
					num:Math.round(Math.random()*32),
					value:Math.round(Math.random()*127)
				});
				remoteApp.messageHandler({
					type:"level",
					target:"aux",
					num:Math.round(Math.random()*8),
					value:Math.round(Math.random()*127)
				});
				remoteApp.messageHandler({
					type:"level",
					target:"bus",
					num:Math.round(Math.random()*8),
					value:Math.round(Math.random()*127)
				});
				remoteApp.messageHandler({
					type:"fader",
					target:"channel",
					num:Math.round(Math.random()*32),
					value:Math.round(Math.random()*127)
				});
			}, ms);
		}
	},
	
	/**
	 * initializes the application
	 */
	init: function() {
		var app = this;
		
		app.openSocketConnection();
		
		// generate content and bind event handlers when page is loaded
		$(document).ready(function() {
			app.bindGlobalEventHandlers();
			app.generatePage();
			app.refreshFaderHeight();
			
			app.start();
		});
	},
	
	/**
	 * counts down the pendingOperations status and syncs with the mixer
	 * when the entire application is loaded
	 */
	start: function() {
		
		// start after socket init and document.ready
		this.status.pendingOperations--;
		
		if(this.status.pendingOperations) {
			return;
		}
		
		// sync with mixer
		$('#loading-dialog-text').html('Syncing with the mixing console...');
		
		this.sendMessage({
			type: "sync"
		});
	},
	
	/**
	 * opens the WebSocket and binds message and error handlers
	 */
	openSocketConnection: function() {
		var app = this;
		
		window.WebSocket = window.WebSocket || window.MozWebSocket;
		
		if(!window.WebSocket) {
			$(document).ready(function() {
				app.displayError('Your browser does not support WebSockets!<br />Please use a modern browser like Mozilla Firefox or Google Chrome.');
			});
			
			return;
		}
		
		app.connection = new WebSocket('ws://' + app.config.socketHost + ':' + app.config.socketPort);
		
		app.connection.onopen = function () {
			app.start();
		};
		
		app.connection.onerror = function(error) {
			console.log('WebSocket error', error);
			app.displayError('A WebSocket error occured!', true);
		};
		
		app.connection.onclose = function() {
			app.displayError('The connection to the server has been lost!', true);
		};
		
		app.connection.onmessage = function(message) {
			app.messageHandler(JSON.parse(message.data));
		};
	},
	
	/**
	 * generates the navigation tabs and controls
	 * can be run again when the configuration changes
	 */
	generatePage: function() {
		var app = this,
			generateControl = function(tab, target, num, bigLabel, num2) {
				var id = target + (num2 || '') + num;
				
				// set intial status values
				if(typeof app.status.on[id] == 'undefined') {
					app.status.fader[id] = app.config.maxFaderValue;
					
					if(target != 'auxsend') {
						app.status.on[id] = true;
						app.status.level[id] = 0;
					}
				}
				
				// generate HTML
				return '<div class="control" data-id="' + id + '" data-target="' + target + '" data-number="' + num + '" data-number2="' + (num2 || '') + '">\
					<div class="on-button">\
						ON\
					</div>\
					\
					<div class="fader">\
						<div class="fader-bar">\
							<div class="fader-background"></div>\
							<div class="fader-level" style="height:100%"></div>\
						</div>\
						\
						<div class="fader-handle' + (target == 'sum' ? ' fader-handle-sum' : '') + '"></div>\
					</div>\
					\
					<div class="fader-biglabel">' +
						bigLabel +
					'</div>\
					\
					<!--\
					<div class="fader-label">\
						Label\
					</div>\
					\
					<div class="fader-settings">\
						<i class="icon-cog"></i>\
					</div>\
					-->\
				</div>';
			},
			generateTab = function(id, label, title, active) {
				if(active) {
					app.status.activeTab = id;
				}
				
				return '<li data-tab="' + id + '"' + (title ? ' title="' + title + '"' : '') + ' class="autogenerated' + (active ? ' active' : '') + '">' + label + '</li>';
			},
			
			naviHtml = [],
			contentHtml = [],
			
			tabid, i, tab, fader, tabIsActive,
			
			activeTabSelected = !!app.status.activeTab,
			firstTab = true;
		
		// remove perviously auto-generated elements if method is called multiple times
		$('.autogenerated').remove();
		
		for(tabid in app.config.controls) {
            if(app.config.controls.hasOwnProperty(tabid)) {
                tab = app.config.controls[tabid];
                tabIsActive = activeTabSelected ? (app.status.activeTab === tabid) : firstTab;

                naviHtml.push(generateTab(tabid, tab.label, tab.title, tabIsActive));

                contentHtml.push('<div class="tabcontent autogenerated" data-tab="' + tabid + '"' + (tabIsActive ? ' style="display:block"' : '') + '>');

                for(i in tab.faders) {
                    fader = tab.faders[i];
                    contentHtml.push(generateControl(tabid, fader[0], fader[1], fader[2], fader[3]));
                }

                contentHtml.push('</div>');

                firstTab = false;
            }
		}
		
		$('#navi').prepend(naviHtml.join('')).removeClass('hidden');
		$('#content').append(contentHtml.join(''));
		
		// update controls in the currently active tab
		// to display the right values when the method has been called again
		app.updateTabControls();
		
		app.bindDynamicEventHandlers();
	},
	
	/**
	 * binds event handlers for
	 * 	fader dragging
	 *	on-buttons
	 *	tab navigation
	 *	fader height computation on window resize
	 */
	bindGlobalEventHandlers: function() {
		var app = this,
			$content = $('#content'),
			$navi = $('#navi');


        // add mouse fader events only when pointer events are unavailable

        if(!window.navigator.msPointerEnabled && !window.PointerEvent) {

            // fader mouse events
            $content.on('mousedown', '.fader', function(e) {
                app.eventAbstraction.faderStart(
                    $(this).parents('.control'),
                    e.pageY
                );
            });

            $content.on('mousemove', function(e) {
                var fader = false,
                    i;

                for(i in app.status.movedFaders) {
                    if(app.status.movedFaders.hasOwnProperty(i) && app.status.movedFaders[i]) {
                        fader = i;
                        break;
                    }
                }

                if(!fader) {
                    return;
                }

                app.eventAbstraction.faderMove(
                    $content.find('.control[data-id="' + fader + '"]'),
                    e.pageY
                );
            });

            $(document).on('mouseup', function() {
                app.status.movedFaders = {};
            });

        }

		// on-buttons
		$content.on('click', '.on-button', function() {
			app.eventAbstraction.onButton(
				$(this).parents('.control')
			);
		});
		
		// tab navigation
		$navi.on('click', 'li', function() {
			var $this = $(this);
			
			if($this.data('tab')) {
				app.switchTab($this.data('tab'), $this);
			}
			// fullscreen navigation item
			else if($this.attr('id') == 'toggle-fullscreen') {
				app.toggleFullScreen();
			}
		});
		
		// re-compute fader height on window resize
		$(window).on('resize', function() {
			app.refreshFaderHeight();
		});
	},
	
	/**
	 * bind touch event handlers for dynamically generated controls
	 * - faders
	 * - on-buttons
	 */
	bindDynamicEventHandlers: function() {
		var app = this;
		
		// move faders

		[].forEach.call(document.querySelectorAll('.fader'), function(el) {
			var $control = $(el).parents('.control');

            // standard touch events
            if(!window.navigator.msPointerEnabled && !window.PointerEvent) {

                el.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    app.eventAbstraction.faderStart($control, e.targetTouches[0].pageY);
                }, false);

                el.addEventListener('touchmove', function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    app.eventAbstraction.faderMove($control, e.targetTouches[0].pageY);
                }, false);

                el.addEventListener('touchend', function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    app.status.movedFaders[$control.data('id')] = false;
                }, false);

            }
            // MSIE pointer events
            else {
                var pointerdown = function(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        // capture pointer on the element it started to ensure
                        // that the pointer
                        e.target.setPointerCapture(e.pointerId);

                        app.eventAbstraction.faderStart($control, e.clientY);
                    },
                    pointermove = function(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        app.eventAbstraction.faderMove($control, e.clientY);
                    },
                    pointerup = function(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        app.status.movedFaders[$control.data('id')] = false;
                    };

                if(window.PointerEvent) {
                    el.addEventListener('pointerdown', pointerdown, false);
                    el.addEventListener('pointermove', pointermove, false);
                    el.addEventListener('pointerup', pointerup, false);
                }
                else {
                    el.addEventListener('MSPointerDown', pointerdown, false);
                    el.addEventListener('MSPointerMove', pointermove, false);
                    el.addEventListener('MSPointerUp', pointerup, false);
                }

            }

		});
	},
	
	eventAbstraction: {
		
		/**
		 * touchstart/mousedown/MSPointerDown on fader
		 * @param $control {jQuery} .control object
		 * @param position {int} y touch/mouse position
		 */
		faderStart: function($control, position) {
			var app = remoteApp;
			
			app.status.movedFaders[$control.data('id')] = true;
			$control.data('originalPosition', $control.find('.fader-handle').position().top);
			$control.data('touchPosition', position);
		},
		
		/**
		 * touchmove/mousemove/MSPointerMove on fader
		 * @param $control {jQuery} .control object
		 * @param position {int} y touch/mouse position
		 */
		faderMove: function($control, position) {
			var app = remoteApp,
				$handle = $control.find('.fader-handle'),
				id = $control.data('id');
			
			// compute and apply position
			var newPositionPx = $control.data('originalPosition')+position - $control.data('touchPosition'),
				newPositionPercent = newPositionPx/app.status.faderHeight * 100,
				newValue;
			
			if(newPositionPercent < 0) {
				newPositionPercent = 0;
			}
			else if(newPositionPercent > app.config.maxHandlePercent) {
				newPositionPercent = app.config.maxHandlePercent;
			}
			
			$handle.css('top', newPositionPercent + '%');
			
			// compute and send new value
			newValue = Math.round(
				(1 - newPositionPercent/app.config.maxHandlePercent) * app.config.maxFaderValue
			);
			
			// send only changed values
			if(Math.abs(newValue-app.status.fader[id]) < app.config.faderMoveMinValueDistance) {
				return;
			}
			
			app.status.fader[id] = newValue;
			
			app.sendControlMessage(
				'fader',
				$control.data('target'),
				$control.data('number'),
				newValue,
				$control.data('number2')
			);
		},
		
		/**
		 * touch/click on-button
		 * @param $control {jQuery} .control object
		 */
		onButton: function($control) {
			var app = remoteApp,
				id = $control.data('id'),
				target = $control.data('target'),
				newValue = !app.status.on[id];
			
			// override aux sends: toggle channel on-status
			if(target == 'auxsend') {
				id = 'channel' + $control.data('number');
				target = 'channel';
				newValue = !app.status.on[id];
			}
			
			app.status.on[id] = newValue;
			
			if(newValue) {
				$control.removeClass('control-disabled');
			}
			else {
				$control.addClass('control-disabled');
			}
			
			app.sendControlMessage(
				'on',
				target,
				$control.data('number'),
				newValue
			);
		}
		
	},
	
	/**
	 * refreshes the height of faders when window resizes
	 * used for value computation after dragging
	 */
	refreshFaderHeight: function() {
		var app = this,
			$firstFader = $('.fader:visible').first();
		
		if($firstFader.length) {
			app.status.faderHeight = $firstFader.height();
		}
		else {
			// fallback when no faders are visible: compute with container height
			app.status.faderHeight = $('#content').height()-app.config.faderHeightDifference;
		}
	},
	
	/**
	 * switches to the tab with the given id
	 * @param {String} id
	 * @param {jQuery} $this optional jQuery object of the selected tab
	 */
	switchTab: function(id, $this) {
		var app = this,
			$navi = $('#navi'),
			$tab = $this || $navi.find('li[data-tab="' + id + '"]'),
			id = $tab.data('tab');
			
		app.updateTabControls(id);
		
		$('.tabcontent[data-tab="' + app.status.activeTab + '"]').hide();
		$navi.find('[data-tab="' + app.status.activeTab + '"]').removeClass('active');
		
		$('.tabcontent[data-tab="' + id + '"]').show();
		$tab.addClass('active');
		
		app.status.activeTab = id;
	},
	
	/**
	 * handles socket messages, updates application status and control displays
	 * @param {object} message
	 *		properties: type (on, fader, level), target (channel, sum, aux, bus, auxsend), num, num2, value
	 */
	messageHandler: function(message) {
		var app = this,
			id = message.target ? message.target+(message.num2 || '')+message.num : false,
			controlIsVisible = false,
			
			controls, i, updateType;
		
		// update all levels with one message
		if(message.type === 'level') {
			for(i in message.levels) {
				app.status.level['channel'+i] = message.levels[i];
			}
			
			app.updateTabControls(false, {level: true});
		}
        // complete sync
        else if(message.type === 'sync') {
            app.status.fader = message.status.fader;
            app.status.on = message.status.on;

            app.updateTabControls(false, {fader: true, on: true});

            $('#loading-dialog').fadeOut(400);
        }
		// update fader and on-button per channel
		else if(app.status[message.type] && app.status[message.type][id] !== message.value) {
			
			// determine if control is currently visible
			if(app.config.controls[app.status.activeTab]) {
				controls = app.config.controls[app.status.activeTab].faders;
				
				for(i in controls) {
					if(controls[i][0] == message.target &&
						(!message.num || controls[i][1] == message.num) &&
						(!message.num2 || controls[i][3] == message.num2)) {
						controlIsVisible = true;
					}
					else if(controls[i][0] == 'auxsend' &&
							controls[i][1] == message.num) {
						controlIsVisible = true;
					}
				}
			}
			
			app.status[message.type][id] = message.value;
			
			if(controlIsVisible) {
				updateType = {};
				updateType[message.type] = true;
				
				app.updateControl(message.target, message.num, message.num2, updateType);
			}
		}
	},
	
	/**
	 * update all controls in the selected tab
	 * @param {String} tab tab-id, default currently active tab
	 * @param {object} update @see remoteApp.updateControl()
	 */
	updateTabControls: function(tab, update) {
		
		if(!tab) {
			tab = this.status.activeTab;
		}
		
		var app = this,
			$controls = $('.tabcontent[data-tab="' + tab + '"] .control');
		
		// refresh control status in new tab
		$controls.each(function() {
			app.updateControl($(this).data('target'), $(this).data('number'), $(this).data('number2'), update);
		});
	},
	
	/**
	 * updates a control to display its current values
	 * @param {String} target channel, sum, aux, bus
     * @param {int} num
     * @param {int} num2
	 * @param {object} update which values shall be updated (type: true); default all
	 *		types: on, fader, level
	 */
	updateControl: function(target, num, num2, update) {
		var app = this,
			id = target + (num2 || '') + num,
			oldId = id,
			$control = $('.control[data-id="' + id + '"]'),
			$onControl = $control,
			
			faderPercent, levelPercent;
		
		if(!update) {
			update = {
				on: true,
				fader: true,
				level: true
			};
		}
		
		// update on-button status
		if(update.on) {
			if(target == 'auxsend') {
				id = 'channel' + num;
			}
			
			$onControl = $control.add($('.control[data-target="auxsend"][data-number="' + num + '"]'));
			
			if(app.status.on[id]) {
				$onControl.removeClass('control-disabled');
			}
			else {
				$onControl.addClass('control-disabled');
			}
			
			id = oldId;
		}
		
		// update fader position if fader is not being moved
		if(update.fader && !app.status.movedFaders[id]) {
			faderPercent = (1 - app.status.fader[id]/app.config.maxFaderValue) * app.config.maxHandlePercent;
			$control.find('.fader-handle').css('top', faderPercent + '%');
		}
		
		// update displayed meter level
		if(update.level) {
			
			// show channel level on aux sends
			if(target == 'auxsend') {
				id = 'channel' + num;
			}
			
			levelPercent = (
				1 - Math.pow(app.status.level[id], 2) / Math.pow(app.config.maxLevelValue,2)
			) * 100;
			$control.find('.fader-level').css('height', levelPercent + '%');
		}
		
	},
	
	/**
	 * send WebSocket message to the server
	 * @param {object} obj
	 */
	sendMessage: function(obj) {
		if(typeof obj == 'object') {
			this.connection.send(JSON.stringify(obj));
		}
		else {
			console.log('invalid socket output message: ', obj);
		}
	},
	
	/**
	 * send message to the server
	 * @param {string} type on, fader, level
	 * @param {String} target channel, sum, aux, bus
	 * @param {int} num default 0
	 * @param {int} value default 0
	 * @param {int} num2 default 0 [used for aux send]
	 */
	sendControlMessage: function(type, target, num, value, num2) {
		this.sendMessage({
			type: type,
			target: target,
			num: num || 0,
			value: value || 0,
			num2: num2 || 0
		});
	},
	
	/**
	 * display error message
	 * @param {String} message
	 * @param {boolean} showRefreshButton
	 */
	displayError: function(message, showRefreshButton) {
		$('#error-dialog-text').html(message);
		
		if(showRefreshButton) {
			$('#error-dialog-reload').show();
		}
		else {
			$('#error-dialog-reload').hide();
		}
		
		$('#error-dialog').fadeIn(1000);
	}
	
};

remoteApp.init();

