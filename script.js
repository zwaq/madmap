"use strict";
var exploreIcon = L.icon({
	iconUrl: 'data/icons/explore.png',
	iconSize:	  [100, 100], // size of the icon	 
	iconAnchor:	  [50, 50], // point of the icon which will correspond to marker's location	   
	popupAnchor:  [0, -50], // point from which the popup should open relative to the iconAnchor
	tooltipAnchor: [50, 0]
});
	
var searchIcon = L.icon({
	iconUrl: 'data/icons/search.png',
	iconSize:	  [100, 100], // size of the icon	 
	iconAnchor:	  [50, 50], // point of the icon which will correspond to marker's location	   
	popupAnchor:  [0, -50], // point from which the popup should open relative to the iconAnchor
	tooltipAnchor: [50, 0]
});

var investigators = [
	{
		"name": "Joe Clearstone",
		"sex": "m",
		"class": ["detective", "akimbo"]
	},
	{
		"name": "Daextera Dragon",
		"sex": "m",
		"class": ["magic"]
	},
	{
		"name": "Dandy Runner",
		"sex": "f",
		"class": ["booklover"]
	},
	{
		"name": "Brother Maryus",
		"sex": "m",
		"class": ["religious"]
	}
]
var getDbTileByName = function(tilename) {
	for (var i = 0; i < tiledb.length; i++) {
		if (tiledb[i].name == tilename) { return tiledb[i]; }
	}
	return false;
}

var xy = function(x) {
	return [x[1], x[0]];  // When doing xy(x, y);
};
// globals
var mapTiles = [];
var explorationTokens =[];

// the map object
var MadMap = function(mapid) {
	var that = this;
	this.map = L.map(mapid, {
	crs: L.CRS.Simple,
	maxZoom: 8,
	minZoom: 6,
	doubleClickZoom: false,
	maxBounds: [[20,-20], [-20, 20]]
	});
	
	// debug function
	// shows coordinates of clicked point and the tile on that position
	this.map.on('click', function(e) {
		if (document.getElementById('debugmode').checked) {
			console.log("y,x: " + e.latlng.lat + ", " + e.latlng.lng);
			var yfiltered = mapTiles.filter(function(el) {
				return (el.topleft.y > e.latlng.lat && el.botright.y < e.latlng.lat); 
			});
			var filtered = yfiltered.filter(function(el) {
				return (el.topleft.x < e.latlng.lng && el.botright.x > e.latlng.lng);
			});
			console.log(filtered[0]);
		}
	});
	var bounds = [[5,0], [0,5]];
	
	this.map.fitBounds(bounds);
	var origin = L.latLng([ 0, 0 ]);
	//var originMarker = L.marker(origin, {icon: exploreIcon, title: "This is a door."}).addTo(this.map).bindPopup("<b><button onclick='alert(\"hallo\")'>Hi</button>Hello world!</b><br>I am a popup.").bindTooltip("my tooltip text");
	// var originMarker = L.marker(origin, {icon: exploreIcon, title: "This is a door."}).addTo(this.map).addEventListener('click', function() {
		// var x = new MadMapModal('testaaa', {title: "lame", body: "<marquee>Hier geht html! :D</marquee>", onClose: "kill"});
		// x.addToPage();
		// x.toggle();
	// }).bindTooltip("origin");
	
	// add optional argument alias
	// options: fly = {true, false} fly to the new tile
	//			rotate = {0, 1, 2, 3} number of cw 90 degree rotations
	this.addTileByName = function(tilename, topleft, botright, options) {
		options = $.extend({
		rotate: 0,
		fly: false
		}, options);
		
		console.log("placing tile \"" + tilename + "\", rotated " + options.rotate + " times, at [[" + topleft[0] + ", " + topleft[1] + "], [" + botright[0] + ", " + botright[1] + "]]");
		
		var tile = getDbTileByName(tilename) || console.log("fatal: tile not found");
		// calculate new bounds for rotated tiles
		var newtopleft = topleft;
		var newbotright = botright;
		var xrotation = 0;
		switch(options.rotate) {
			case 1: newtopleft = [topleft[0], topleft[1] + tile.dimY];
					newbotright = [botright[0] + (tile.dimX - tile.dimY), botright[1] + tile.dimX];
					xrotation = 90;
					break;
			case 2: newtopleft = botright;
					newbotright = [botright[0] - tile.dimY, botright[1] + tile.dimX ];
					xrotation = 180;
					break;
			case 3: newtopleft = [topleft[0] - tile.dimX, topleft[1]];
					newbotright = [topleft[0] - tile.dimX - tile.dimY, topleft[1] + tile.dimX];
					xrotation = 270;
					break;
					// newtopleft = ;
			default: xrotation = 0;
					break;
		}
		var bounds = [[newtopleft, newbotright]];
		//if ((tile.dimX != botright[0] - topleft[0]) || (tile.dimY != topleft[1] - botright[1])) alert("tilesize does not match. this will result in a skewed image");
		var mapImage = L.rotatedImageOverlay(tile.image, bounds, {rotation: xrotation}).addTo(this.map);
		$(mapImage._image).fadeIn(800);
		var maptile = { "tile": tile, "topleft": {"x": topleft[1], "y": topleft[0]}, "botright": {"x": botright[1], "y": botright[0] }, "botleft": {"x": topleft[1], "y": botright[0] }, "topright": {"x": botright[1], "y": topleft[0]} };
		// create anchors for maptile
		// anchors are in [x,y] format
		switch(options.rotate) {
			case 1: maptile.getAnchor = function(location) {
						return [this.topleft.y - this.tile.anchors[location][0], this.topleft.x + this.tile.anchors[location][1]];
						};
						break;
			case 2: maptile.getAnchor = function(location) {
						return [this.topright.y - this.tile.anchors[location][1], this.topright.x - this.tile.anchors[location][0]];
						};
						break;
			case 3: maptile.getAnchor = function(location) {
						return [this.botright.y + this.tile.anchors[location][0], this.botright.x - this.tile.anchors[location][1]];
						};
						break;
			default: maptile.getAnchor = function(location) {
						return [this.botleft.y + this.tile.anchors[location][1], this.botleft.x + this.tile.anchors[location][0]];
					};
		}
		// add maptile to list of maptiles
		mapTiles.push(maptile);
		
		// finally, if the fly option was set, fly to the tile
		if (options.fly === true) this.map.flyToBounds(bounds);
	}
	
	this.getMapTileByName = function(tilename) {
		for (var i = 0; i < mapTiles.length; i++) {
		//console.log(mapTiles[i].tile.name);
			if (mapTiles[i].tile.name == tilename) { return mapTiles[i]; }
		}
		return false;
	}
	
	this.addExplorationToken = function(pt) {
		return L.marker([pt[0],pt[1]], {icon: exploreIcon}).addTo(this.map)
	}
	
	this.addSearchToken = function(pt) {
		return L.marker([pt[0],pt[1]], {icon: searchIcon}).addTo(this.map)
	}
};

var madmap;
window.onload = function() {
	
	madmap = new MadMap('map');
	// madmap.addTileByName("lobby", xy([-2,3]), xy([0,0]), {rotate: 3});
	// madmap.addTileByName("lobby", xy([0,3]), xy([2,0]), {rotate: 1});
	// madmap.addTileByName("lobby", xy([5,2]), xy([8,0]), {rotate: 2});
	// madmap.addTileByName("lobby", xy([2,2]), xy([5,0]), {rotate: 0});
	
	
	//madmap.addExplorationToken(madmap.getMapTileByName("ballroom").getAnchor("center"));
	
	var dialogHandler = function(e) {
		yes = function() {
			var m = new MadMapModal('dx');
			m.toggle();
		}
		no = function() {
			alert("no");
		}
		console.log("dialoghandler");
		console.log(e);
		var result = "<div class='dialog-container'>";
		result += "The old man gazes at you with his old eyes. The old man gazes at you with his old eyes.The old man gazes at you with his old eyes.The old man gazes at you with his old eyes.The old man gazes at you with his old eyes.The old man gazes at you with his old eyes.The old man gazes at you with his old eyes.The old man gazes at you with his old eyes."
		result += "<p><button onclick='yes()'>Yes</button><button style='float: right;' onclick='no()'>No</button></p>";
		result += "</div>";
		return result;
	}
	//marker = madmap.addSearchToken(xy([1.5,2])).bindTooltip("dialogue test").bindPopup(dialogHandler);	
   
	 // set up DOM elements
	
	var startModal = new MadMapModal("startModal", { title: "Welcome", body: "<p>Welcome to this proof of concept. This is the first screen. </p><p>It could describe the arrival of our heroes in a unknown haunted house. The lobby seems strangely familiar, though.</p><p>It is fully html enabled, allowing all kind of funny stuff <div style='text-align: center; font-weight: bold;'>like</div><div style='text-align: right;'>css.</div></p><p>This music is creepy, isnt it? Go check it out at <a href='http://freemusicarchive.org/music/Subterrestrial/Dead_But_Dreaming'>freemusicarchive.org</a>. You can disable it in the settings, if you want.</p><p>You can close this window with the close button below to enter our strange adventure!</p><p>Hero selection is not implemented yet.</p>", onClose: "kill"});
	//startModal.addButton("dialog", "hello thar", function() { var sound = new Audio('data/sounds/door.mp3'); sound.play(); console.log("ja hier"); console.log(this); alert("hi"); });
	//startModal.addButton("dialog", "get lost", function() { alert("tg"); });		
	startModal.addToPage();
	$("#startModalCloseBtn")[0].addEventListener('click', function() {
		// this happens when the button was clicked
		madmap.addTileByName("lobby", xy([0,2]), xy([3,0]), {rotate: 0, fly: true});
		var token;
		window.setTimeout(function() {
			// this happens after 1000 ms
			// add a search button with the usual cycle of sequential windows
				var x = new MadMapModal('picture', {body: "It is a picture. Do you want to look closer? Do you?"});
				x.addButton("dialog", "Search (action)", function() {
					window.hasLookedAtPicture = true;
					searchToken.remove();
					x.kill();
					var y = new MadMapModal('picturesearch', {body: "You squint your eyes looking at the picture, paying close attention to the tinyest details. Test Observation.", isCheck: true});
					y.addToPage();
					y.toggle();
				});
				x.addToPage();
				var searchToken = madmap.addSearchToken(madmap.getMapTileByName('lobby').getAnchor("picturecenter")).addEventListener('click', function() {x.toggle();});
			window.setTimeout(function() {
				// this happens after 1000 ms (its cooler when icons fade in piece by piece)
				// add an exploration token with tooltip and popup
				var token = madmap.addExplorationToken(madmap.getMapTileByName('lobby').getAnchor("leftdoor"));
				token.bindTooltip("Can you resist the urge to click me?");
				token.bindPopup("Of course not. Filthy human.<br>This has html too! Look!<br><marquee>Just scrollin by</marquee>");
				
			}, 1000);
		}, 1000);
	});
	startModal.toggle();
	// console.log(startModal);
	
	
	// set up the default UI events
	
	// start
	//$("#startModal")[0].addEventListener('click', function(e) { console.log(e); this.toggle(); });
	//toggleModal(startModal);
	
	// settings
	var music = document.getElementById("music");
	var settingsModal = document.getElementById("settingsModal");
	document.getElementById("settingsBtn").addEventListener('click', function() { toggleModal(settingsModal); });
	document.getElementById("settingsCloseBtn").addEventListener('click', function() { toggleModal(settingsModal); });
	document.getElementById("settingsMusic").addEventListener('click', function() {
		if (this.checked) music.muted = false;
		else music.muted = true;
	});
	
	
};

// the class for modal windows
// it takes an id and options
//
// options = title, body, onclose, ischeck
// todo: add timed option
// todo: add "simple" modal that only has body and closebtn, for check results etc
// todo: make usual search/interact usecase simpler
var MadMapModal = function(modalid, options) {
	var that = this;
	
	options = $.extend({
		title: "",
		body: "",
		onClose: "toggle",
		isCheck: false,
		isMythos: false
	}, options);
	
	this.id = modalid;
	this.buttons = [];
	
	// create html
	this.createHtml = function() {
		console.log("printing buttons");
		var closeBtnText;
		if (options.isCheck) {
			var checkHtml = "<p class='modal-success-selector'><input id='" + this.id + "_checkResult' type='number' name='result' min='0' /><br>Enter number of successes</p>";
			closeBtnText = 'Submit';
		} else {
			closeBtnText = 'Close';
		}
		var btnHtml = "";
		this.buttons.forEach(function(el, i, arr) { btnHtml += "<button id=" + that.id + "_btn_" + el.id + ">" + el.text + "</button>" } );
		this.htmlObj = ($(['<div id="' + this.id + '" class="modal">',
		'<div class="modal-content">',
		'<div class="modal-header">',
			'<h2>' + options.title + '</h2>',
		'</div>',
		'<div class="modal-body">',
			options.body,
			btnHtml,
		'</div>',
		'<div class="modal-footer">',
			checkHtml,
			'<div class="modal-close-button"><button id="' + this.id + 'CloseBtn">' + closeBtnText + '</button></div>',
		'</div>',
		'</div>'].join("\n"))[0]);
		
		return this.htmlObj;
	}
	
	// creates the html of the button, adds the listeners and adds it to the DOM
	this.addToPage = function() {
		// add to body
		//console.log("add to body");
		$("body").append(this.createHtml());
		this.buttons.forEach(function(el, i, arr) {
			$("#" + that.id + "_btn_" + el.id)[0].addEventListener('click', el.callback);
		});
		//console.log(options);
		// modern browsers fire event listeners in order of registration, so we can validate the check and use stopImmediatePropagation() to prevent closing the modal
		if (options.isCheck) {
			console.log("id: " + this.id);
			$("#" + this.id + "CloseBtn")[0].addEventListener('click', function(e) {
				var successes = $("#" + that.id + '_checkResult')[0].value;
				if (successes != "" && +successes >= 0) checkHandler(+successes, that.id); // the + converts to int
				else e.stopImmediatePropagation();
			});
		}
		if (options.onClose == "kill") $("#" + this.id + "CloseBtn")[0].addEventListener('click', function() { getModalById(that.id).kill(); });
		else $("#" + this.id + "CloseBtn")[0].addEventListener('click', function() { getModalById(that.id).toggle(); });
		if (options.isMythos) $("#" + this.id + "CloseBtn")[0].addEventListener('click', function() { currentMythos = ""; });
	}
	
	// adds a button
	this.addButton = function(btntype, txt, f) {
		var btn = { id: this.buttons.length + 1, text: txt, callback: f };
		this.buttons.push(btn);
	}
	
	// removes the modal from the DOM
	this.removeFromPage = function() {
		$("#" + this.id).remove();
	}
	
	// toggles the modal
	this.toggle = function() {
		console.log("toggling " + this.id);		
		var x = getComputedStyle(this.htmlObj);
		//console.log(x.display);
		//if (x.display === "block") this.htmlObj.style.display = "none";
		//else this.htmlObj.style.display = "block";
		if (x.display === "block") $(this.htmlObj).fadeOut(500);
		else $(this.htmlObj).fadeIn(500);
	}
	
	// kills the modal completely
	this.kill = function() {
		console.log("killing " + this.id);
		//console.log(this.id);
		this.removeFromPage();
		MadMapModal.modals = MadMapModal.modals.filter(function(el) {
			return el.id !== that.id;
		});
	}
	MadMapModal.modals.push(this);
}

MadMapModal.modals = [];

function checkHandler(successes, id) {
	console.log("successes:'" + successes + "'");
	console.log("id: ", id);
	switch (id) {
		case "picturesearch":
			// this is a cool hack for interval-based cases
			switch(true) {
				case ($.inArray(successes, [1,2]) !== -1):
					alert("Oh you got one or two successes");
					break;
				case (successes>2):
					alert("3+. Great job!");
					break;
				default:
					alert("Yeah... no.");
		}
	}
}
//MadMapModal.createModal = function createModal(modalid, modaltitle, modalbody) {
  //  }

var turncounter = 1;
var phase = "Investigator";

function step() {
	var turncnt = $("#turncounter")[0];
	var phasecnt = $("#phase")[0];
	switch (phasecnt.innerHTML) {
		case "Investigator":
			phase = "Mythos";
			toggleModalById('mythosPhaseAnnounceModal');
			window.setTimeout(function() {
				toggleModalById('mythosPhaseAnnounceModal');
				doMythos(turncounter);
				//doMonsters();
			}, 2000);
			break;
		case "Mythos":
			phase = "Investigator";
			toggleModalById('investigatorPhaseAnnounceModal');
			turncounter += 1;
			window.setTimeout(function() {
				toggleModalById('investigatorPhaseAnnounceModal');
			}, 2000);
			break;
	}
	turncnt.innerHTML = turncounter;
	phasecnt.innerHTML = phase;
};

var mythoshandling = "auto";
var mythosevents = [];
var mythosInterval;
var currentMythos = "";

function doNext(arr) {
	console.log("running interval");
	if (currentMythos == "") {
		// start next item
		arr[0].effect();
		// set lock
		currentMythos = arr[0].prio;
		// remove item from array
		arr = arr.splice(0,1);	
	} else console.log("locked");
	if (arr.length == 0) {
		console.log("stopping interval");
		clearInterval(mythosInterval);
	}
}

function doMythos(turn) {
	console.log("doing mythos for turn: " + turn);
	// auto mythoshandling adds a random mythos each round
	// then runs all events in order of priority
	if (mythoshandling == "auto") {
		mythosevents.push(getRandFromArray(mythosdb));
		mythosevents.push(getRandFromArray(mythosdb));
		// sort by priority
		mythosevents.sort(function(a, b) {
			return a.prio - b.prio;
		});
		// poll for new events
		mythosInterval = window.setInterval(doNext, 100, mythosevents);
	}	
}
var monsters = [];
monsters.push({ name: "Cthonian"});
monsters.push({ name: "Cultist"});

function doMonsters() {
	monsters.forEach(function(el, i, arr) {
		console.log(el.name + " acts");
	});
}

// toggles a modal (domelement)
function toggleModalById(modalname) {
	console.log("toggling " + modalname);
	var modal = $("#" + modalname)[0];
	console.log(modal);
	var x = getComputedStyle(modal);
	if (x.display === "block") modal.style.display = "none";
	else modal.style.display = "block";
};

// gets a modal (obj)
function getModalById(modalid) {
	return MadMapModal.modals.filter(function(el) {
		return el.id === modalid;
	})[0];
}

// toggles a modal (obj) defunct?
function toggleModal(modal) {
	console.log("toggling " + modal.id);
	console.log(modal);
	var x = getComputedStyle(modal);
	if (x.display === "block") modal.style.display = "none";
	else modal.style.display = "block";
};

function getRandFromArray(arr) {
	return arr[Math.floor(arr.length * Math.random())];
}