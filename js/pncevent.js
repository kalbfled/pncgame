/*
(CC BY-NC-SA 4.0) David J. Kalbfleisch 2015, 2019
https://creativecommons.org/licenses/by-nc-sa/4.0/
https://github.com/kalbfled/pncgame
Please read LICENSE, on Github, for more information.

This code implements the PointAndClickEvent object prototype.
*/

"use strict";

function PointAndClickEvent(description, prerequisites, consequences, shape, coords)
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
{
    this.isAvailable = function()
    /*
    Return True if all prerequisites are met.  Otherwise, return False.  A
    prerequisite is a function that returns true or false.
    */
    {
        return this.prerequisites.every(function(prereq) { return prereq(); });
    };

    this.isAffected = function(x, y, context)
    /*
    Return True if the event's shape/coords contain the given coordinate.
    
    x and y - Integers; a 2d point where (0,0) is the top-left of the context
    context - A 2d canvas context
    */
    {
        if (this.coords)
            // "default" shapes don't have coordinates
            var coordinates = this.coords.split(",").map(Number);

        switch (this.shape)
        {
            case "rect":
                // Translate between top-left(x1, y1) and bottom-right(x2, y2) for "area"
                // tags to (x, y, width, height) for context.rect
                context.beginPath();
                context.rect(coordinates[0], coordinates[1], coordinates[2] - coordinates[0],
                    coordinates[3] - coordinates[1]);
                break;
            case "circle":
                context.beginPath();
                // x, y, radius, ...
                context.arc(coordinates[0], coordinates[1], coordinates[2] ,0,2*Math.PI);
                break;
            case "poly":
                context.beginPath();
                context.moveTo(coordinates[0], coordinates[1]);
                // Iterate through the remaining points to draw the path
                var l = coordinates.length - 1;
                for (var i=2; i<l; i+=2) {
                    context.lineTo(coordinates[i], coordinates[i+1]);
                }
                context.closePath();    // Return to the first point
                break;
            case "default":
                // This case is for shape=="default"; not the default case
                return true;
            default:
                throw('Unrecognized area type for event "' + this.description + '."');
        }
        return context.isPointInPath(x, y);
    };

    var that = this;    // Closure for listeners
    this.execute = function()
    /*
    Make the event "occur" by calling all of the consequence functions.  Note that this
    method does not check if the event is available.  That should be done by calling the
    isAvailable method before attaching a PointAndClickEvent to an HTML event associated
    with HTML "area" element.  See PointAndClickGame.update.

    When called from a listener, "this" refers to the associated HTML object, but this method
    needs to access the owning PointAndClickEvent object's attributes.  Using "that" (above)
    instead of "this" solves this problem.
    */
    {
        that.consequences.forEach(function(c) { c(); });
    };

    this.fromXML = function(event_node, game)
    /*
    Populate the object according to an "Event" node parsed from an XML file.  This method
    uses nested lambda functions to form closures.
        http://www.w3schools.com/js/js_function_closures.asp
    
    game - a PointAndClickGame object; used in lambda functions to manipulate the game
    */
    {
        this.shape = event_node.getAttribute("shape");
        if (event_node.getAttribute("coords"))
            this.coords = event_node.getAttribute("coords");

        // Extract relevant child node information.  This is more complicated because many
        // browsers, including Firefox and Chrome, treat line breaks in the XML as text nodes.
        var l = event_node.childNodes.length;
        for (var i=0; i < l; i++)
        {
            var event_child = event_node.childNodes.item(i);
            switch (event_child.nodeName)
            {
                case "Description":
                    this.description = event_child.childNodes[0].nodeValue;
                    break;
                case "Prerequisite":
                    // TODO - When I add a non-item-based prerequisite, I will have to return to
                    // calculating item_id in each subcase.  (This is currently commented out.)
                    var item_id = Number(event_child.getAttribute("itemid"));
                    switch (event_child.getAttribute("type")) {
                        case "noitem":
//                            var item_id = Number(event_child.getAttribute("itemid"));
                            var item_location = Number(event_child.childNodes[0].nodeValue);
                            if (item_location == 0) {
                                // The player must not have a specific item
                                this.prerequisites.push((function() {
                                    var item_id_closure = item_id;
                                    return function() {
                                        return !game.player_inventory.contains(item_id_closure);
                                    };
                                })());
                            }
                            else
                            {
                                // The location must not have a specific item
                                this.prerequisites.push((function() {
                                    var item_location_closure = item_location;
                                    var item_id_closure = item_id;
                                    return function() {
                                        return !game.locations[item_location_closure].inventory.contains(item_id_closure);
                                    };
                                })());
                            }
                            break;
                        case "item":
//                            var item_id = Number(event_child.getAttribute("itemid"));
                            var item_location = Number(event_child.childNodes[0].nodeValue);
                            if (item_location == 0) {
                                // The player must have a specific item
                                this.prerequisites.push((function() {
                                    var item_id_closure = item_id;
                                    return function() {
                                        return game.player_inventory.contains(item_id_closure);
                                    };
                                })());
                            }
                            else
                            {
                                // The location must have a specific item
                                this.prerequisites.push((function()
                                {
                                    var item_location_closure = item_location;
                                    var item_id_closure = item_id;
                                    return function() {
                                        return game.locations[item_location_closure].inventory.contains(item_id_closure);
                                    };
                                })());
                            }
                            break;
                    }
                    break;
                case "Consequence":
                    switch (event_child.getAttribute("type"))
                    {
                        case "item":
                            var item_id = Number(event_child.getAttribute("itemid"));
                            var item_location = Number(event_child.childNodes[0].nodeValue);
                            var location_id = Number(event_node.parentNode.getAttribute("id"));
                            if (item_location == 0)
                            {
                                // An item moves from the current location to the player inventory
                                this.consequences.push((function()
                                {
                                    var item_id_closure = item_id;
                                    var location_id_closure = location_id;
                                    return function() {
                                        game.player_inventory.add(game.locations[location_id_closure].inventory.getItem(item_id_closure));
                                        game.locations[location_id_closure].inventory.remove(item_id_closure);
                                        // Draw the new item in the player's inventory.  The update cycle removes it from the game window.
                                        game.drawPlayerInventoryItem(item_id_closure);
                                        game.redraw_needed = true;
                                    };
                                })());
                            }
                            else
                            {
                                // An item moves from the player inventory to the current location
                                this.consequences.push((function()
                                {
                                    var item_id_closure = item_id;
                                    var location_id_closure = location_id;
                                    return function()
                                    {
                                        game.locations[location_id_closure].inventory.add(game.player_inventory.getItem(item_id_closure));
                                        game.player_inventory.remove(item_id_closure);
                                        // Remove the new item from the player's inventory.  The update cycle adds it to the game window.
                                        game.removeFromInventoryWindow(item_id_closure);
                                        game.redraw_needed = true;
                                    };
                                })());
                            }
                            // TODO - An item can also be expended (deleted without reassignment)
                            break;
                        case "location":
                            var new_location = Number(event_child.childNodes[0].nodeValue);
                            this.consequences.push((function()
                            {
                                var new_location_closure = new_location;
                                return function()
                                {
                                    game.player_location = new_location_closure;
                                    game.redraw_needed = true;
                                };
                            })());
                            break;
                        case "message":
                            var new_message = event_child.childNodes[0].nodeValue;
                            this.consequences.push((function()
                            {
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
                                return function()
                                {
                                    var audio_fx = game.audio_source_fx; // Convenience variable; an "audio" HTML5 element
                                    audio_fx.src = audio_src_closure;
                                    audio_fx.parentNode.load();
                                    if (!audio_fx.parentNode.autoplay)
                                        audio_fx.parentNode.play();
                                };
                            })());
                            break;
                        case "custom":
                            // The default custom consequence function must be replaced manually.
                            var index = this.consequences.length;
                            this.consequences.push((function()
                            {
                                var index_closure = index;
                                return function() {
                                    throw "Undefined custom consequence at index " + index_closure + ".";
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

    // An array of functions which must all evaluate to True for the event to execute
    this.prerequisites = prerequisites;

    // An array of functions that change the game state or produces side effects
    this.consequences = consequences;

    // The next two attributes describe where on the game display the user must click to
    // trigger the event.
    this.shape = shape;
    if (coords)
        this.coords = coords;
}


export { PointAndClickEvent };

