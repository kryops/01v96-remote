# 01v96 Remote

by Michael Strobel

This application is a MIDI bridge to the Yamaha 01v96 mixing console to remote-control it over a network-based connection via WebSocket.

It is based on a node.js server and includes a web client that can be used on both mouse- and touch-based devices.

So far it has implemented

-	controlling faders for channels, aux send, master (aux and bus outputs) and stereo out
-	controlling on-buttons for channels, master and stereo out
-	Showing the meter levels of all channels


## License

MIT

## Installation

### node.js server

The node.js server can be obtained at [http://nodejs.org/](http://nodejs.org/)

The following additional modules have to be installed through npm:

-	midi
-	websocket
-	node-static
-   serialport (for usage with Raspberry Pi)

To install them, run the following command in the command line:

	npm install

**Note for Windows users**

In order to compile the required modules, your system needs to support the python programming language and C++.

-	For pyhton support, install the latest application (from the 2.x branch!) from [http://www.python.org/download/](http://www.python.org/download/)
-	For C++ support, install the Microsoft Visual Studio express from [http://www.microsoft.com/visualstudio/eng/downloads#d-express-windows-desktop](http://www.microsoft.com/visualstudio/eng/downloads#d-express-windows-desktop) or a similar software

**Note for Linux users**

If your system is ALSA based, you need to have the *libasound2-dev* package installed in order to compile the midi module.



### 01v96 MIDI configuration

-	Press the **DIO/SETUP** button and go to the **MIDI/HOST** tab
-	In the *GENERAL* area set both *Rx PORT* and *Tx PORT* must to *1*
-	Set the port type to *USB* or *MIDI* depending on how your 01v96 is connected to your server device
-	Press the **MIDI** button and go to the **SETUP** tab
-	Set both the *Tx* and *Rx CHANNEL* to *1*
-	Set *Tx* and *Rx* in the *PARAMETER CHANGE* row to *ON*, all other options to *OFF*
-	If you plan to use multiple remote controls simultanely, set the *ECHO* option in the *PARAMETER CHANGE* row to *ON*
-	Set *Fader Resolution* to *LOW*


## Usage

Start the server from the command line:

	node server.js


From Windows you can start it with the *01v96-remote-server.bat* file.

The program can only be started when the 01v96 is connected and configured correctly. MIDI error messages are shown in the command line output.

The web client can be accessed at port 1337. You have to use a browser that supports WebSockets. Look up browser support at [http://caniuse.com/websockets](http://caniuse.com/websockets).


## Third party software

01v96 Remote uses the following libraries and extensions:

-	jQuery -  http://jquery.com/
-	FastClick - https://github.com/ftlabs/fastclick
-	Font Awesome icons - http://fortawesome.github.io/Font-Awesome/
