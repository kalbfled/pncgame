pncgame.js and related files  
([CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)) David J. Kalbfleisch 2015  
https://github.com/kalbfled/pncgame

This software implements a simple, client-side, point-and-click game engine using JavaScript and other standard web technologies.  For a brief demonstration, please visit http://www.purdone.com/dave/pncgame/.

See testgame/test.html for an example of how to instantiate a game in a webpage.  A game essentially is a graph where the nodes are "locations" with corresponding images, and edges are "events" the player can initiate by clicking within the game window.  An event will only be available if "prerequisites" are met, and executing an event will have "consequences."  A terminal or goal state is any location with no available events.  See the [wiki](https://github.com/kalbfled/pncgame/wiki) for a summary of currently supported prerequisites and consequences.

Note that the JavaScript uses features, such as the [Array.filter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter) method, that might not be available in older browsers.  I do not intend to add legacy support.

Game designers specify the game world with an XML file that validates against pncgame.xsd.  If you're interested in contributing to this project, or if you're searching for something to host in your own Github repository, some sort of level editor that generates this XML file from graphical or CSV input would be very useful.

If you create an interesting game, [let me know](http://www.purdone.com/dave/contact.php)!  I will link to it.


Dave  
13 September 2015
