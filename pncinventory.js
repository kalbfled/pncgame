/*
(CC BY-NC-SA 4.0) David J. Kalbfleisch 2015
https://creativecommons.org/licenses/by-nc-sa/4.0/
https://github.com/kalbfled/pncgame
Please read LICENSE, on Github, for more information.

This code implements the Inventory object prototype.  You should minify it for production:
http://www.sundgaard.dk/javascript-minify.aspx.

TODO - ECMAScript6 modularity and class syntactic sugar when they become well supported
*/

"use strict";

function Inventory(initial_items) {
    /*
    Object prototype for a point-and-click game inventory.  The player and locations
    have each an inventory, which can be empty.

    initial_items - An object literal where the keys are item Id's, and the values are Item objects.
        Can be null.
    */

    this.drawInGameWindow = function(context) {
        /* Draw all items in the given canvas context. This is for location inventories. */
        for (var item_id in this.inventory) {
            this.inventory[item_id].draw(context);
        }
    };

    this.add = function(item) {
        /* 
        Add "item" to the player's inventory. If an item with the same Id is already
        present, just log the condition.
        */
        if (this.inventory[item.id]) {
            console.log("Attempted to add item " + item.id + " to the player's inventory, but it's already there.");
        } else {
            this.inventory[item.id] = item;
        }
    };

    this.remove = function(item_id) {
        /* Remove the item with Id=item_id from the inventory. */
        delete this.inventory[item_id];
    };

    this.getItem = function(item_id) {
        /* Return the item denoted with item_id. */
        return this.inventory[item_id];
    };

    this.contains = function(item_id) {
        /*
        Return true if the item with the given item_id is in the inventory.  Otherwise,
        return false.
        */
        return (typeof(this.inventory[item_id]) !== "undefined");
    };

    // Object initialization
    if (initial_items) {
        this.inventory = initial_items;
    } else {
        this.inventory = {};
    }
}
