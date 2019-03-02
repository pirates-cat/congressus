/*
    Copyright 2019 Cédric Levieux, Parti Pirate

    This file is part of Congressus.

    Congressus is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Congressus is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Congressus.  If not, see <http://www.gnu.org/licenses/>.
*/

/* global $ */
/* global PAD_WS */
/* global stringDiff */

$(function() {
    $("*[data-pad=enabled]").each(function() {
        var lastPadEventTime = 0;
        var area = null;
        var padTimer = null;
        var socket = null;
        var internalText = null;

        var sendPadEvent = function(event) {
            socket.send(JSON.stringify(event));
        };

        var attach = function() {
            var padId = area.data("pad-id");
            var senderId = area.data("pad-sender");
            
            var event = {padId: padId, senderId: senderId, nickname: $(".nickname-link").data("nickname"), event: "attach"};
            
            sendPadEvent(event);
            
            event = {padId: padId, senderId: senderId, event: "synchronize", content: area.html()};
            
            internalText = area.html();
            sendPadEvent(event);
        }
    
        var updatePad = function(event) {
            area.html(event.content);
            area.caret('pos', event.caretPosition);
            internalText = event.content;
        };
    
        var openSocket = function() {
            socket = new WebSocket(PAD_WS);
            socket.onopen = function(e) {
//                console.log("Connection established!");

                attach();                
            };

            socket.onmessage = function(e) {
                var data = JSON.parse(e.data);
//                console.log(data);

                var nicknameHolder = $(".nickname-holder[data-pad-id="+data.padId+"]");
                var position = area.offset();
                nicknameHolder.css({top: Math.round(position.top - 50) +"px", left: Math.round(position.top + 50) +"px"});
                
                switch(data.event) {
                    case "connected":
//                        console.log("Rid " + data.rid);
                        break;
                    case "synchronize":
                        var senderId = area.data("pad-sender");
                        var event = {event: "synchronizer", rid: data.rid, padId : data.padId, senderId: senderId, content: area.html()};
                        sendPadEvent(event)
                        break;
                    case "synchronizer":
                        area.html(data.content);
                        internalText = data.content;
                        break;
                    case "keyup":
                        updatePad(data);
                        break;
                    case "nicknames":
                        nicknameHolder.text("");
                        for(var index = 0; index < data.nicknames.length; ++index) {
                            if (index) {
                                nicknameHolder.text(nicknameHolder.text() + ", ");
                            }
                            nicknameHolder.text(nicknameHolder.text() + data.nicknames[index]);
                        }
                        break;
                }

                autogrowElement(area.get(0));
//                area.trigger("autogrow");
            };

            socket.onclose = function(e) {
                console.log("perte de la connexion !");
            }
        }

        var addNicknameHolder = function() {
            var padId = area.data("pad-id");
            var position = area.offset();
            
            var nicknameHolder = $(".nickname-holder[data-pad-id="+padId+"]");
            if (nicknameHolder.length == 0) {
                nicknameHolder = "<div class='nickname-holder' data-pad-id='"+padId+"' style='float: left; position: absolute; top: "+ Math.round(position.top - 50) +"px; left: "+ Math.round(position.top + 50) +"px; z-index: 1000; opacity: 0.5;'></div>"

                // Not satisfying
//                $("body").append(nicknameHolder);
            }
        }

        var enablePad = function(eventArea) {
            area = eventArea;

            addNicknameHolder();
            
            var padId = area.data("pad-id");
            var senderId = area.data("pad-sender");
//            var caretPositionsBefore = {};

            openSocket();

//            console.log("Enable pad " + padId);
/*
            area.keydown(function(event) {
                caretPositionsBefore[event.key] = area.caret("pos");
                console.log("Keydown " + event.key + " => " + caretPositionsBefore[event.key]);
            });
            
            area.keypress(function(event) {
                console.log("Keypress " + event.key + " => " + caretPositionsBefore[event.key]);
            });
*/
            area.keyup(function(event) {
//                console.log("Keyup " + event.key + " => " + caretPositionsBefore[event.key] + ", " +area.caret("pos"));
                
//                var myCaretPosition = event.target.selectionStart;
                var keyCode = event.keyCode;
                var key = event.key;

                if (   !event.keyCode || event.keyCode == 16 || event.keyCode == 17 || event.keyCode == 18 || event.keyCode == 225) {
                    // Do nothing;
                    return;
                }

                if (    event.keyCode == 33 || event.keyCode == 34 || event.keyCode == 35 || event.keyCode == 36 ||
                        event.keyCode == 37 || event.keyCode == 38 || event.keyCode == 39 || event.keyCode == 40) {

                    var caretPosition = area.caret("pos");
                    var padEvent = {event: "newCaretPosition", padId: padId, senderId: senderId, caretPosition: caretPosition};

                    sendPadEvent(padEvent);

                    return;
                }

                if (event.keyCode == 13) {
                    event.stopImmediatePropagation();
                    event.preventDefault();
                } 

                if (    event.keyCode == 46) {

                    var numberOfDeletedCharacters = internalText.length;
                    internalText = area.html();
                    numberOfDeletedCharacters -= internalText.length;

                    var caretPositionAfter = area.caret("pos");

                    var padEvent = {event: "keyup", padId: padId, senderId: senderId, /*caretPositionBefore: caretPositionsBefore[event.key], */caretPositionAfter: caretPositionAfter, keyCode: keyCode, key: key, /*content: area.html(), */numberOfDeletedCharacters: numberOfDeletedCharacters};

                    console.log(padEvent);

                    sendPadEvent(padEvent);

                    return;
                }



//                var diff = stringDiff(internalText, area.html());

                internalText = area.html();

                var caretPositionAfter = area.caret("pos");

                var padEvent = {event: "keyup", padId: padId, senderId: senderId, /*caretPositionBefore: caretPositionsBefore[event.key], */caretPositionAfter: caretPositionAfter, keyCode: keyCode, key: key/*, *//*diff: diff, *//*content: area.html()*/};

//                console.log(padEvent);

                sendPadEvent(padEvent);
            });
            
            area.click(function(event) {
                var caretPosition = area.caret("pos");
                var padEvent = {event: "newCaretPosition", padId: padId, senderId: senderId, caretPosition: caretPosition};

                sendPadEvent(padEvent);
            });
        }

        enablePad($(this));
    });
});