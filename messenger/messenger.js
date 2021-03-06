/* jshint esnext: true */

var Struct = require("struct"),
    net = require("net"),
    Q = require("q");

var EVENT_VERSION = 2;
const RESPONSE_TIMEOUT = 5000;

var getId = function(){
    return Math.floor(Math.random() * (1 << 16));
};

// opcodes
var BRAKE_ON = 0,
    BRAKE_OFF = 1,
    SIGNAL_R_ON = 2,
    SIGNAL_R_OFF = 3,
    SIGNAL_L_ON = 4,
    SIGNAL_L_OFF = 5,
    PING = 1000,
    PONG = 1001,
    WHO = 1002,
    SET_TAILLIGHT_OFFSET = 2000,
    SET_NETWORK_MODE = 2700,
    SET_DEFAULT_CONFIG = 3000,
    REGISTER_COMPONENT = 3100,
    REGISTER_CONFIRM = 3200,
    GENERATE_NETWORK_CREDS = 3300,
    PAUSE_TAILLIGHT = 4000,
    RESUME_TAILLIGHT = 4100,
    SET_PIXEL = 4200,
    NEXT_PRESET = 4300;

// TODO - calculate this
const HEADER_LENGTH = 12;

function logMessageHeader(header){
    // TODO - lookup opcode pretty string
    console.log(`
message header:
    versionMajor: ${header.get("versionMajor")},
    versionMinor: ${header.get("versionMinor")},
    responseId: ${header.get("responseId")},
    requestId: ${header.get("requestId")},
    opCode: ${header.get("opCode")},
    length: ${header.get("length")},
`
    );
}

function createMessageHeader(){
    return Struct()
        .word16Ule("versionMajor")
        .word16Ule("versionMinor")
        .word16Ule("responseId")
        .word16Ule("requestId")
        .word16Ule("opCode")
        .word16Ule("length")
        .allocate();
}

function createMessage(opCode, body, responseHandler){
    body = body || Buffer.alloc(0);
    var bodyLength = body.length;
    var header = createMessageHeader();

    header.set("versionMajor", EVENT_VERSION);
    header.set("versionMinor", 0);
    header.set("responseId", 0);
    header.set("opCode", opCode);
    header.set("length", bodyLength);

    return [Buffer.concat([header.buffer(), body]), responseHandler];
}

// returns a function that will create 
// a message that has no body. 
function createSimpleMessageSender(message){
    return function(){ 
        return createMessage(message);
    };
}

function createSetPixel(x, r, g, b){
    var body = Struct()
        .word16Ule("x")
        .word8Ule("r")
        .word8Ule("g")
        .word8Ule("b")
        .allocate();
    body.set("x", x);
    body.set("r", r);
    body.set("g", g);
    body.set("b", b);
    console.log(SET_PIXEL, x,r,g,b);
    return createMessage(SET_PIXEL, body.buffer());
}

function createSetNetworkMode(mode){
    var body = Struct()
        .word16Ule("mode")
        .allocate();
    body.set("mode", mode);
    return createMessage(SET_NETWORK_MODE, body.buffer());
}

function createPing(){
    return createMessage(PING, null, function(response){
        console.log("PONG!");
        logMessageHeader(response.header);
    });
}

function createWho(){
    return createMessage(WHO, null, function(response){
        console.log("Who i am:");
        logMessageHeader(response.header);
        let identity = Struct()
            .word32Ule("model")
            .word32Ule("serial")
            .word16Ule("bin")
            .word16Ule("eventVer")
            .word16Ule("dbVer")
            .allocate();
        identity._setBuff(response.body);
        console.log(`
Identity message:
    model: ${identity.get("model")}
    serial: ${identity.get("serial")}
    bin: ${identity.get("bin")}
    eventVer: ${identity.get("eventVer")}
    dbVer: ${identity.get("dbVer")}
`
        );
    });
}

function createRegisterComponent(model, serial, bin, eventVer, dbVer){
    let body = Struct()
        .word32Ule("model")
        .word32Ule("serial")
        .word16Ule("bin")
        .word16Ule("eventVer")
        .word16Ule("dbVer")
        .allocate();
    body.set("model", model);
    body.set("serial", serial);
    body.set("bin", bin);
    body.set("eventVer", eventVer);
    body.set("dbVer", dbVer);
    console.log(REGISTER_COMPONENT, model, serial, bin, eventVer, dbVer);
    return createMessage(REGISTER_COMPONENT, body.buffer(), function(response){
        logMessageHeader(response.header);
        let creds = Struct()
            .chars("ssid", 16)
            .chars("pass", 16)
            .allocate();
        creds._setBuff(response.body);
        console.log(`
creds message:
    ssid: ${creds.get("ssid")}
    pass: ${creds.get("pass")}
`);
    });
}

let messageMetadata = [
    {
        message: "signalron",
        name: "Signal Right On",
        fields: [],
        handler: createSimpleMessageSender(SIGNAL_R_ON) 
    },{
        message: "signalroff",
        name: "Signal Right Off",
        fields: [],
        handler: createSimpleMessageSender(SIGNAL_R_OFF)
    },{
        message: "signallon",
        name: "Signal Left On",
        fields: [],
        handler: createSimpleMessageSender(SIGNAL_L_ON)
    },{
        message: "signalloff",
        name: "Signal Left Off",
        fields: [],
        handler: createSimpleMessageSender(SIGNAL_L_OFF)
    },{
        message: "brakeon",
        name: "Brake On",
        fields: [],
        handler: createSimpleMessageSender(BRAKE_ON)
    },{
        message: "brakeoff",
        name: "Brake Off",
        fields: [],
        handler: createSimpleMessageSender(BRAKE_OFF)
    },{
        message: "ping",
        name: "Ping",
        fields: [],
        handler: createPing
    },{
        message: "who",
        name: "Who",
        fields: [],
        handler: createWho
    },{
        message: "setdefaultconfig",
        name: "Set Default Config",
        fields: [],
        handler: createSimpleMessageSender(SET_DEFAULT_CONFIG)
    },{
        message: "settailoffset",
        name: "Set Tail Offset",
        fields: [],
        handler: createSimpleMessageSender(SET_TAILLIGHT_OFFSET)
    },{
        message: "pausetail",
        name: "Pause Tail",
        fields: [],
        handler: createSimpleMessageSender(PAUSE_TAILLIGHT)
    },{
        message: "resumetail",
        name: "Resume Tail",
        fields: [],
        handler: createSimpleMessageSender(RESUME_TAILLIGHT)
    },{
        message: "generatenetworkcreds",
        name: "Generate Network Creds",
        fields: [],
        handler: createSimpleMessageSender(GENERATE_NETWORK_CREDS)
    },{
        message: "setpixel",
        name: "Set Pixel",
        fields: [
            {
                name: "x",
                description: "pixel to change",
                type: "int"
            },{
                name: "r",
                description: "red subpixel val, 0 - 255",
                type: "byte"
            },{
                name: "g",
                description: "green subpixel val, 0 - 255",
                type: "byte"
            },{
                name: "b",
                description: "blue subpixel val, 0 - 255",
                type: "byte"
            }
        ],
        handler: createSetPixel
    },{
        message: "setnetworkmode",
        name: "Set Network Mode",
        fields: [
            { 
                name: "mode",
                description: "should the phoxlight connect to existing network, create a network, or disable wifi",
                type: "enum",
                options: [
                    { name: "connect", value: 0 }, 
                    { name: "create", value: 1 }, 
                    { name: "off", value: 2 },
                ]
            }
        ],
        handler: createSetNetworkMode
    },{
        message: "nextpreset",
        name: "Next Preset",
        fields: [],
        handler: createSimpleMessageSender(NEXT_PRESET)
    },{
        message: "registercomponent",
        name: "Register Component",
        fields: [
            {
                name: "model",
                description: "component model",
                type: "int"
            },{
                name: "serial",
                description: "component serial",
                type: "int"
            },{
                name: "bin",
                description: "component bin version",
                type: "int"
            },{
                name: "eventVer",
                description: "component event protocol version",
                type: "int"
            },{
                name: "dbVer",
                description: "component database version",
                type: "int"
            }
        ],
        handler: createRegisterComponent
    }
];

function sendMessage(ip, port, message, ...args){
    var deferred = Q.defer();
    var metadata = messageMetadata.find(m => m.message === message);

    if(!metadata){
        deferred.reject("couldn't find message");
        return deferred.promise;
    }

    var fn = metadata.handler;
    
    if(!ip){
        deferred.reject("ip is required");
        return deferred.promise;
    }
    if(!port){
        deferred.reject("port is required");
        return deferred.promise;
    }

    if(args.length < fn.length){
        deferred.reject(`message "${message}" requires ${fn.length} args, but ${args.length} were provided`);
        return deferred.promise;
    }


    var [buffer, responseHandler] = fn(...args);
    var client = new net.Socket();
    client.connect(port, ip, function(){
        client.write(buffer, function(){
            if(responseHandler){
                let timeoutId;
                console.log("message sent, awaiting response");

                let datas = [];

                client.on("data", function(d){
                    datas.push(d);
                });

                client.on("end", function(){
                    response = parseMessage(Buffer.concat(datas));
                    responseHandler(response);
                    clearTimeout(timeoutId);
                });

                // timeout if response isnt received
                // quickly enough
                timeoutId = setTimeout(function(){
                    deferred.reject("gave up waiting for response");
                }, RESPONSE_TIMEOUT);
            } else {
                deferred.resolve();
            }
        });
    });
    client.on("error", function(e){
        deferred.reject(e);
    });

    return deferred.promise;
}

// parse a message hot off the network
function parseMessage(message){
    console.log("message get", message);

    let header = createMessageHeader();

    /*
    if(header.get("length") != message.length){
        console.log(`Response message length aint right! header: ${header.length()}, message: ${message.length}`);
        process.exit(1);
        return;
    }
    */

    header._setBuff(message);
    
    if(header.get("versionMajor") !== EVENT_VERSION){
        console.log(`Cannot parse message, expected event version ${EVENT_VERSION}, but received ${header.get("versionMajor")}`);
    }

    let bodyLength = header.get("length"),
        body = Buffer.alloc(bodyLength);
    message.copy(body, 0, HEADER_LENGTH);

    return {
        header,
        body
    };
}

let LISTEN_PORT = 6767;

module.exports = {
    sendMessage: sendMessage,
    MESSAGES: messageMetadata.map(m => {
        return {
            message: m.message,
            name: m.name,
            fields: m.fields
        };
    })
};

