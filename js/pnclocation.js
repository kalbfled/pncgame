/*
(CC BY-NC-SA 4.0) David J. Kalbfleisch 2015, 2019
https://creativecommons.org/licenses/by-nc-sa/4.0/
https://github.com/kalbfled/pncgame
Please read LICENSE, on Github, for more information.

This code implements the Location object prototype.
*/

"use strict";
import { PointAndClickEvent } from "./pncevent.js";
import { Inventory } from "./pncinventory.js";
import { Item } from "./pncitem.js";


function Location(id, description, image_path, inventory, events)
/* Object prototype for a point-and-click game location. */
{
    this.fromXML = function(location_node, game)
    /*
    Populate the object according to a "Location" node parsed from an XML file.
    game - a PointAndClickGame object
    */
    {
        this.id = Number(location_node.getAttribute("id"));
        this.inventory = new Inventory();    // The items at the location
        this.events = [];                    // The events at the location

        // For the current location, extract relevant child node information.  This is more
        // complicated because many browsers, including Firefox and Chrome, treat line breaks
        // in the XML as text nodes.
        var l = location_node.childNodes.length;
        for (var i=0; i < l; i++)
        {
            var location_child = location_node.childNodes.item(i);
            switch (location_child.nodeName)
            {
                case "Description":
                    this.description = location_child.childNodes[0].nodeValue;
                    break;
                case "Image":
                    this.image_path = location_child.childNodes[0].nodeValue;
                    break;
                case "Item":
                    var item = new Item('', '', '', '', '', '', '', '', '');
                    item.fromXML(location_child);
                    this.inventory.add(item);
                    break;
                case "Event":
                    var pnc_event = new PointAndClickEvent('', [], [], "default", null);
                    pnc_event.fromXML(location_child, game);
                    this.events.push(pnc_event);
                    break;
            }
        }
    };

    this.getAvailableEvents = function()
    /* Return an array of all events at the location for which all prerequisites are met. */
    {
        return this.events.filter(function(e) { return e.isAvailable(); });
    };

    this.getInventory = function() { return this.inventory; };  // Getter

    // Object initialization
    this.id = Number(id);           // Integer
    this.description = description; // ex: "Gold Key #1"
    this.image_path = image_path;   // ex: "images/items/goldkey1.svg"
    this.inventory = inventory;
    this.events = events;       // Events at this location; an array of PointAndClickEvent objects
}


export { Location };

