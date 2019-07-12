/*
(CC BY-NC-SA 4.0) David J. Kalbfleisch 2015, 2019
https://creativecommons.org/licenses/by-nc-sa/4.0/
https://github.com/kalbfled/pncgame
Please read LICENSE, on Github, for more information.

This code implements the PointAndClickGame object prototype.
*/

"use strict";
import { Inventory } from "./pncinventory.js";
import { Item } from "./pncitem.js";
import { Location } from "./pnclocation.js";


function PointAndClickGame(
        canvas,                        // A "canvas" element on which to display the game and items
        message_buffer_element,        // An HTML text object of any variety (p, h1, etc.)
        initial_message,               // A string; the initial value of the message buffer
        audio_source_fx,               // An HTML "source" element specifying audio for sound effects
        initial_items,                 // initial items to populate the player's inventory; can be null
        inventory_window,              // A "div" element that will hold child "div" elements representing the items in the inventory
        item_inventory_class,          // A CSS class to assign to all item "div" elements drawn in the inventory window; a string
        active_item_background_color,  // A string; Highlight color for the active item in the inventory window, if any
        extensions                     // A list of lambda functions to extend functionality; for example, this could
                                       //     be used to populate an on-screen list of items in the player's inventory.
    )
/*
Object prototype for a point-and-click game, which is a graph where nodes are states/locations
and edges are events/actions the player can take.  Every action has zero or more
prerequisites, such as the player having certain items in his or her inventory.  A game ends
when the player reaches the goal state/location.  There is no goal test; a goal state is
any state with no actions.
*/
{
    this.fromXML = function(xmlfile)
    /*
    Populate the object according to an XML file conforming to pncgame.xsd.
    xmlfile - Path to the XML file; a string
    */
    {
        // Parse the XML file
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", xmlfile, false);    // TODO - Synchronous XMLHttpRequest is deprecated
        xmlhttp.send();
        var xml = xmlhttp.responseXML;          // A XML DOM object

        // Get the game's title, if specified
        var title_element = xml.getElementsByTagName("Title")[0];
        if (title_element)
            this.title = title_element.childNodes[0].nodeValue;

        // Populate initial inventory
        var player_inventory_element = xml.getElementsByTagName("PlayerInventory")[0];
        if (player_inventory_element)
        {
            var l = player_inventory_element.childNodes.length;
            for (var i=0; i < l; i++)
            {
                var child_node = player_inventory_element.childNodes.item(i);
                if (child_node.nodeName == "Item")
                {
                    var item = new Item('', '', '', '', '', '', '', '', '');
                    item.fromXML(child_node);
                    this.player_inventory.add(item);
                }
            }
        }

        // Get the locations and their associated events and items
        var location_elements = xml.getElementsByTagName("Location")
        var l = location_elements.length;
        for (var i=0; i < l; i++) {
            var location = new Location(location_elements[i].getAttribute("id"), '', '', {}, []);
            location.fromXML(location_elements[i], this);
            this.locations[location.id] = location;
        }

        // Get player starting location, if specified
        var player_start_element = xml.getElementsByTagName("PlayerStart")[0];
        if (player_start_element) {
            this.player_location = player_start_element.childNodes[0].nodeValue;
        }
    };

    this.load = function() {
        /*
        Retrieve a game state from local storage, and perform necessary type conversions.  (Local
        storage stores everything as a string.)  Call this method after the fromXML method or
        other means of instantiating the PointAndClickGame object's events and items, and then
        call the update method.

        TODO - Update this method.
        */
        if (typeof(Storage) === "undefined") {
            throw "Local storage must be available to load a game.";
        }
        try {
            this.player_location = Number(localStorage.player_location);
            this.player_inventory = JSON.parse(localStorage.player_inventory);
        } catch(err) {
            throw "The saved game data is missing one or more values.  " + err;
        }
        // Remove items in the player's inventory from room inventory
        // TODO - Nested loops are slow.  Is there a better way?
        for (var item in this.player_inventory) {
            for (var location in this.locations) {
                if (this.locations[location].items[item]) {
                    delete this.locations[location].items[item];
                    break;  // No need to continue with additional locations
                }
            }
        }
        // TODO - Load all location inventories if moving items from one location to another
        // becomes possible.
    };

    this.save = function() {
        /*
        Serialize the state of the game as JSON, and write it to local storage.  Serializing the
        entire instance will not work because the lambda functions stored in events will be
        treated as null values.  Rather, the goal is to serialize values that change in
        response to events.  These include the inventory and player location.

        TODO - Update this method.
        */
        if (typeof(Storage) === "undefined") {
            throw "Local storage must be available to save a game.";
        }
        localStorage.player_location = String(this.player_location);
        localStorage.player_inventory = JSON.stringify(this.player_inventory);
        // TODO - Save all location inventories if moving items from one location to another
        // becomes possible.
    };

    this.drawPlayerInventory = function() {
        /*
        This is a convenience method to draw all items in the player's inventory.  It first
        clears the inventory window.
        
        TODO - This method introspects the Inventory object, which is poor design.
        A better approach would be for Inventory to have an iterator.
        */
        this.inventory_window.innerHTML = "";    // Clear the inventory window
        for (var item_id in this.player_inventory.inventory) {
            // The for/in syntax converts object keys to strings, which is undesirable
            this.drawPlayerInventoryItem(Number(item_id));
        }
    };

    this.drawPlayerInventoryItem = function(item_id) {
        /*
        Draw the player's inventory item with the given id in the inventory window.  I decided
        to make this a method of PointAndClickGame, rather than Inventory or Item, because only
        items in the player's inventory are subject to be drawn in the inventory window.  In
        contrast, all items are subject to be drawn on the game canvas, so that functionality
        is part of the Inventory and Item object prototypes.

        Draw the item by adding a child "div" element to div#inventory_window.  The image
        associated with each item should be the div's background image.  This facilitates, for
        example, using fixed sized div elements and automatically scaling the item image size.
        
        TODO - This method introspects the Item object, which is bad design.
        TODO - Move to a canvas based inventory window.
        */
        var item = this.player_inventory.getItem(item_id);
        var div = document.createElement("div");
        div.id = "item" + item_id;
        div.setAttribute("class", this.item_inventory_class);
        div.setAttribute("title", item.description);
        div.style.backgroundImage = "url('" + item.image_path + "')";
        div.style.backgroundPosition = "-" + item.sx + "px " + item.sy + "px";

        /*
        When the player clicks on the item in the item inventory window, the item should
        become active, as indicated by a change of the mouse cursor when over the game canvas
        and inventory window, if another item is not already active.

        If the player clicks on the item with another item active, an interaction might occur.
        */
        var that = this;
        div.addEventListener("click", (function() {
            // When called in an event listener, "this" is the "div" element that was clicked.
            var item_id_closure = item_id;
            return function() {
                if (that.active_item == 0) {
                    // The player selected an item.  Make it active.
                    that.active_item = item_id_closure;
                    that.canvas.style.cursor = "crosshair";
                    that.inventory_window.style.cursor = "crosshair";
                    this.style.backgroundColor = that.active_item_background_color;
                } else {
                    // The player is attempting to use one item on another.
                    // By construction, the id of the "div" is the index of the related item.
                    var item_clicked = Number(this.id.slice(4));
                    that.player_inventory.getItem(item_clicked).interact(that);
                    // Display messages, and empty the buffer
                    that.message_buffer_element.innerHTML = that.message_buffer;
                    that.message_buffer = "";
                }
            };
        })());
        this.inventory_window.appendChild(div);
    };

    this.removeFromInventoryWindow = function(item_id) {
        /* Remove a "div" element created by the drawPlayerInventoryItem method. */
        var item_div = document.getElementById("item" + item_id);
        item_div.parent.removeChild(item_div);
    };

    this.update = function() {
        /*
        The containing HTML page should call this method manually once to initiate the game.
        Each event, when executed, should call this method again using the same parameter
        values passed during the initial, manual call.

        TODO - Draw the game display in an off-screen buffer, and move it to the canvas as
        a complete image.  This might reduce flicker.
        */

        if (this.redraw_needed) {
            // Clear the canvas.  This prepares for subsequent compositing of the location
            // and items.
            this.context.clearRect(0, 0, this.canvas_width, this.canvas_height);

            /*
            Load the graphic for the location, and draw it on the canvas.  An "OnLoad"
            listener is necessary because calls to the drawImage method will have no effect
            before the image finishes loading.

            The location graphic should underlay the item graphics.  Without changing the
            compositing value, items can seem to vanish when they finish loading before the
            location graphic finishes loading.
            */
            var that = this;    // Closure for listeners
            var img = document.createElement("img");
            img.addEventListener("load", function() {
                that.context.globalCompositeOperation = "destination-over";
                that.context.drawImage(img, 0, 0);
            });
            img.src = this.locations[this.player_location].image_path;

            // Draw in the game window items in the current location's inventory, if any
            this.locations[this.player_location].getInventory().drawInGameWindow(this.context);

            this.redraw_needed = false;
        }

        // Display messages, and empty the buffer.
        this.message_buffer_element.innerHTML = this.message_buffer;
        this.message_buffer = "";

        // Execute extensions, if any.
        if (this.extensions) {
            this.extensions.forEach(function(ext) { ext(); });
        }
    };

    // Object initialization
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.canvas_width = canvas.width;
    this.canvas_height = canvas.height;
    this.message_buffer_element = message_buffer_element;
    this.message_buffer = initial_message;
    this.audio_source_fx = audio_source_fx;
    this.player_inventory = new Inventory(initial_items);
    this.inventory_window = inventory_window;
    this.item_inventory_class = item_inventory_class;
    this.active_item_background_color = active_item_background_color;
    this.extensions = extensions;
    this.title = "pncgame.js (CC BY-NC-SA 4.0) David J. Kalbfleisch 2015"; // XSD default title
    this.locations = {};
    this.player_location = 1;    // XSD default value
    this.active_item = 0;        // 0 indicates no item is active
    this.redraw_needed = true;   // Events that alter the display should set this to True
    
    /*
    Add an onClick listener to the game canvas.  It should execute affected events for the current
    location, trigger the update cycle, and deactivate any active items.  This implementation allows
    for overlapping event areas.  If any non-default event executes, do not execute the location's
    default event.
    */
    var that = this;    // Closure for the listener
    this.canvas.addEventListener("click", function(event) {
        // "event" is a MouseEvent - http://www.w3schools.com/jsref/dom_obj_event.asp
        var event_executed = false;
        var rect = that.canvas.getClientRects()[0]; // TODO - Is this correct?  What if the canvas is a child of other elements?
        var available_events = that.locations[that.player_location].getAvailableEvents(); // An array; can be empty
        var l = available_events.length;
        for (var i=0; i<l; i++) {
            // The MouseEvent object's coordinates do not necessarily originate at the boundary of the canvas.
            if (available_events[i].isAffected(event.clientX - rect.x, event.clientY - rect.y, that.context)) {
                if ((available_events[i].shape == "default") && event_executed) {
                    break;  // Don't execute the default event
                } else {
                    available_events[i].execute();
                    event_executed = true;
                }
            }
        }
        if (event_executed) {
            that.update();
        }
        // If an item is active, deactivate it.
        if (that.active_item != 0) {
            // Restore the default cursor to the game canvas
            that.canvas.style.cursor = "auto";
            // Restore the default cursor to the inventory window
            that.inventory_window.style.cursor = "auto";
            // Clear highlighted item background color
            document.getElementById("item" + that.active_item).style.backgroundColor = null;
            that.active_item = 0;
        }
    });
}


export { PointAndClickGame };

