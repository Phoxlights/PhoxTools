#!/usr/bin/env node
/* jshint esnext: true */

var process = require("process"),
    argv = require("minimist")(process.argv.slice(2)),
    merge = require("merge"),
    messenger = require("./messenger.js");

function getHelp(){
    return `
Send messages to a phoxlight!
    --ip        ip address of phoxlight
    --port      event server port
    --message   message to send (some message require additional args)

Available messages are:
${messenger.MESSAGES.map(m => `    ${m.message}`).join("\n")}
    `;
}


function sendMessage(args){
    if(Object.keys(args).length <= 1){
        console.log(getHelp());
        process.exit(1);
    }
    var defaults = {
        port: 6767,
        message: "ping"
    };
    var {ip, port, message} = merge({}, defaults, args);
    var additionalArgs = [];

    // TODO - use messenger.MESSAGES field value to generate
    // the required switches and junk
    switch(message){
        case "setpixel":
            if(args.x === undefined || args.r === undefined ||
              args.g === undefined || args.b === undefined){
                console.log("naw man");
                process.exit(1);
            }
            additionalArgs = [args.x, args.r, args.g, args.b];
            break;

        case "setnetworkmode":
            if(args.mode === undefined){
                console.log("naw man");
                process.exit(1);
            }
            additionalArgs = [args.mode];
            break;

        case "registercomponent":
            if(args.model === undefined || args.serial === undefined ||
              args.bin === undefined || args.eventVer === undefined ||
              args.dbVer === undefined){
                console.log("naw man");
                process.exit(1);
            }
            additionalArgs = [
                args.model, args.serial, args.bin,
                args.eventVer, args.dbVer];
            break;

        default:
            break;
    }

    messenger.sendMessage(ip, port, message, ...additionalArgs)
        .then(function(){
            console.log("sent");
            process.exit(0);
        }, function(e){
            console.log("couldnt send message:", e);
            process.exit(1);
        });
}

sendMessage(argv);
