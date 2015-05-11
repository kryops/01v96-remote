# 01v96 Remote

by Michael Strobel

This application is a MIDI bridge to the Yamaha 01v96 mixing console to remote-control it over a network-based connection via WebSocket.

It is based on a node.js server and includes a web client that can be used on both mouse- and touch-based devices.

So far it has implemented

-	controlling faders for channels, aux send, master (aux and bus outputs) and stereo out
-	controlling on-buttons for channels, master and stereo out
-	Showing the meter levels of all channels
-   Configuring channel names and pairs/groups


![01v96 Remote](http://kryops.de/files/github/01v96remote.png)



## License

MIT



## Installation


### Installation on a Raspberry Pi

The application can be deployed to a Raspberry Pi micro computer.
-	kryops orignal version was configured to receive MIDI signals through its GPIO ports.
-	**This altered version allows the Raspberry Pi to receive MIDI signals over USB**, using the default USB drivers with Raspbian.

The documentation for the installation on a Raspberry Pi can be found in the file *raspberry/documentation.md*


## Usage

### 01v96 MIDI over UISB configuration with Raspberry Pi

-	Press the **DIO/SETUP** button and go to the **MIDI/HOST** tab
-	In the *GENERAL* area, Set both *Rx PORT* and *Tx PORT* to *USB* - *1*
-	Press the **MIDI** button and go to the **SETUP** tab
-	Set both the *Tx* and *Rx CHANNEL* to *1*
-	Set *Tx* and *Rx* in the *PARAMETER CHANGE* row to *ON*, all other options to *OFF*
-	Set *Fader Resolution* to *LOW*


### NodeJS server

Start the server from the command line:

	node server.js

With an optional parameter, the connection type to the mixer can be chosen:

-   **midi** *(default)* uses the standard MIDI protocol
-   **serialport** connects through the serial port on */dev/ttyAMA0* (for use with a Raspberry Pi)
-   **piUSB** connect through USB on the Raspberry Pi
-   **dummy** allows to test the application without a real mixer present. It simulates changing fader levels and a moving fader


### Web client

The web client can be accessed at port 1337. You have to use a browser that supports WebSockets. Look up browser support at [http://caniuse.com/websockets](http://caniuse.com/websockets).


## Development

### WebSocket protocol

The WebSocket service can be reached on port 1338

#### Messages sent by the server

**Fader value**

Channel groups: Message is sent for every channel

    {
        "type": "fader",
         "target": "channel" / "sum" / "auxsend" / "aux" / "bus",
         "num": < channel/aux/bus number, 0 for sum >,
         "num2": < aux number (if target is "auxsend") >
         "value": < fader value, 0-255 >
    }

**On-buttons**

Channel groups: Message is sent for every channel

    {
        "type": "on",
         "target": "channel" / "sum" / "aux" / "bus",
         "num": < channel/aux/bus number, 0 for sum >,
         "value": < true for on, false for off >
    }

**Channel meter levels**

Sent every 200ms

    {
        "type": "level",
         "levels": {
            < channel number, 1-32 >: < channel level, 0-32 >,
            // ...
         }
    }

**Complete status synchronization**

    {
        "type": "sync",
        "status": {
            "on": {
                "channel< channel number>": < boolean value >,
                "aux< aux number>": < boolean value >,
                "bus< aux number>": < boolean value >,
                "sum0": < boolean value >,
                // ...
            },
            "fader": {
                "channel< channel number>": < value 0-255 >,
                "auxsend< aux number >< channel number>": < value 0-255 >,
                "aux< aux number>": < value 0-255 >,
                "bus< aux number>": < value 0-255 >,
                "sum0": < value 0-255 >,
                // ...
            }
        }
    }

**Configuration**

    {
        "type": "config",
        "config": {
            "names": {
                "channel< channel number>": < name >,
                "aux< aux number>": < name >,
                "bus< aux number>": < name >,
                // ...
            },
            "groups": [
                [ < channel numbers in a group > ],
                // ...
            ]
        }
    }

#### Messages sent by the clients

**Request synchronization**

    {
        "type": "sync"
    }

**Request configuration**

    {
        "type": "config"
    }

**Save configuration**

Triggers a broadcast of the new configuration to all other connected clients

    {
        "type": "config_save",
        "config": {
            "names": {
                "channel< channel number>": < name >,
                "aux< aux number>": < name >,
                "bus< aux number>": < name >,
                // ...
            },
            "groups": [
                [ < channel numbers in a group > ],
                // ...
            ]
        }
    }

**Fader value**

Triggers a broadcast of the new value to all other connected clients

Channel groups: Has to be send only for one channel. Broadcast to other clients contains all channels in the group

    {
        "type": "fader",
         "target": "channel" / "sum" / "auxsend" / "aux" / "bus",
         "num": < channel/aux/bus number, 0 for sum >,
         "num2": < aux number (if target is "auxsend") >
         "value": < fader value, 0-255 >
    }


**On-button**

Triggers a broadcast of the new value to all other connected clients

Channel groups: Has to be send only for one channel. Broadcast to other clients contains all channels in the group

    {
        "type": "on",
         "target": "channel" / "sum" / "aux" / "bus",
         "num": < channel/aux/bus number, 0 for sum >,
         "value": < true for on, false for off >
    }


## Additional notes

### Third party software

-	jQuery -  http://jquery.com/
-	FastClick - https://github.com/ftlabs/fastclick
-	Font Awesome icons - http://fortawesome.github.io/Font-Awesome/
