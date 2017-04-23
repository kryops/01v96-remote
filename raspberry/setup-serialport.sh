#!/bin/bash

# root check

if [ "$(whoami)" != "root" ]; then
    echo "This script must be run with root privileges!"
    echo "Try sudo $0"
    exit 1
fi


# MIDI serial port configuration
# source: http://siliconstuff.blogspot.de/2012/08/serial-port-midi-on-raspberry-pi.html

sed 's/console=ttyAMA0,115200 kgdboc=ttyAMA0,115200 /bcm2708.uart_clock=3000000 /'  /boot/cmdline.txt > /home/pi/cmdline.txt
cat /home/pi/cmdline.txt > /boot/cmdline.txt
rm /home/pi/cmdline.txt

sed 's/T0:23:respawn:\/sbin\/getty -L ttyAMA0/#T0:23:respawn:\/sbin\/getty -L ttyAMA0/' /etc/inittab > /home/pi/inittab
cat /home/pi/inittab > /etc/inittab
rm /home/pi/inittab

echo '
# change uart clock to 2441406 for midi 31250 baud rate
init_uart_clock=2441406
init_uart_baud=38400
' >> /boot/config.txt

usermod -a -G dialout pi

# create directories

cd /home/pi
mkdir /var/log/01v96-remote
chown pi /var/log/01v96-remote

# System update and dependency installation

apt-get update
apt-get -y upgrade
apt-get -y install git python build-essential libasound2-dev


# NodeJS setup

mkdir /opt/node
wget http://nodejs.org/dist/v6.10.2/node-v6.10.2-linux-armv6l.tar.gz
tar xvzf node-v6.10.2-linux-armv6l.tar.gz
cp -r node-v6.10.2-linux-armv6l/* /opt/node
rm -f -r node-v6.10.2-linux-armv6l
rm node-v6.10.2-linux-armv6l.tar.gz

# Create symlinks for PATH and root access
ln -s /opt/node/bin/node /usr/bin/node
ln -s /opt/node/bin/npm /usr/bin/npm
ln -s /opt/node/lib /usr/lib/node

# Forever setup
/usr/bin/npm install -g forever

# Project setup
cd /home/pi
sudo -u pi git clone https://github.com/kryops/01v96-remote.git
cd 01v96-remote
sudo -u pi /usr/bin/npm install



cd /home/pi

echo '#!/bin/bash

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
PARAMS=serialport
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
' > /etc/init.d/forever-01v96-remote

chmod 755 /etc/init.d/forever-01v96-remote
update-rc.d forever-01v96-remote defaults


# finished

echo "Installation complete. Please reboot your device."
