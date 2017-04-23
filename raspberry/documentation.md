# Setup on Raspberry Pi

**wARNING: This documentation was created for the Raspberry (1) Model B using NodeJS v0.10.24. It has not been tested with the newer models or the newer NodeJS version that is now required. Please proceed with caution!**

There are 2 options to connect the 01v96 to the Raspberry Pi:

*   Connect via USB
*   Receive the MIDI signal through its serial port input on the GPIOs.

The application is run by forever which ensures that the Node.JS server is restarted after an exception occurs.

**Configuration and software installation can be automated by executing the setup.sh script:**

Choose the appropriate setup script for your connection type:

*   setup-usb.sh
*   setup-serialport.sh

Download and run it with the following commands:

    wget https://raw.github.com/kryops/01v96-remote/master/raspberry/setup-usb.sh
    sudo chmod +x setup.sh
    sudo ./setup.sh


## Serial port connection

### Hardware

Follow the instructions on http://siliconstuff.blogspot.de/2012/08/serial-port-midi-on-raspberry-pi.html

(PDF version included in the repository)

### Configuration

Remove the following content from */boot/cmdline.txt*:

    console=ttyAMA0,115200 kgdboc=ttyAMA0,115200

Then add the following to the same file:

    bcm2708.uart_clock=3000000

The */boot/cmdline.txt* should look **similar** to this:

    dwc_otg.lpmenable=0 bcm2708.uart_clock=3000000 console=tty1 root=/dev/mmcblk0p6 rootfstype=ext4 elevator=deadline rootwait

Add the following to */boot/config.txt*:

    init_uart_clock=2441406
    init_uart_baud=38400

Comment out the last line in */etc/inittab* with #:

    #T0:23:respawn:/sbin/getty -L ttyAMA0 115200 vt100

Add the user pi to the dialout group:

    usermod -a -G dialout pi


## Software

### Prerequisites

-   You have installed **Raspbian** on your Raspberry Pi

### Installation of required software

Install software dependencies:

    sudo apt-get update
    sudo apt-get -y upgrade
    sudo apt-get -y install git python build-essential libasound2-dev

Install the Node.JS server:

    sudo mkdir /opt/node
    wget http://nodejs.org/dist/v6.10.2/node-v6.10.2-linux-armv6l.tar.gz
    tar xvzf node-v6.10.2-linux-armv6l.tar.gz
    sudo cp -r node-v6.10.2-linux-armv6l/* /opt/node
    rm -f -r node-v6.10.2-linux-armv6l
    sudo ln -s /opt/node/bin/node /usr/bin/node
    sudo ln -s /opt/node/bin/npm /usr/bin/npm
    sudo ln -s /opt/node/lib /usr/lib/node

Install forever:

    sudo /opt/node/bin/npm install -g forever


### Project setup

    cd /home/pi
    git clone https://github.com/kryops/01v96-remote.git
    cd 01v96-remote
    npm install

### init script

Create the file */etc/init.d/forever-01v96-remote* with the following content.

Depending on your connection type change **PARAMS=midi** to **PARAMS=serialport**


    #!/bin/bash

    ### BEGIN INIT INFO
    # Provides: Forever 01v96-remote
    # Required-Start: $remote_fs $syslog
    # Required-Stop: $remote_fs $syslog
    # Default-Start: 2 3 4 5
    # Default-Stop: 0 1 6
    # Short-Description: Forever 01v96-remote Autostart
    # Description: Forever 01v96-remote Autostart
    ### END INIT INFO

    NAME="Forever NodeJS"
    EXE=/opt/node/bin/forever
    SCRIPT=/home/pi/01v96-remote/server.js
    PARAMS=midi
    USER=pi
    OUT=/var/log/01v96-remote/forever.log

    if [ "$(whoami)" != "root" ]; then
        echo "This script must be run with root privileges!"
        echo "Try sudo $0"
        exit 1
    fi

    case "$1" in

    start)
        echo "starting $NAME: $SCRIPT $PARAMS"
        sudo -u $USER $EXE start -a -l $OUT $SCRIPT $PARAMS
        ;;

    stop)
        echo "stopping $NAME"
        sudo -u $USER $EXE stop $SCRIPT
        ;;

    restart)
        $0 stop
        $0 start
        ;;

    *)
        echo "usage: $0 (start|stop|restart)"
    esac

    exit 0

Activate it:

    chmod 755 /etc/init.d/forever-01v96-remote
    update-rc.d forever-01v96-remote defaults


To finish the installation, reboot your Raspberry Pi.


## Usage, Maintenance

Starting and stopping the application:

    /etc/init.d/forever-01v96-remote start
    /etc/init.d/forever-01v96-remote stop
    /etc/init.d/forever-01v96-remote restart

The application log is written to */var/log/01v96-remote/forever.log*
