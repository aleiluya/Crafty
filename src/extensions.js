Crafty.extend({
	
	randRange: function(from, to) {
		return Math.round(Math.random() * (to - from) + from);
	},
	
	/**
	* Sprite generator.
	*
	* Extends Crafty for producing components
	* based on sprites and tiles
	*/
	sprite: function(tile, url, map, paddingX, paddingY) {
		var pos, temp, x, y, w, h;
		
		//if no tile value, default to 16
		if(typeof tile === "string") {
			map = url;
			url = tile;
			tile = 1;
		}
		
		//if no paddingY, use paddingX
		if(!paddingY && paddingX) paddingY = paddingX;
		paddingX = parseInt(paddingX || 0, 10); //just incase
		paddingY = parseInt(paddingY || 0, 10);
		
		for(pos in map) {
			if(!map.hasOwnProperty(pos)) continue;
			
			temp = map[pos];
			x = temp[0] * tile + paddingX;
			y = temp[1] * tile + paddingY;
			w = temp[2] * tile || tile;
			h = temp[3] * tile || tile;
			
			//create a component for the sprite
			Crafty.c(pos, {
				__image: url,
				__coord: [x,y,w,h],
				__tile: tile,
				__padding: [paddingX, paddingY],
				
				init: function() {
					this.addComponent("sprite");
					if(this.has("canvas")) {
						this.img = new Image();
						this.img.src = this.__image;
						//draw when ready
						var obj = this;
						this.img.onload = function() {
							DrawBuffer.add(obj);
						};
					}
					this.w = this.__coord[2];
					this.h = this.__coord[3];
				},
				
				sprite: function(x,y,w,h) {
					this.__coord = [x*this.__tile+this.__padding[0],y*this.__tile+this.__padding[1],w*this.__tile || this.__tile,h*this.__tile || this.__tile];
					if(this.has("canvas")) DrawBuffer.add(this);
					else if(this.has("DOM")) this.draw();
				}
			});
		}
		
		return this;
	},
	
	_events: {},
	
	/**
	* Window Events credited to John Resig
	* http://ejohn.org/projects/flexible-javascript-events
	*/
	addEvent: function(ctx, obj, type, fn) {
		if(arguments.length === 3) {
			fn = type;
			type = obj;
			obj = window.document;
		}
		
		//save anonymous function to be able to remove
		var afn = function(e) { var e = e || window.event; fn.call(ctx,e) };
		if(!this._events[obj+type+fn]) this._events[obj+type+fn] = afn;
		else return;
		
		if (obj.attachEvent) { //IE
			obj.attachEvent('on'+type, afn);
		} else { //Everyone else
			obj.addEventListener(type, afn, false);
		}
	},
	
	removeEvent: function(ctx, obj, type, fn) {
		if(arguments.length === 3) {
			fn = type;
			type = obj;
			obj = window.document;
		}
		
		//retrieve anonymouse function
		var afn = this._events[obj+type+fn];

		if(afn) {
			if (obj.detachEvent) {
				obj.detachEvent('on'+type, afn);
			} else obj.removeEventListener(type, afn, false);
			delete this._events[obj+type+fn];
		}
	},
	
	window: {
		width: window.innerWidth || (window.document.documentElement.clientWidth || window.document.body.clientWidth),
		height: window.innerHeight || (window.document.documentElement.clientHeight || window.document.body.clientHeight)
	},
	
	background: function(color) {
		Crafty.stage.elem.style.background = color;
	},
	
	viewport: {
		width: 0, 
		height: 0,
		_x: 0,
		_y: 0,
		
		scroll: function(axis, v) {
			var old = this[axis],
				q,
				i = 0, j = 0, l, m,
				box,
				dupes = {},
				rect,
				sorted = [];
			
			//clear screen
			if(Crafty.context) Crafty.context.clearRect(0,0, this.width, this.height);
			
			rect = {x: axis == '_x' ? old : this._x, y: axis == '_y' ? old : this._y, w: this.width, h:this.height};
			q = Crafty.map.search(rect, false);
			
			for(l=q.length;i<l;++i) {
				box = q[i];
				
				if(!dupes[box[0]]) {
					dupes[box[0]] = true;
					if(!sorted[box._z]) sorted[box._z] = [];
					
					sorted[box._z].push(box);
				}
			}
			
			Crafty("2D obj").each(function() {
				var oldposition = this.pos();
				
				this[axis] -= old - v;
				//if no setter available
				if(Crafty.support.setter === false) {
					this[axis.substr(1)] = this[axis]; 
					this.trigger("change", oldposition);
				}
				this.trigger("move",oldposition);
			});

			m = sorted.length;
			for(;j<m;j++) {
				if(!sorted[j]) continue;
				var k = 0, n = sorted[j].length;
				for(;k<n;k++) {
					if('draw' in sorted[j][k]) 
						sorted[j][k].draw();
				}
			}

			this[axis] = v;
		},
		
		rect: function() {
			return {x: this._x, y: this._y, w: this.width, h: this.height};
		},
		
		init: function(w,h) {
			this.width = w || Crafty.window.width;
			this.height = h || Crafty.window.height;
			
			//stop scrollbars
			if(!w && !h) {
				document.body.style.overflow = "hidden";
			}
			
			//check if stage exists
			var crstage = document.getElementById("cr-stage");
			
			//create stage div to contain everything
			Crafty.stage = {
				x: 0,
				y: 0,
				elem: (crstage ? crstage : document.createElement("div"))
			};
			
			//add to the body and give it an ID if not exists
			if(!crstage) {
				document.body.appendChild(Crafty.stage.elem);
				Crafty.stage.elem.id = "cr-stage";
			}
			
			var elem = Crafty.stage.elem.style,
				offset;
			
			//css style
			elem.width = this.width + "px";
			elem.height = this.height + "px";
			elem.overflow = "hidden";
			elem.position = "relative";
			
			//find out the offset position of the stage
			offset = Crafty.inner(Crafty.stage.elem);
			Crafty.stage.x = offset.x;
			Crafty.stage.y = offset.y;
			
			if(Crafty.support.setter) {
				//define getters and setters to scroll the viewport
				this.__defineSetter__('x', function(v) { this.scroll('_x', v); });
				this.__defineSetter__('y', function(v) { this.scroll('_y', v); });
				this.__defineGetter__('x', function() { return this._x; });
				this.__defineGetter__('y', function() { return this._y; });
			} else {
				//create empty entity waiting for enterframe
				this.x = this._x;
				this.y = this._y;
				Crafty.e("viewport"); 
			}
		}
	},
	
	support: {},
	
	/**
	* Map key names to key codes
	*/
	keys: {'BSP':8, 'TAB':9, 'ENT':13, 'SHF':16, 'CTR':17, 'ALT':18, 'PAU':19, 'CAP':20, 'ESC':27, 'SP':32, 'PGU':33, 'PGD':34, 'END':35, 'HOM':36, 'LA':37, 'UA':38, 'RA':39, 'DA':40, 'INS':45, 'DEL':46, 'D0':48, 'D1':49, 'D2':50, 'D3':51, 'D4':52, 'D5':53, 'D6':54, 'D7':55, 'D8':56, 'D9':57, 'SEM':59, 'EQL':61, 'A':65, 'B':66, 'C':67, 'D':68, 'E':69, 'F':70, 'G':71, 'H':72, 'I':73, 'J':74, 'K':75, 'L':76, 'M':77, 'N':78, 'O':79, 'P':80, 'Q':81, 'R':82, 'S':83, 'T':84, 'U':85, 'V':86, 'W':87, 'X':88, 'Y':89, 'Z':90, 'LWN':91, 'RWN':92, 'SEL':93, 'N0':96, 'N1':97, 'N2':98, 'N3':99, 'N4':100, 'N5':101, 'N6':102, 'N7':103, 'N8':104, 'N9':105, 'MUL':106, 'ADD':107, 'SUB':109, 'DEC':110, 'DIV':111, 'F1':112, 'F2':113, 'F3':114, 'F4':115, 'F5':116, 'F6':117, 'F7':118, 'F8':119, 'F9':120, 'F10':121, 'F11':122, 'F12':123, 'NUM':144, 'SCR':145, 'COM':188, 'PER':190, 'FSL':191, 'ACC':192, 'OBR':219, 'BSL':220, 'CBR':221, 'QOT':222}
});

/**
* Test support for various javascript and HTML features
*/
Crafty.onload(this, function() {
	Crafty.support.setter = ('__defineSetter__' in this && '__defineGetter__' in this);
	Crafty.support.audio = ('Audio' in window);
});

/**
* Entity fixes the lack of setter support
*/
Crafty.c("viewport", {
	init: function() {
		this.bind("enterframe", function() {
			if(Crafty.viewport._x !== Crafty.viewport.x) {
				Crafty.viewport.scroll('_x', Crafty.viewport.x);
			}
			
			if(Crafty.viewport._y !== Crafty.viewport.y) {
				Crafty.viewport.scroll('_y', Crafty.viewport.y);
			}
		});
	}
});

var DrawBuffer = {

	add: function add(obj, old) {
		//redraw old position that was cleared
		this.redraw(obj,old); 
		
		//redraw obj in new position
		this.redraw(obj); 
	},
	
	/**
	* Find all objects intersected by this
	* and redraw them in order of Z
	*/
	redraw: function redraw(obj, old) {
		var q, 
			i = 0, 
			j = 0, 
			keylength,
			zlength,
			box, 
			z, 
			layer,
			total = 0,
			redrawSelf = false,
			dupes = {}, //lookup of dupes
			sorted = []; //bucket sort
		
		if(!old) redrawSelf = true; //redraw self if no old param passed
		old = old || obj; //default old x & y to obj
		
		q = Crafty.map.search({x: old._x, y: old._y, w: old._w, h: old._h},false);
		
		for(i=0;i<q.length;++i) {
			box = q[i];
			
			//if found is canvas, not a duplicate and intersects (inlined for performance)
			if(box.isCanvas && !dupes[box[0]] && box._x < old._x + old._w && box._x + box._w > old._x &&
												 box._y < old._y + old._h && box._h + box._y > old._y) {
				dupes[box[0]] = true; //don't search again
				if(box === obj && !redrawSelf) continue; //TAKE HEED, don't return dear lord
				if(!sorted[box._z]) sorted[box._z] = [];
				
				sorted[box._z].push(box);
				++total;
			}
		};
		
		//skip if nothing added
		if(total == 0) return;
		//only draw self
		if(total == 1 && redrawSelf) {
			obj.draw();
			return;
		}
		
		//loop over sorted Z keys
		for(i=0, keylength = sorted.length; i < keylength; ++i) {
			if(!sorted[i]) continue; //skip if undefined
			layer = sorted[i];
			zlength = layer.length;
			
			//loop over all objects with current Z index
			for(j=0;j<zlength;++j) {
				var todraw = layer[j];
				
				//only draw visible area
				if(todraw[0] !== obj[0]) { //don't redraw partial self
					var x = (old._x - todraw._x <= 0) ? 0 : (old._x - todraw._x),
						y = Math.ceil(old._y - todraw._y < 0 ? 0 : (old._y - todraw._y)),
						w = Math.min(todraw._w - x, old._w - (todraw._x - old._x), old._w),
						h = Math.ceil(Math.min(todraw._h - y, old._h - (todraw._y - old._y), old._h));
					
					if(h === 0 || w === 0) continue; //don't bother drawing with h or w as 0
					todraw.draw(x,y,w,h);
					
				} else todraw.draw(); //redraw self
			}
		}
	},
	
	remove: function(obj) {
		this.redraw(obj,obj);
	}
};
