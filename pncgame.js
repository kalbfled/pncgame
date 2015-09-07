/*
(CC BY-NC-SA 4.0) David J. Kalbfleisch 2015
https://creativecommons.org/licenses/by-nc-sa/4.0/
https://github.com/kalbfled/pncgame
Please read LICENSE, on Github, for more information.

This code implements the PointAndClickGame object prototype and helper objects.
TODO - ECMAScript6 modularity and class syntactic sugar when they become well supported
*/

function PointAndClickEvent(description, prerequisites, consequences, shape, coords) {
    /*
    Object prototype for a point-and-click game event.  An event should occur when the player
    clicks on certain hotspots within the game window.  The "shape" and "coords" parameters
    mirror the attributes of the HTML "area" element.

    http://www.w3schools.com/tags/tag_area.asp

    PointAndClickEvent objects have "prerequisites" and "consequences,"  both of which
    are implemented as arrays of lambda functions that test or alter game conditions.

    Don't use the names "Event" or "event" to avoid a collision with HTML reserved words.
    http://www.w3schools.com/js/js_reserved.asp
    
    TODO - Events can occur without user input.
    */
    this.isAvailable = function() {
        /* Return True if all prerequisites are met.  Otherwise, return False. */
        for (var i=0; i < this.prerequisites.length; i++) {
            if (!this.prerequisites[i]()) {
                return false;
            }
        }
        return true;
    };

    var that = this;
    this.execute = function() {
        /*
        Make the event "occur" by calling all of the consequence functions.  Note that this
        method does not check if the event is available.  That should be done by calling the
        isAvailable method before attaching a PointAndClickEvent to an HTML event to an
        associated HTML "area" element.  See PointAndClickGame.update.

        When called from a listener, "this" refers to the associated HTML object, but this method
        needs to access the owning PointAndClickEvent object's attributes.  Using "that" (above)
        instead of "this" solves this problem.
        */
        for (var i=0; i < that.consequences.length; i++) {
            that.consequences[i]();
        }
    };

    this.fromXMLNode = function(event_node, game) {
        /*
        Populate the object according to an "Event" node parsed from an XML file.  This method
        uses nested lambda functions to form closures.
            http://www.w3schools.com/js/js_function_closures.asp
        
        game - a PointAndClickGame object; used in lambda functions to manipulate the game
        */
        this.shape = event_node.getAttribute("shape");
        if (event_node.getAttribute("coords")) {
            this.coords = event_node.getAttribute("coords");
        }

        // Extract relevant child node information.  This is more complicated because many
        // browsers, including Firefox and Chrome, treat line breaks in the XML as text nodes.
        for (var i=0; i < event_node.childNodes.length; i++) {
            var event_child = event_node.childNodes.item(i);
            switch (event_child.nodeName) {
                case "Description":
                    this.description = event_child.childNodes[0].nodeValue;
                    break;
                case "Prerequisite":
                    switch (event_child.getAttribute("type")) {
                        case "noitem":
                            var item_id = Number(event_child.getAttribute("itemid"));
                            var item_location = Number(event_child.childNodes[0].nodeValue);
                            if (item_location == 0) {
                                // The player must not have a specific item
                                this.prerequisites.push((function() {
                                    var item_id_closure = item_id;
                                    return function() {
                                        return (typeof(game.player_inventory[item_id_closure]) === "undefined");
                                    };
                                })());
                            } else {
                                // The location must not have a specific item
                                this.prerequisites.push((function() {
                                    var item_location_closure = item_location;
                                    var item_id_closure = item_id;
                                    return function() {
                                        return (typeof(game.locations[item_location_closure].items[item_id_closure]) === "undefined");
                                    };
                                })());
                            }
                            break;
                        case "item":
                            var item_id = Number(event_child.getAttribute("itemid"));
                            var item_location = Number(event_child.childNodes[0].nodeValue);
                            if (item_location == 0) {
                                // The player must have a specific item
                                this.prerequisites.push((function() {
                                    var item_id_closure = item_id;
                                    return function() {
                                        return (typeof(game.player_inventory[item_id_closure]) !== "undefined");
                                    };
                                })());
                            } else {
                                // The location must have a specific item
                                this.prerequisites.push((function() {
                                    var item_location_closure = item_location;
                                    var item_id_closure = item_id;
                                    return function() {
                                        return (typeof(game.locations[item_location_closure].items[item_id_closure]) !== "undefined");
                                    };
                                })());
                            }
                            break;
                    }
                    break;
                case "Consequence":
                    switch (event_child.getAttribute("type")) {
                        case "item":
                            var item_id = Number(event_child.getAttribute("itemid"));
                            var item_location = Number(event_child.childNodes[0].nodeValue);
                            var location_id = Number(event_node.parentNode.getAttribute("id"));
                            if (item_location == 0) {
                                // An item moves from the current location to the player inventory
                                this.consequences.push((function() {
                                    var item_id_closure = item_id;
                                    var location_id_closure = location_id;
                                    return function() {
                                        game.player_inventory[item_id_closure] = game.locations[location_id_closure].items[item_id_closure];
                                        delete game.locations[location_id_closure].items[item_id_closure];
                                    };
                                })());
                            } else {
                                // An item moves from the player inventory to the current location
                                this.consequences.push((function() {
                                    var item_id_closure = item_id;
                                    var location_id_closure = location_id;
                                    return function() {
                                        game.locations[location_id_closure].items[item_id_closure] = game.player_inventory[item_id_closure];
                                        delete game.player_inventory[item_id_closure];
                                    };
                                })());
                            }
                            // TODO - An item can also be expended (deleted without reassignment)
                            break;
                        case "location":
                            var new_location = Number(event_child.childNodes[0].nodeValue);
                            this.consequences.push((function() {
                                var new_location_closure = new_location;
                                return function() {
                                    game.player_location = new_location_closure;
                                };
                            })());
                            break;
                        case "message":
                            var new_message = event_child.childNodes[0].nodeValue;
                            this.consequences.push((function() {
                                var new_message_closure = new_message;
                                return function() {
                                    game.message_buffer += "  " + new_message_closure;
                                };
                            })());
                            break;
                        case "audio":
                            var audio_src = event_child.childNodes[0].nodeValue;
                            this.consequences.push((function() {
                                var audio_src_closure = audio_src;
                                return function() {
                                    var audio_fx = game.audio_source_fx;
                                    game.audio_source_fx.src = audio_src_closure;
                                    game.audio_source_fx.parentNode.load();
                                    if (!audio_fx.parentNode.autoplay) {
                                        audio_fx.parentNode.play();
                                    }
                                };
                            })());
                            break;
                        // TODO - Soundtrack / background audio
                    }
                    break;
            }
        }
    };

    // Object initialization
    this.description = description; // ex: "Click on Gold Key #1"

    // A list of functions which must all evaluate to True for the event to execute
    this.prerequisites = prerequisites;

    // A list of functions that change the game state or produces side effects
    this.consequences = consequences;

    // The next two attributes describe where on the game display the user must click to
    // trigger the event.
    this.shape = shape;
    if (coords) {
        this.coords = coords;
    }
}

function Item(id, description, image_path, left, bottom) {
    /* Object prototype for a point-and-click game item. */
    this.fromXMLNode = function(item_node) {
        /* Populate the object according to an "Item" node parsed from an XML file. */
        this.id = Number(item_node.getAttribute("id"));
        this.left = item_node.getAttribute("left");
        this.bottom = item_node.getAttribute("bottom");

        // Extract relevant child node information.  This is more complicated because many
        // browsers, including Firefox and Chrome, treat line breaks
        // in the XML as text nodes.
        for (var i=0; i < item_node.childNodes.length; i++) {
            switch (item_node.childNodes.item(i).nodeName) {
                case "Description":
                    this.description = item_node.childNodes.item(i).childNodes[0].nodeValue;
                    break;
                case "Image":
                    this.image_path = item_node.childNodes.item(i).childNodes[0].nodeValue;
                    break;
            }
        }
    };

    this.draw = function(game_window_img_map, item_class) {
        /*
        Draw the item in the game window by adding a new "img" element.  "game_window_img_map"
        should be the HTML "img" element in the containing HTML document associated with an
        HTML "map" element, and the new image element for the item should preceed
        game_window_img_map in the DOM hierarchy so the image map retains the highest z-index.
        
        item_class - A string; a CSS class all item related "img" elements should have
        */
        var img = document.createElement("img");
        var style = "left: " + this.left + "; bottom: " + this.bottom + ";";
        img.setAttribute("class", item_class);
        img.style = style;
        img.src = this.image_path;
        game_window_img_map.parentNode.insertBefore(img, game_window_img_map);
    };

    // Object initialization
    this.id = Number(id);           // Integer
    this.description = description; // ex: "Gold Key #1"
    this.image_path = image_path;   // ex: "images/items/goldkey1.svg"
    this.left = left;
    this.bottom = bottom;
}

function Location(id, description, image_path, items, events) {
    /* Object prototype for a point-and-click game location. */
    this.fromXMLNode = function(location_node, game) {
        /*
        Populate the object according to a "Location" node parsed from an XML file.
        game - a PointAndClickGame object
        */
        this.id = Number(location_node.getAttribute("id"));
        this.items = {};                 // The items at the location
        this.events = [];                // The events at the location

        // For the current location, extract relevant child node information.  This is more
        // complicated because many browsers, including Firefox and Chrome, treat line breaks
        // in the XML as text nodes.
        for (var i=0; i < location_node.childNodes.length; i++) {
            var location_child = location_node.childNodes.item(i);
            switch (location_child.nodeName) {
                case "Description":
                    this.description = location_child.childNodes[0].nodeValue;
                    break;
                case "Image":
                    this.image_path = location_child.childNodes[0].nodeValue;
                    break;
                case "Item":
                    var item = new Item('', '', '', '', '');
                    item.fromXMLNode(location_child);
                    this.items[item.id] = item;
                    break;
                case "Event":
                    var pnc_event = new PointAndClickEvent('', [], [], "default", null);
                    pnc_event.fromXMLNode(location_child, game);
                    this.events.push(pnc_event);
                    break;
            }
        }
    };

    this.getAvailableEvents = function() {
        /* Return an array of all events at the location for which all prerequisites are met. */
        var available_events = [];
        for (var i=0; i < this.events.length; i++) {
            if (this.events[i].isAvailable()) {
                available_events.push(this.events[i]);
            }
        }
        return available_events;
    };

    // Object initialization
    this.id = Number(id);           // Integer
    this.description = description; // ex: "Gold Key #1"
    this.image_path = image_path;   // ex: "images/items/goldkey1.svg"
    this.items = items;             // Items at this location; ex: {1: item1, 6: item6, ...}
    this.events = events;       // Events at this location; an array of PointAndClickEvent objects
}

function PointAndClickGame(message_buffer_element, initial_message, item_class, game_window_img_map,
    game_window_img, game_window_map, audio_source_soundtrack, audio_source_fx) {
    /*
    Object prototype for a point-and-click game, which is a graph where nodes are states/locations
    and edges are events/actions the player can take.  Every action has zero or more
    prerequisites, such as the player having certain items in his or her inventory.  A game ends
    when the player reaches the goal state/location.  There is no goal test; a goal state is
    any state with no actions.

    message_buffer_element - An HTML text object of any variety (p, h1, etc.)
    initial_message - A string; the initial value of the message buffer
    item_class - A string; all game items drawn on the screen should have this class.
    game_window_img_map - A transparent HTML image element associated with game_window_map
    game_window_img - An HTML image element used to display the location graphics
    game_window_map - An HTML map element associated with game_window_img_map
    audio_source_soundtrack - An HTML "source" element specifying the background audio
    audio_source_fx - An HTML "source" element specifying audio for sound effects

    A game can be created from an XML file conforming to the schema pncgame.xsd.
    TODO - It can also be loaded from LocalStorage.
    */
    this.fromXML = function(xmlfile) {
        /*
        Populate the object according to an XML file conforming to pncgame.xsd.

        xmlfile - A string; path to the XML file
        */

        // Parse the XML file
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", xmlfile, false);    // TODO - Synchronous XMLHttpRequest is deprecated
        xmlhttp.send();
        var xml = xmlhttp.responseXML; // A XML DOM object

        // Get the game's title TODO - make this optional
        this.title = xml.getElementsByTagName("Title")[0].childNodes[0].nodeValue;

        // TODO - Get frame size, if available

        // Get the locations and their associated events and items
        var location_elements = xml.getElementsByTagName("Location")
        for (var i=0; i < location_elements.length; i++) {
            var location = new Location(location_elements[i].getAttribute("id"), '', '', {}, []);
            location.fromXMLNode(location_elements[i], this);
            this.locations[location.id] = location;
        }

        // TODO - Get player starting location, if available
    };

    this.update = function() {
        /*
        The containing HTML page should call this method manually once to initiate the game.
        Among other actions, this method associates events with areas on the game window's
        image map.  Each event, when executed, will call this method again using the same
        parameter values passed during the initial, manual call.

        TODO - Additional parameter: array of functions for extending the engine in real time
            ex: Draw/list item inventory
        */

        // Remove previously drawn items, if any.  This assumes that item images have a specific
        // CSS class, which is passed to PointAndClickGame's constructor.
        var items = document.getElementsByClassName(this.item_class);
        for (var i=0; i < items.length; i++) {
            items[i].parentNode.removeChild(items[i]);
        }

        // Update the main location image
        this.game_window_img.src = this.locations[this.player_location].image_path;

        // Draw items, if any
        items = this.locations[this.player_location].items;
        for (var item_id in items) {
            // Draw each item as a lower z-index than the image used with the map
            items[item_id].draw(this.game_window_img_map, this.item_class);
        }

        // Display messages, and empty the buffer
        this.message_buffer_element.innerHTML = this.message_buffer;
        this.message_buffer = "";

        // Update the game window map's "area" child nodes
        this.game_window_map.innerHTML = "";     // Remove existing events
        var available_events = this.locations[this.player_location].getAvailableEvents();

        // For each available event, add an "area" tag to the game window map
        var that = this;
        for (var i=0; i < available_events.length; i++)
        {
            var area = document.createElement("area");
            area.shape = available_events[i].shape;
            if (available_events[i].coords) {
                area.coords = available_events[i].coords;
            }
            area.addEventListener("click", (function() {
                var event_closure = available_events[i];
                return function() {
                    event_closure.execute();
                    that.update();
                };
            })());
            this.game_window_map.appendChild(area);
        }

        // TODO - Update the source of the location based audio, if any
    };

    // Object initialization
    this.title = "Point and Click Game";
    this.locations = {};
    this.player_inventory = {}; // A dictionary of Item objects
    this.player_location = 1;   // Default value; can be overridden via XML or JSON input
    this.message_buffer_element = message_buffer_element;
    this.message_buffer = initial_message;
    this.item_class = item_class;
    this.game_window_img_map = game_window_img_map;
    this.game_window_img = game_window_img;
    this.game_window_map = game_window_map;
    this.audio_source_soundtrack = audio_source_soundtrack;
    this.audio_source_fx = audio_source_fx;
}
