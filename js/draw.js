
var context;

// each are lists of line elements formatted as {sx: , sy: , ex: , ey: }
var danger = [];  // red lines
var platform = [];  // black lines
var bounce = [];  //blue lines
var light_bounce = [];
var dark_bounce = [];

var black = '#000000';
var red = '#F00000';
var blue = '#001eff';
var white = "#FFFFFF";
var cadetblue = "#5F9EA0";
var darkblue = "#00008B";
var colour = black;

// TODO: create play button which initialises the game phase
function play() {
	var dict = {
                "danger" : danger,
                "platform" : platform,
                "bounce" : bounce,
				"lightbounce" : light_bounce, 
				"darkbounce" : dark_bounce
                }

    /*var dictstring = JSON.stringify(dict);
    var fs = require('JSON/temp.json');
    fs.writeFile("temp.json", dictstring);*/
    sessionStorage.drawContent = JSON.stringify(dict);

    window.location.replace("game.html");
}

// =============================================================================
// Draw state
// =============================================================================


function red_click() {
	context.strokeStyle = red;
	colour = red;
}

function blue_click() {
	context.strokeStyle = blue;
	colour = blue;
}


function lightblue_click() {
	context.strokeStyle = cadetblue;
	colour = cadetblue;
}


function darkblue_click() {
	context.strokeStyle = darkblue;
	colour = darkblue;
}

function black_click() {
	context.strokeStyle = black;
	colour = black;
}

function end_enter() {
	var canRect = document.getElementById("boardPlaceholder").getBoundingClientRect();
	var doorRect = document.getElementById("enterDoor").getBoundingClientRect();

	var top = doorRect.top - canRect.top;
	var left = doorRect.left - canRect.left;

	console.log(top);
	console.log(left);
}

function drag() {
	console.log("Clicked on door");
	var canRect = document.getElementById("boardPlaceholder").getBoundingClientRect();
	var doorRect = document.getElementById("enterDoor").getBoundingClientRect();

	var top = doorRect.top - canRect.top;
	var left = doorRect.left - canRect.left;

	console.log(top);
	console.log(left);
}


// TODO: Edit to return true if click on line passed
function intersection(x1, y1, x2, y2, x3, y3, x4, y4){
	var ia, ib;
	var denominator = (y4-y3)*(x2-x1) - (x4-x3)*(y2-y1);
	if (denominator == 0) {
		return false;
	}
	ia = ((y4-y3)*(x4-x1) + (x3-x4)*(y4-y1))/denominator;
	ib = ((x4-x1)*(y1-y2) + (y4-y1)*(x2-x1))/denominator;

    return (0 < ia && ia < 1) && (0 < ib && ib < 1);
}

function eraseLines(contexto, canvas, x1, y1, x2, y2) {
    for (var i = 0; i < danger.length; i++){
       if (intersection(danger[i].sx, danger[i].sy, danger[i].ex, danger[i].ey, x1, y1, x2, y2)){
            //context.globalCompositeOperation = "destination-out";
            context.lineWidth = danger[i].lw;
            context.strokeStyle = '#dbebff';
            context.beginPath();
            context.moveTo(danger[i].sx, danger[i].sy);
            context.lineTo(danger[i].ex, danger[i].ey);
            context.stroke();
            
            danger.splice(i, 1);

            console.log("Remove line");
            i--;
        }
    }
    for (var i = 0; i < platform.length; i++){
        if (intersection(platform[i].sx, platform[i].sy, platform[i].ex, platform[i].ey, x1, y1, x2, y2)){
            //context.globalCompositeOperation = "destination-out";
            context.lineWidth = platform[i].lw;
            context.strokeStyle = '#dbebff';
            context.beginPath();
            context.moveTo(platform[i].sx, platform[i].sy);
            context.lineTo(platform[i].ex, platform[i].ey);
            context.stroke();
            
            platform.splice(i, 1);

            console.log("Remove line");
            i--;
        }
    }
    for (var i = 0; i < bounce.length; i++){
        if (intersection(bounce[i].sx, bounce[i].sy, bounce[i].ex, bounce[i].ey, x1, y1, x2, y2)){
            //context.globalCompositeOperation = "destination-out";
            context.lineWidth = bounce[i].lw;
            context.strokeStyle = '#dbebff';
            context.beginPath();
            context.moveTo(bounce[i].sx, bounce[i].sy);
            context.lineTo(bounce[i].ex, bounce[i].ey);
            context.stroke();
            
            bounce.splice(i, 1);

            console.log("Remove line");
            i--;
        }
    }
    for (var i = 0; i < light_bounce.length; i++){
        if (intersection(light_bounce[i].sx, light_bounce[i].sy, light_bounce[i].ex, light_bounce[i].ey, x1, y1, x2, y2)){
            //context.globalCompositeOperation = "destination-out";
            context.lineWidth = light_bounce[i].lw;
            context.strokeStyle = '#dbebff';
            context.beginPath();
            context.moveTo(light_bounce[i].sx, light_bounce[i].sy);
            context.lineTo(light_bounce[i].ex, light_bounce[i].ey);
            context.stroke();
            
            light_bounce.splice(i, 1);

            console.log("Remove line");
            i--;
        }
    }
    for (var i = 0; i < dark_bounce.length; i++){
        if (intersection(dark_bounce[i].sx, dark_bounce[i].sy, dark_bounce[i].ex, dark_bounce[i].ey, x1, y1, x2, y2)){
            //context.globalCompositeOperation = "destination-out";
            context.lineWidth = dark_bounce[i].lw;
            context.strokeStyle = '#dbebff';
            context.beginPath();
            context.moveTo(dark_bounce[i].sx, dark_bounce[i].sy);
            context.lineTo(dark_bounce[i].ex, dark_bounce[i].ey);
            context.stroke();
            
            dark_bounce.splice(i, 1);

            console.log("Remove line");
            i--;
        }
    }
    //contexto.drawImage(canvas, 0, 0);
    //context.clearRect(0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = "source-over";
}


// TODO: check if this is the right syntax
function draw(redr, obj) {
	var contexto, canvas, canvaso;
	var tool;
	var tool_default = 'pen';
	
	function init() {
		canvaso = document.getElementById('drawingCanvas');
		if (!canvaso) {
			alert('Error! The canvas element was not found!');
			return;
		}

		if (!canvaso.getContext) {
			alert('Error! No canvas.getContext!');
			return;
		}

		contexto = canvaso.getContext('2d');
		if (!contexto) {
			alert('Error! Failed to getContext!');
			return;
		}

		var container = canvaso.parentNode;
		canvas = document.createElement('canvas');
		if (!canvas) {
			alert('Error! Cannot create a new canvas element!');
			return;
		}

		canvas.id = "tempCanvas";
		canvas.width = canvaso.width;
		canvas.height = canvaso.height;
		container.appendChild(canvas);
		context = canvas.getContext('2d');
		context.strokeStyle = "#000000";   // default to black for platforms
		context.lineWidth = 1.0;

		if (redr) {
			redraw(obj);
			sessionStorage.editContent = JSON.stringify(false);
			colour = black;
		}

		//context.fillStyle = "#424242";
		//context.fillRect(0,0,897,532);
		

		var tool_select = document.getElementById('selector');
		if (!tool_select) {
			alert('Error! Failed to get the select element!');
			return;
		}

		tool_select.addEventListener('change', ev_tool_change, false);

		if (tools[tool_default]) {
			tool = new tools[tool_default]();
			tool_select.value = tool_default;
		}

		canvas.addEventListener('mousedown', ev_canvas, false);
		canvas.addEventListener('mousemove', ev_canvas, false);
		canvas.addEventListener('mouseup', ev_canvas, false);
	}

	function drawLines(group, col){
		context.clearRect(0, 0, canvas.width, canvas.height);
		for (var i = 0; i < group.length; i++){
			context.beginPath();
			context.lineWidth = group[i].lw;
            context.strokeStyle = col;
			context.moveTo(group[i].sx, group[i].sy);
			context.lineTo(group[i].ex, group[i].ey);
			context.stroke();
			context.closePath();      
		} 
		img_update();
	}

	function redraw(obj) {
		dEd = obj.danger;
		danger = danger.concat(dEd);
	    pEd = obj.platform;
	    platform = platform.concat(pEd);
	    bEd = obj.bounce;
	    bounce = bounce.concat(bEd);
	    lbEd = obj.lightbounce;
	    light_bounce = light_bounce.concat(lbEd);
	    dbEd = obj.darkbounce;
	    dark_bounce = dark_bounce.concat(dbEd);

	    drawLines(dEd, red);
	    drawLines(pEd, black);
	    drawLines(bEd, blue);
	    drawLines(lbEd, cadetblue);
	    drawLines(dbEd, darkblue);
	}

	//function eraseLines(x1, y1, x2, y2){
	//	var intersected = [];
	//	for (var i = 0; i < danger.length; i++){
    //   		if (intersection(danger[i][0], danger[i].sy, danger[i][2], danger[i][3], x1, y1, x2, y2)){
    //   			iline = {sx: danger[i].sx, sy: starty, ex: ev._x, ey: ev._y, lw: context.lineWidth};
	//			intersected.push(iline);
	//}

	function ev_canvas (ev) {
		if (ev.layerX || ev.layerX == 0) {
			ev._x = ev.layerX;
			ev._y = ev.layerY;
		} else if (ev.offsetX || ev.offsetX == 0) {
			ev._x = ev.offsetX;
			ev._y = ev.offsetY;
		}

		var func = tool[ev.type];
		if (func) {
			func(ev);
		}
	} 
	
    function ev_tool_change (ev) { 
	    if (tools[this.value]) { 
	   		tool = new tools[this.value](); 
	    } 
    }

	function img_update() {
		contexto.drawImage(canvas, 0, 0);
		context.clearRect(0, 0, canvas.width, canvas.height);
	}

	var tools = {};
    var lineList = [];

	tools.pen = function() {
		var tool = this;
		var startx;
		var starty;
		this.started = false;
		this.mousedown = function (ev) {
			context.beginPath();
			context.moveTo(ev._x, ev._y);
			startx = ev._x;
			starty = ev._y;
			tool.started = true;
		};
		this.mousemove = function (ev) {
			if (tool.started) {
				context.lineTo(ev._x, ev._y);
				context.stroke();
				subline = {sx: startx, sy: starty, ex: ev._x, ey: ev._y, lw: context.lineWidth};
				lineList.push(subline);
				startx = ev._x;
				starty = ev._y;
			}
		};
		this.mouseup = function (ev) {
			if (tool.started) {
				tool.mousemove(ev);
				tool.started = false;
				img_update();

				switch (colour) {
					case red: 
						danger = danger.concat(lineList);
						break
					case black:
						platform = platform.concat(lineList);
						break
					case blue:
						bounce = bounce.concat(lineList);
						break
					case darkblue:
						dark_bounce = dark_bounce.concat(lineList);
						break
					case cadetblue:
						light_bounce = light_bounce.concat(lineList);
						break
					default:
						throw Error("Unexpected colour detected");
				}

            lineList.length = 0;
			}
		};
	};

	tools.line = function () {
		var tool = this;
		this.started = false;
		this.mousedown = function (ev) {
			tool.started = true;
			tool.x0 = ev._x;
			tool.y0 = ev._y;
		}
		this.mousemove = function (ev) {
			if (!tool.started) {
				return;
			}
			context.clearRect(0, 0, canvas.width, canvas.height);
			context.beginPath();
			context.moveTo(tool.x0, tool.y0);
			context.lineTo(ev._x, ev._y);
			context.stroke();
			context.closePath();
		};
		this.mouseup = function (ev) {
			if (tool.started) {
				tool.mousemove(ev);
				tool.started = false;
				img_update();

                subline = {sx: tool.x0, sy: tool.y0, ex: ev._x, ey: ev._y, lw: context.lineWidth};

				switch (colour) {
					case red: 
						danger = danger.concat(subline);
						break
					case black:
						platform = platform.concat(subline);
						break
					case blue:
						bounce = bounce.concat(subline);
						break
					case cadetblue:
						light_bounce = light_bounce.concat(subline);
						break
					case darkblue:
						dark_bounce = dark_bounce.concat(subline);
						break
					default:
						throw Error("Unexpected colour detected");
				}
			}
		};
	};

    tools.eraser = function() {
        console.log("Eraser");
        var tool = this;
        this.started = false;

		this.mousedown = function (ev) {
			tool.started = true;
			tool.x0 = ev._x;
			tool.y0 = ev._y;
		};
        this.mousemove = function (ev) {
        	if (!tool.started) {
				return;
			}
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.strokeStyle = white;
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(tool.x0, tool.y0);
            context.lineTo(ev._x, ev._y);
            context.stroke();
            context.closePath();
        };
        this.mouseup = function (ev) {
            if (tool.started) {
                //tool.mousemove(ev);
                tool.started = false;
                eraseLines(contexto, canvas, tool.x0, tool.y0, ev._x, ev._y);
                img_update();
                context.strokeStyle = black;
                colour = black;
            }
        };
    }

init();

}



window.onload = function () {
	var ed = false;
	if (sessionStorage['editContent']) {
		ed = JSON.parse(sessionStorage.editContent);
	}
	var obj = null;
	if (sessionStorage['drawContent']){
		var obj = JSON.parse(sessionStorage.drawContent);
	}
	
	if (ed == true){
		draw(true, obj);
	}
	else {
		draw(false, obj);
	}

}
