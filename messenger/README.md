Phoxlight Messenger
-----------------
Send messages to and receive messages from Phoxlights. 

Works with Phoxlight event version 2. Not sure how I will set up the backwards compat, or ever. Anyway, this tool is still growing.

Usage
--------------
Heres an example:

    ./cliMessenger.js --ip <device ip> --port 6767 --message ping

Port is defaulted for you, so don't bother to include it. In fact, message defaults to "ping", so to poke a light and make sure its listening, try:

    ./cliMessenger.js --ip <device ip>

You can get a phoxlight's IP via mdns. The v6 and v7 phoxlights advertise themselves as "phoxlight", so resolving mdns on linux is something like:

    avahi-resolve -n phoxlight.local

which yields the IP address for use with the messenger commands.

Some commands take arguments:

    # the taillight must be paused to update pixels
    # because im a terrible human
    ./cliMessenger.js --ip <device ip> --message pausetail
    # now update pixel 1 with rgb value 255,0,0
    ./cliMessenger.js --ip <device ip> --message setpixel -r 255 -g 0 -b 0 -x 1

You can get a list of commands by running `cliMessenger` without any args. Also here's a list:

```
    signalron
    signalroff
    signallon
    signalloff
    brakeon
    brakeoff
    ping
    setdefaultconfig
    settailoffset
    setbuttonpin
    settailpin
    setstatuspin
    setbrakepin
    pausetail
    resumetail
    setpixel
    setnetworkmode
    nextpreset
```
