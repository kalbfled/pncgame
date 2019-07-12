/*
(CC BY-NC-SA 4.0) David J. Kalbfleisch 2015, 2019
https://creativecommons.org/licenses/by-nc-sa/4.0/
https://github.com/kalbfled/pncgame
Please read LICENSE, on Github, for more information.

This code implements the Item object prototype.

TODO - Item graphics from sprite sheet instead of single image file
*/

"use strict";

function Item(id, description, image_path, sx, sy, swidth, sheight, x, y, width, height) {
    /*
    Object prototype for a point-and-click game item.  Note that the image file
    referenced by "image_path" should support transparency because the image will be
    drawn over the location image.  PNG and SVG are two formats that support
    transparency.
    
    The last eight parameters are integers used when drawing the item on an HTML5
    "canvas" element: http://www.w3schools.com/tags/canvas_drawimage.asp.

    TODO - Include interactions in constructor?
    */
    this.fromXML = function(item_node) {
        /*
        Populate the object according to an "Item" node parsed from an XML file.  Note that
        converting "null" to a number yields zero, making zero the de-facto default value.
        */
        this.id = Number(item_node.getAttribute("id"));
        this.sx = Number(item_node.getAttribute("sx"));
        this.sy = Number(item_node.getAttribute("sy"));
        this.swidth = Number(item_node.getAttribute("swidth"));
        this.sheight = Number(item_node.getAttribute("sheight"));
        this.x = Number(item_node.getAttribute("x"));
        this.y = Number(item_node.getAttribute("y"));
        this.width = Number(item_node.getAttribute("width"));
        this.height = Number(item_node.getAttribute("height"));

        // Extract relevant child node information.  This is more complicated because many
        // browsers, including Firefox and Chrome, treat line breaks
        // in the XML as text nodes.
        var l = item_node.childNodes.length;
        for (var i=0; i < l; i++) {
            var item_child = item_node.childNodes.item(i);   // Convenience variable
            switch (item_child.nodeName) {
                case "Description":
                    this.description = item_child.childNodes[0].nodeValue;
                    break;
                case "Image":
                    this.image_path = item_child.childNodes[0].nodeValue;
                    break;
                case "Interaction":
                    var that = this;
                    this.interactions[Number(item_child.childNodes[0].nodeValue)] = (function() {
                        var description_closure = that.description;
                        return function() {
                            throw "Undefined interaction for " + description_closure + ".";
                        };
                    })();
                    break;
            }
        }
    };

    this.draw = function(context) {
        /*
        Draw the item in the given canvas context. An "OnLoad" listener is necessary
        because calls to the drawImage method will have no effect before the image finishes
        loading.
        */
        var that = this;
        var img = document.createElement("img");
        img.addEventListener("load", function() {
            // The item graphic should overlay the location graphic.  This is the default
            // value, but it gets changed in pncgame.js.
            context.globalCompositeOperation = "source-over";
            context.drawImage(img, that.sx, that.sy, that.swidth, that.sheight, that.x,
                that.y, that.width, that.height);
        });
        img.src = this.image_path;
    };

    this.interact = function(game) {
        /*Simulate an interaction between the active item and "this" item.*/
        var item_id = game.active_item;
        if ((item_id == 0) || (item_id == this.id)) {
            // There is no active item.  There is nothing to do here.
            return;
        }
        if (this.interactions[item_id]) {
            this.interactions[item_id](); // Execute the interaction
        } else {
            game.message_buffer += "You used the " + game.player_inventory.getItem(item_id).description +
                " on the " + this.description + ", but nothing happened.";
        }
        // Reset cursor, and deactivate all items
        game.canvas.style.cursor = "auto";
        game.inventory_window.style.cursor = "auto";
        // Clear highlighted item background color
        document.getElementById("item" + game.active_item).style.backgroundColor = null;
        game.active_item = 0;
    };

    // Object initialization
    this.id = Number(id);           // Integer
    this.description = description; // ex: "Gold Key #1"
    this.image_path = image_path;   // ex: "images/items/goldkey1.svg"
    this.sx = sx;
    this.sy = sy;
    this.swidth = swidth;
    this.sheight = sheight;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    /*
    An "interaction" occurs when the player attempts to use an item in his inventory
    on another item in his inventory.  For the object below, the keys are the id's of
    items with which "this" item interacts.  The values are functions that make the
    interaction "occur."  All item interaction methods are custom, and each value
    should be a single function.
    
    TODO - XML specified interactions
    */
    this.interactions = {};
}


export { Item };

