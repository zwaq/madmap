"use strict";
var exploreIcon = L.icon({
	iconUrl: 'data/icons/explore.png',
	iconSize:	  [100, 100], // size of the icon	 
	iconAnchor:	  [50, 50], // point of the icon which will correspond to marker's location	   
	popupAnchor:  [0, -50] // point from which the popup should open relative to the iconAnchor
});
	
var searchIcon = L.icon({
	iconUrl: 'data/icons/search.png',
	iconSize:	  [100, 100], // size of the icon	 
	iconAnchor:	  [50, 50], // point of the icon which will correspond to marker's location	   
	popupAnchor:  [0, -50] // point from which the popup should open relative to the iconAnchor
});
   
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
		return L.marker([pt[0],pt[1]], {icon: searchIcon, draggable: true}).addTo(this.map)
	}
};

window.onload = function() {
	
	var madmap = new MadMap('map');
	// madmap.addTileByName("lobby", xy([-2,3]), xy([0,0]), {rotate: 3});
	// madmap.addTileByName("lobby", xy([0,3]), xy([2,0]), {rotate: 1});
	// madmap.addTileByName("lobby", xy([5,2]), xy([8,0]), {rotate: 2});
	// madmap.addTileByName("lobby", xy([2,2]), xy([5,0]), {rotate: 0});
	madmap.addTileByName("lobby", xy([0,3]), xy([2,0]), {rotate: 3});
	madmap.addSearchToken(madmap.getMapTileByName('lobby').getAnchor("stairstoright"));
	
	
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
	var settingsModal = document.getElementById("settingsModal");
	//var startModal = document.getElementById("startModal");
	var startModal = new MadMapModal("startModal", { title: "Welcome", body: "Welcome to this app", onClose: "kill"});
	startModal.addButton("dialog", "hello thar", function() { var sound = new Audio('data/sounds/door.mp3'); sound.play(); console.log("ja hier"); console.log(this); alert("hi"); });
	startModal.addButton("dialog", "get lost", function() { alert("tg"); });		
	startModal.addToPage();
	startModal.toggle();
	// console.log(startModal);
	var music = document.getElementById("music");
	
	// set up the default UI events
	
	// start
	//$("#startModal")[0].addEventListener('click', function(e) { console.log(e); this.toggle(); });
	//toggleModal(startModal);
	
	// settings
	document.getElementById("settingsBtn").addEventListener('click', function() { toggleModal(settingsModal); });
	document.getElementById("settingsCloseBtn").addEventListener('click', function() { toggleModal(settingsModal); });
	document.getElementById("settingsMusic").addEventListener('click', function() {
		if (this.checked) music.muted = false;
		else music.muted = true;
	});
	
	
};
	//document.getElementById("settingsEffects").addEventListener('click', toggleEffects); 
 //var doorPos = L.latLng([ 0, 0 ]);
//var doorMarker = L.marker(doorPos, {icon: exploreIcon, title: "This is a door."}).addTo(map).bindPopup("<b>Hello world!</b><br>I am a popup.");
	//sdoorMarker.on('click', function() {
	//document.getElementById("foot").innerHTML += 'Another door opened.'; 
	//var doorPos2 = L.latLng([ 260, 535 ]);
	//var doorMarker2 = L.marker(doorPos2, {icon: exploreIcon, title: "This is another door."}).addTo(map).bindPopup("<b>Hello world!</b><br>I am a popup.");
	//var bounds2 = [[100,-100], [0,0]];
	//var image2 = L.imageOverlay('canvas-mask.jpg', bounds2).addTo(map);
	//doorMarker2.on('mouseover', function() {
	//alert("mouseover");
//});
//	  }
//);
//map.setView( [70, 120], 1);

// the class for modal windows
// it takes an id and options
// options = title, body, onclose, ischeck
var MadMapModal = function(modalid, options) {
	var that = this;
	
	options = $.extend({
		title: "abro",
		body: "kadabro",
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
		console.log(this);
		console.log(that);
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
		case "startModal":
			// this is a cool way for interval-based cases
			switch(true) {
				case ($.inArray(successes, [1,2]) !== -1):
					alert("1-2");
					break;
				case (successes>2):
					alert("3+");
					break;
				default:
					alert("default");
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
				doMonsters();
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

mythosevents.push({
	prio: 100,
	effect: function() {
		var x = new MadMapModal('mythos123', {body: "This has prio 100", onClose: "kill"});
		x.addToPage();
		$("#mythos123CloseBtn")[0].addEventListener('click', function() { currentMythos = ""; } );
		x.toggle();
	}
});
mythosevents.push({
	prio: 1000,
	effect: function() {
		var x = new MadMapModal('mythos234', {body: "This has prio 1000", onClose: "kill"});
		x.addToPage();
		$("#mythos234CloseBtn")[0].addEventListener('click', function() { currentMythos = ""; } );
		x.toggle();
		
	}
});


function doNext(arr) {
	console.log("running interval...");
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
mythosInterval = window.setInterval(doNext, 100, mythosevents);

function doMythos(turn) {
	console.log("doing mythos for turn: " + turn);
	// auto mythoshandling adds a random mythos each round
	if (mythoshandling == "auto") {
		
		// sort by priority
		mythosevents.sort(function(a, b) {
			return a.prio - b.prio;
		});
		mythosevents.forEach(function(el, i, arr) {
			el.effect();
		});
	}
	// sort events by prio
	
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
	return arr[Math.floor(colors.length * Math.random())];
}