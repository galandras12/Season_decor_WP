/**
 * Season Decor – ünnepi díszek motor.
 *
 * Karácsony:  fényfüzér az oldal tetején, karácsonyfa az alsó sarokban
 * Advent:     adventi koszorú, a hétnek megfelelő számú égő gyertyával
 * Hanuka:     hanukia, az aznap esti gyertyák számával
 * Húsvét:     szaladó nyuszi, csipegető csibe, véletlenszerű húsvéti tojások
 * Újév:       szilveszterkor az évszám váltása tűzijáték-csillogásból (fent középen);
 *             január 1-jén az évszám rakétákból, konfetti az elemekről, színes szalagok a tetején
 *
 * A sarokba kerülő díszek (fa, koszorú, hanukia) soha nem takarják egymást:
 * ha ugyanabba a sarokba kerülnének, egymás mellé rendeződnek.
 */
(function (root) {
	'use strict';

	var TAU = Math.PI * 2;
	var MAX_LEDGES = 80;

	var DEFAULTS = {
		lights: false, lightsColor: 'mixed',
		tree: false, treeCorner: 'left',
		advent: 0, adventCorner: 'right',
		hanukkah: 0, hanukkahCorner: 'right',
		bunny: false, chick: false, eggs: false,
		eggSelectors: '', eggRoot: null,
		nyEve: false, nyRockets: false, confetti: false, streamers: false, year: new Date().getFullYear(),
		quick: false // az admin előnézetben gyorsabban jelennek meg az állatok
	};

	var BULBS = {
		mixed: ['#ff3b3b', '#ffd23f', '#3fd35a', '#3b8bff', '#ff6ec7'],
		warm: ['#ffd27a', '#ffc562', '#ffdc94'],
		cool: ['#bfe3ff', '#a6d4ff', '#d9efff']
	};
	var EGG_COLORS = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#ec407a', '#8e44ad', '#fb8c00'];

	function rand(a, b) { return a + Math.random() * (b - a); }
	function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
	function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
	function assign(t) {
		for (var i = 1; i < arguments.length; i++) {
			var s = arguments[i];
			if (s) { for (var k in s) { if (Object.prototype.hasOwnProperty.call(s, k)) { t[k] = s[k]; } } }
		}
		return t;
	}
	// ismételhető „véletlen”: a fa díszei ne ugráljanak átméretezéskor
	function seeded(seed) {
		return function () {
			seed |= 0; seed = seed + 0x6D2B79F5 | 0;
			var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
			t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
			return ((t ^ t >>> 14) >>> 0) / 4294967296;
		};
	}

	/* ---------- közös rajzoló eszközök ---------- */

	var glowCache = {};
	function glowSprite(color) {
		if (glowCache[color]) { return glowCache[color]; }
		var s = 48, cv = document.createElement('canvas');
		cv.width = cv.height = s;
		var c = cv.getContext('2d');
		var g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
		g.addColorStop(0, color);
		g.addColorStop(0.25, color);
		g.addColorStop(1, 'rgba(255,255,255,0)');
		c.globalAlpha = 0.9;
		c.fillStyle = g;
		c.fillRect(0, 0, s, s);
		glowCache[color] = cv;
		return cv;
	}

	function drawFlame(c, x, y, size, t, ph, boost) {
		var flick = 1 + 0.14 * Math.sin(t * 9 + ph) + 0.07 * Math.sin(t * 17 + ph * 2);
		var lean = Math.sin(t * 5 + ph) * size * 0.12;
		var hgt = size * flick * (boost || 1), wid = size * 0.38 * (boost || 1);

		var g = c.createRadialGradient(x, y - hgt * 0.4, 0, x, y - hgt * 0.4, size * 2.2);
		g.addColorStop(0, 'rgba(255,200,90,.55)');
		g.addColorStop(1, 'rgba(255,170,60,0)');
		c.fillStyle = g;
		c.fillRect(x - size * 2.2, y - size * 2.6, size * 4.4, size * 4.4);

		c.fillStyle = '#ff9a1f';
		c.beginPath();
		c.moveTo(x, y);
		c.quadraticCurveTo(x - wid, y - hgt * 0.45, x + lean, y - hgt);
		c.quadraticCurveTo(x + wid, y - hgt * 0.45, x, y);
		c.fill();
		c.fillStyle = '#ffe066';
		c.beginPath();
		c.moveTo(x, y);
		c.quadraticCurveTo(x - wid * 0.55, y - hgt * 0.35, x + lean * 0.6, y - hgt * 0.68);
		c.quadraticCurveTo(x + wid * 0.55, y - hgt * 0.35, x, y);
		c.fill();
	}

	function makeStatic(wU, hU, scale, dpr, drawFn) {
		var cv = document.createElement('canvas');
		cv.width = Math.max(1, Math.ceil(wU * scale * dpr));
		cv.height = Math.max(1, Math.ceil(hU * scale * dpr));
		var c = cv.getContext('2d');
		c.scale(scale * dpr, scale * dpr);
		c.translate(0, hU); // a helyi koordináták: bal alsó sarok az origó, felfelé negatív y
		drawFn(c);
		return cv;
	}

	/* ---------- karácsonyfa ---------- */

	var TREE = { w: 120, h: 190 };

	function treeLightSpots() {
		var rnd = seeded(7), spots = [], tiers = [[-18, -80, 104], [-62, -118, 86], [-102, -150, 68], [-134, -178, 50]];
		tiers.forEach(function (t, k) {
			var n = 5 - k;
			for (var i = 0; i < n; i++) {
				var f = (i + 0.5) / n, y = t[0] + (t[1] - t[0]) * (0.25 + 0.45 * rnd());
				var half = (t[2] / 2) * (1 - (t[0] - y) / (t[0] - t[1]) * 0.92);
				spots.push({ x: TREE.w / 2 + (f * 2 - 1) * half * 0.78, y: y });
			}
		});
		return spots;
	}

	function drawTreeStatic(c) {
		var cx = TREE.w / 2, rnd = seeded(11);
		// ajándékok
		c.fillStyle = '#d63a3a'; c.fillRect(6, -15, 22, 15);
		c.fillStyle = '#ffd54a'; c.fillRect(15, -15, 4, 15); c.fillRect(6, -9, 22, 3);
		c.fillStyle = '#3a82d6'; c.fillRect(92, -11, 20, 11);
		c.fillStyle = '#fff'; c.fillRect(100, -11, 4, 11);
		// törzs
		c.fillStyle = '#6b4226';
		c.fillRect(cx - 8, -24, 16, 24);
		// lombkoronák
		var tiers = [[-18, -80, 104], [-62, -118, 86], [-102, -150, 68], [-134, -178, 50]];
		tiers.forEach(function (t) {
			var g = c.createLinearGradient(cx - t[2] / 2, 0, cx + t[2] / 2, 0);
			g.addColorStop(0, '#1b5e33'); g.addColorStop(0.5, '#2f9150'); g.addColorStop(1, '#1b5e33');
			c.fillStyle = g;
			c.beginPath();
			c.moveTo(cx, t[1]);
			c.lineTo(cx + t[2] / 2, t[0]);
			c.quadraticCurveTo(cx, t[0] + 7, cx - t[2] / 2, t[0]);
			c.closePath();
			c.fill();
		});
		// arany füzér
		c.strokeStyle = '#ffd54a';
		c.lineWidth = 2;
		c.lineCap = 'round';
		tiers.forEach(function (t, k) {
			var yA = t[0] - 12 - k * 2, half = (t[2] / 2) * 0.62;
			c.beginPath();
			c.moveTo(cx - half, yA);
			c.quadraticCurveTo(cx, yA + 16 - k * 3, cx + half, yA - 18);
			c.stroke();
		});
		// gömbök
		var cols = ['#e53935', '#ffd54a', '#42a5f5', '#e0e0e0', '#ab47bc'];
		for (var i = 0; i < 15; i++) {
			var k = (rnd() * 4) | 0, t = tiers[k];
			var y = t[0] - 6 - rnd() * (t[0] - t[1]) * 0.7;
			var half = (t[2] / 2) * (1 - (t[0] - y) / (t[0] - t[1]) * 0.85);
			var x = cx + (rnd() * 2 - 1) * half * 0.8, r = 3.6 + rnd() * 2;
			c.fillStyle = cols[(rnd() * cols.length) | 0];
			c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
			c.fillStyle = 'rgba(255,255,255,.7)';
			c.beginPath(); c.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, TAU); c.fill();
		}
	}

	function drawTreeDynamic(c, t, spots) {
		var cx = TREE.w / 2, cols = BULBS.mixed;
		for (var i = 0; i < spots.length; i++) {
			var s = spots[i], a = 0.45 + 0.55 * Math.abs(Math.sin(t * 1.6 + i * 1.7));
			var col = cols[i % cols.length];
			c.globalAlpha = a * 0.85;
			c.drawImage(glowSprite(col), s.x - 8, s.y - 8, 16, 16);
			c.globalAlpha = 1;
			c.fillStyle = col;
			c.beginPath(); c.arc(s.x, s.y, 1.9, 0, TAU); c.fill();
		}
		// csillag a csúcson
		var pulse = 1 + 0.08 * Math.sin(t * 2.2), sy = -184;
		c.globalAlpha = 0.8;
		c.drawImage(glowSprite('#ffe27a'), cx - 20, sy - 20, 40, 40);
		c.globalAlpha = 1;
		c.fillStyle = '#ffd54a';
		c.strokeStyle = '#e0a800';
		c.lineWidth = 1;
		c.beginPath();
		for (var p = 0; p < 10; p++) {
			var r = (p % 2 ? 4.2 : 10) * pulse, a2 = -Math.PI / 2 + p * Math.PI / 5;
			c.lineTo(cx + Math.cos(a2) * r, sy + Math.sin(a2) * r);
		}
		c.closePath(); c.fill(); c.stroke();
	}

	/* ---------- adventi koszorú ---------- */

	var WREATH = { w: 130, h: 100, cx: 65, cy: -20, rx: 58, ry: 15 };
	var ADVENT_CANDLES = [
		{ x: 20, y: -22, color: '#7b3fa0' }, { x: 47, y: -31, color: '#7b3fa0' },
		{ x: 83, y: -31, color: '#e87fb0' }, { x: 110, y: -22, color: '#7b3fa0' }
	];

	function drawWreathStatic(c) {
		var rnd = seeded(5), i;
		// a koszorú hátsó fele, a gyertyák mögött
		function ring(from, to) {
			for (i = 0; i < 90; i++) {
				var a = from + (to - from) * rnd();
				var x = WREATH.cx + Math.cos(a) * WREATH.rx * (0.86 + rnd() * 0.18), y = WREATH.cy + Math.sin(a) * WREATH.ry * (0.8 + rnd() * 0.3);
				c.fillStyle = rnd() < 0.5 ? '#1f6b3a' : (rnd() < 0.5 ? '#2f9150' : '#17502c');
				c.beginPath();
				c.ellipse(x, y, 6.5, 3.2, a + rnd(), 0, TAU);
				c.fill();
			}
		}
		ring(Math.PI, TAU);
		// gyertyák
		ADVENT_CANDLES.forEach(function (cd) {
			c.fillStyle = cd.color;
			c.fillRect(cd.x - 4.5, cd.y - 44, 9, 44);
			c.fillStyle = 'rgba(255,255,255,.25)';
			c.fillRect(cd.x - 3, cd.y - 44, 2, 44);
			c.fillStyle = '#3b2a1a';
			c.fillRect(cd.x - 0.6, cd.y - 48, 1.2, 4.5);
		});
		ring(0, Math.PI);
		// bogyók és masni
		for (i = 0; i < 9; i++) {
			var a = rnd() * TAU;
			c.fillStyle = '#d32f2f';
			c.beginPath();
			c.arc(WREATH.cx + Math.cos(a) * WREATH.rx * 0.9, WREATH.cy + Math.sin(a) * WREATH.ry * 0.95, 2.4, 0, TAU);
			c.fill();
		}
		c.fillStyle = '#c62828';
		c.beginPath();
		c.moveTo(WREATH.cx, WREATH.cy + WREATH.ry - 1);
		c.lineTo(WREATH.cx - 12, WREATH.cy + WREATH.ry - 8);
		c.lineTo(WREATH.cx - 12, WREATH.cy + WREATH.ry + 6);
		c.closePath();
		c.moveTo(WREATH.cx, WREATH.cy + WREATH.ry - 1);
		c.lineTo(WREATH.cx + 12, WREATH.cy + WREATH.ry - 8);
		c.lineTo(WREATH.cx + 12, WREATH.cy + WREATH.ry + 6);
		c.closePath();
		c.fill();
		c.beginPath(); c.arc(WREATH.cx, WREATH.cy + WREATH.ry - 1, 3.2, 0, TAU); c.fill();
	}

	function drawWreathDynamic(c, t, lit) {
		for (var i = 0; i < lit && i < 4; i++) {
			var cd = ADVENT_CANDLES[i];
			drawFlame(c, cd.x, cd.y - 48, 11, t, i * 1.7);
		}
	}

	/* ---------- hanukia ---------- */

	var MENORAH = { w: 132, h: 100 };
	var MENORAH_X = [10, 24, 38, 52, 66, 80, 94, 108, 122]; // a 4. index a shamash

	function menorahSlotX(slot) { return MENORAH_X[slot < 4 ? slot : slot + 1]; }

	function drawMenorahStatic(c, nights) {
		var gold = c.createLinearGradient(0, -70, 0, 0);
		gold.addColorStop(0, '#f6dc8a'); gold.addColorStop(1, '#b8860b');
		c.strokeStyle = gold;
		c.fillStyle = gold;
		c.lineCap = 'round';
		c.lineWidth = 3.4;
		// talp és szár
		c.beginPath(); c.ellipse(66, -3, 26, 3.5, 0, 0, TAU); c.fill();
		c.beginPath(); c.moveTo(66, -3); c.lineTo(66, -66); c.stroke();
		c.beginPath(); c.moveTo(56, -9); c.quadraticCurveTo(66, -17, 76, -9); c.stroke();
		// karok
		for (var j = 1; j <= 4; j++) {
			for (var s = -1; s <= 1; s += 2) {
				var x = 66 + s * 14 * j;
				c.beginPath();
				c.moveTo(66, -24);
				c.bezierCurveTo(66 + s * 10 * j, -20, x, -26, x, -52);
				c.stroke();
			}
		}
		// csészék
		function cup(x, y) {
			c.beginPath();
			c.moveTo(x - 4.5, y - 4); c.lineTo(x + 4.5, y - 4); c.lineTo(x + 2.5, y + 1); c.lineTo(x - 2.5, y + 1);
			c.closePath(); c.fill();
		}
		MENORAH_X.forEach(function (x, i) { cup(x, i === 4 ? -66 : -52); });
		// gyertyák: jobbról balra rakjuk, így az utolsó éjszaka mind a 8 áll
		function candle(x, base, hgt, col) {
			c.fillStyle = col;
			c.fillRect(x - 2, base - 4 - hgt, 4, hgt);
			c.fillStyle = '#3b2a1a';
			c.fillRect(x - 0.4, base - 7 - hgt, 0.8, 3.5);
		}
		candle(66, -66, 26, '#ffffff');
		for (var slot = 8 - nights; slot < 8; slot++) {
			candle(menorahSlotX(slot), -52, 22, slot % 2 ? '#8fc4ff' : '#dcecff');
		}
	}

	function drawMenorahDynamic(c, t, nights) {
		drawFlame(c, 66, -66 - 4 - 26 - 3, 9, t, 0.4);
		for (var slot = 8 - nights; slot < 8; slot++) {
			var newest = slot === 8 - nights;
			drawFlame(c, menorahSlotX(slot), -52 - 4 - 22 - 3, 8, t, slot * 1.3, newest ? 1.12 + 0.1 * Math.sin(t * 3) : 1);
		}
	}

	/* ---------- húsvéti állatok ---------- */

	function drawBunny(c, u, phase, hopT) {
		// jobbra néz; az origó a láb alatti talaj, felfelé negatív y
		var stretch = Math.sin(hopT * Math.PI); // 0 talajon, 1 a hop csúcsán
		c.save();
		c.translate(0, -u * 0.45);
		c.rotate(-0.25 * (stretch > 0.5 ? 1 : 0.2) + 0.2 * (1 - stretch) * (hopT > 0.5 ? 1 : 0));
		c.fillStyle = '#fff';
		c.strokeStyle = '#d6d0d4';
		c.lineWidth = 1;
		// hátsó láb
		c.beginPath(); c.ellipse(-u * 0.32, u * 0.28 + stretch * -u * 0.05, u * 0.34, u * 0.15, 0.2 - stretch * 0.5, 0, TAU); c.fill(); c.stroke();
		// test
		c.beginPath(); c.ellipse(0, 0, u * 0.6, u * 0.4, 0, 0, TAU); c.fill(); c.stroke();
		// farok
		c.beginPath(); c.arc(-u * 0.62, -u * 0.05, u * 0.17, 0, TAU); c.fill(); c.stroke();
		// mellső láb
		c.beginPath(); c.ellipse(u * 0.38, u * 0.3 + stretch * -u * 0.08, u * 0.22, u * 0.1, -0.1 + stretch * 0.7, 0, TAU); c.fill(); c.stroke();
		// fül
		for (var e = 0; e < 2; e++) {
			c.save();
			c.translate(u * (0.55 + e * 0.12), -u * 0.5);
			c.rotate(-0.35 - e * 0.3 - stretch * 0.25);
			c.fillStyle = '#fff';
			c.beginPath(); c.ellipse(0, -u * 0.3, u * 0.1, u * 0.34, 0, 0, TAU); c.fill(); c.stroke();
			c.fillStyle = '#ffb6c9';
			c.beginPath(); c.ellipse(0, -u * 0.3, u * 0.05, u * 0.24, 0, 0, TAU); c.fill();
			c.restore();
		}
		// fej
		c.fillStyle = '#fff';
		c.beginPath(); c.arc(u * 0.68, -u * 0.22, u * 0.3, 0, TAU); c.fill(); c.stroke();
		c.fillStyle = '#ffb6c9';
		c.beginPath(); c.arc(u * 0.95, -u * 0.17, u * 0.055, 0, TAU); c.fill();
		c.fillStyle = '#1b1b1b';
		c.beginPath(); c.arc(u * 0.78, -u * 0.3, u * 0.05, 0, TAU); c.fill();
		c.fillStyle = '#fff';
		c.beginPath(); c.arc(u * 0.8, -u * 0.32, u * 0.018, 0, TAU); c.fill();
		c.fillStyle = 'rgba(255,150,170,.55)';
		c.beginPath(); c.arc(u * 0.74, -u * 0.12, u * 0.06, 0, TAU); c.fill();
		c.restore();
	}

	function drawChick(c, u, walkT, headDip, headTurn) {
		// jobbra néz; az origó a láb alatti talaj
		var step = Math.sin(walkT);
		c.lineCap = 'round';
		// lábak
		c.strokeStyle = '#f08a24';
		c.lineWidth = Math.max(1.2, u * 0.08);
		for (var l = 0; l < 2; l++) {
			var off = (l ? -1 : 1) * step * u * 0.15;
			c.beginPath(); c.moveTo(u * 0.05 * (l ? -1 : 1), -u * 0.32); c.lineTo(u * 0.05 * (l ? -1 : 1) + off, -u * 0.02); c.lineTo(u * 0.05 * (l ? -1 : 1) + off + u * 0.12, -u * 0.02); c.stroke();
		}
		c.save();
		c.translate(0, -u * 0.75 + Math.abs(step) * u * 0.03);
		// test
		c.fillStyle = '#ffe34d';
		c.beginPath(); c.arc(0, 0, u * 0.5, 0, TAU); c.fill();
		c.fillStyle = '#ffeb86';
		c.beginPath(); c.ellipse(u * 0.1, u * 0.12, u * 0.3, u * 0.3, 0, 0, TAU); c.fill();
		// szárny
		c.fillStyle = '#f5cb27';
		c.beginPath(); c.ellipse(-u * 0.12, u * 0.02, u * 0.24, u * 0.16, -0.5, 0, TAU); c.fill();
		// fej (csipegetéskor lehajol)
		c.translate(u * 0.42 + headDip * u * 0.22, -u * 0.42 + headDip * u * 0.55);
		c.rotate(headDip * 0.7 + headTurn * 0.15);
		c.fillStyle = '#ffe34d';
		c.beginPath(); c.arc(0, 0, u * 0.36, 0, TAU); c.fill();
		c.strokeStyle = '#f5cb27';
		c.lineWidth = Math.max(1, u * 0.05);
		c.beginPath(); c.moveTo(-u * 0.05, -u * 0.34); c.lineTo(-u * 0.12, -u * 0.5); c.moveTo(u * 0.03, -u * 0.35); c.lineTo(u * 0.06, -u * 0.52); c.stroke();
		c.fillStyle = '#f08a24';
		c.beginPath(); c.moveTo(u * 0.3, -u * 0.06); c.lineTo(u * 0.55, u * 0.04); c.lineTo(u * 0.3, u * 0.13); c.closePath(); c.fill();
		c.fillStyle = '#1b1b1b';
		c.beginPath(); c.arc(u * 0.13, -u * 0.1, u * 0.06, 0, TAU); c.fill();
		c.fillStyle = '#fff';
		c.beginPath(); c.arc(u * 0.15, -u * 0.12, u * 0.02, 0, TAU); c.fill();
		c.fillStyle = 'rgba(255,140,120,.5)';
		c.beginPath(); c.arc(u * 0.08, u * 0.1, u * 0.06, 0, TAU); c.fill();
		c.restore();
	}

	/* ---------- húsvéti tojás ---------- */

	function eggPath(c, w, h) {
		c.beginPath();
		c.moveTo(0, -h / 2);
		c.bezierCurveTo(w * 0.62, -h / 2, w * 0.55, h * 0.5, 0, h / 2);
		c.bezierCurveTo(-w * 0.55, h * 0.5, -w * 0.62, -h / 2, 0, -h / 2);
		c.closePath();
	}

	function makeEgg() {
		var W = 40, H = 54, cv = document.createElement('canvas');
		cv.width = W * 2; cv.height = H * 2;
		var c = cv.getContext('2d');
		c.scale(2, 2);
		c.translate(W / 2, H / 2);
		var base = pick(EGG_COLORS), deco = pick(['#ffffff', '#fff3b0', '#ffffff', '#1e3a8a', '#ffd54a']);
		if (deco === base) { deco = '#ffffff'; }
		var pattern = pick(['plain', 'stripes', 'zigzag', 'dots', 'twotone', 'band']);
		eggPath(c, W - 6, H - 4);
		c.fillStyle = base;
		c.fill();
		c.save();
		eggPath(c, W - 6, H - 4);
		c.clip();
		c.fillStyle = deco;
		c.strokeStyle = deco;
		c.lineWidth = 2.4;
		var i;
		if (pattern === 'stripes') {
			for (i = -2; i <= 2; i++) { c.fillRect(-W, i * 9 - 1.5, W * 2, 3); }
		} else if (pattern === 'zigzag') {
			c.beginPath();
			for (i = -4; i <= 4; i++) { c.lineTo(i * 5, (i % 2 ? 4 : -4) + 2); }
			c.stroke();
			c.beginPath();
			for (i = -4; i <= 4; i++) { c.lineTo(i * 5, (i % 2 ? 4 : -4) - 11); }
			c.stroke();
		} else if (pattern === 'dots') {
			for (var r = 0; r < 4; r++) { for (var d = -1; d <= 1; d++) { c.beginPath(); c.arc(d * 9 + (r % 2 ? 4 : -2), r * 9 - 14, 2.1, 0, TAU); c.fill(); } }
		} else if (pattern === 'twotone') {
			c.fillStyle = pick(EGG_COLORS);
			c.fillRect(-W, 2, W * 2, H);
			c.fillStyle = '#fff';
			c.fillRect(-W, 0, W * 2, 3);
		} else if (pattern === 'band') {
			c.fillRect(-W, -4, W * 2, 9);
			c.fillStyle = base;
			for (i = -3; i <= 3; i++) { c.beginPath(); c.arc(i * 6, 0.5, 1.6, 0, TAU); c.fill(); }
		}
		c.restore();
		// fény és körvonal
		var g = c.createRadialGradient(-W * 0.18, -H * 0.2, 1, 0, 0, H * 0.6);
		g.addColorStop(0, 'rgba(255,255,255,.55)');
		g.addColorStop(0.4, 'rgba(255,255,255,0)');
		g.addColorStop(1, 'rgba(0,0,0,.18)');
		eggPath(c, W - 6, H - 4);
		c.fillStyle = g;
		c.fill();
		c.strokeStyle = 'rgba(0,0,0,.25)';
		c.lineWidth = 1;
		c.stroke();
		return cv;
	}

	/* ---------- újév: évszám csillogásból, konfetti, szalagok ---------- */

	function hsl(h, s, l) { return 'hsl(' + h + ',' + s + '%,' + l + '%)'; }
	function ease(t) { return 1 - Math.pow(1 - clamp(t, 0, 1), 3); }
	var SPARKLE_COLORS = ['#ffd54a', '#fff2b0', '#ffffff', '#ff8fbf', '#7fd1ff', '#ffb347'];
	var CORE_COLORS = ['#ffb000', '#ff4f9a', '#1e9bff', '#ffffff', '#ff7a1a', '#ffd000'];

	// Az évszám képpontjai (a szöveg közepéhez viszonyítva) – ezekből áll össze a csillogás.
	var pointCache = {};
	function textPoints(text, fontPx) {
		var key = text + '|' + fontPx;
		if (pointCache[key]) { return pointCache[key]; }
		var cv = document.createElement('canvas'), c = cv.getContext('2d');
		c.font = '800 ' + fontPx + 'px Arial, Helvetica, sans-serif';
		var tw = Math.ceil(c.measureText(text).width) + 20, th = Math.ceil(fontPx * 1.25);
		cv.width = tw; cv.height = th;
		c.font = '800 ' + fontPx + 'px Arial, Helvetica, sans-serif';
		c.textBaseline = 'middle';
		c.textAlign = 'center';
		c.fillStyle = '#000';
		c.fillText(text, tw / 2, th / 2 + fontPx * 0.04);
		var data = c.getImageData(0, 0, tw, th).data, step = Math.max(3, Math.round(fontPx / 26)), pts = [];
		for (var y = 0; y < th; y += step) {
			for (var x = 0; x < tw; x += step) {
				if (data[(y * tw + x) * 4 + 3] > 128) { pts.push({ ox: x - tw / 2 + rand(-0.8, 0.8), oy: y - th / 2 + rand(-0.8, 0.8) }); }
			}
		}
		pointCache[key] = { pts: pts, w: tw, h: th };
		return pointCache[key];
	}

	/* ---------- fő motor ---------- */

	function start(canvas, options) {
		var opts = assign({}, DEFAULTS, options);
		var ctx = canvas.getContext('2d');
		var w = 0, h = 0, dpr = 1, ox = 0, oy = 0, scale = 1;
		var raf = 0, last = 0, running = true, scanTimer = 0, scrollTimer = 0;

		var lights = [], wireCanvas = null;
		var items = [];
		var ledges = [], eggs = [], nextEgg = 0;
		var bunny = { active: false, nextAt: 0 };
		var chick = { active: false, nextAt: 0 };
		var treeSpots = treeLightSpots();
		var streamers = [], confetti = [], sparks = [], nextConfetti = 0;
		var show = { phase: 'wait', t: 0, parts: [], rockets: [], idx: 0, eveIdx: 0, until: 0, fontPx: 60, cx: 0, cy: 0 };

		function resize() {
			var r = canvas.getBoundingClientRect();
			dpr = Math.min(root.devicePixelRatio || 1, 2);
			w = r.width; h = r.height;
			canvas.width = Math.max(1, Math.round(w * dpr));
			canvas.height = Math.max(1, Math.round(h * dpr));
			layout();
		}

		/* -- elrendezés: fa, koszorú, hanukia soha nem takarják egymást -- */

		function layout() {
			scale = clamp(h / 760, 0.6, 1.15) * (w < 600 ? 0.8 : 1);
			buildLights();
			buildStreamers();
			resetShow();

			var defs = [];
			if (opts.tree) { defs.push({ id: 'tree', corner: opts.treeCorner, box: TREE, build: function () { return makeStatic(TREE.w, TREE.h, scale, dpr, drawTreeStatic); } }); }
			if (opts.advent > 0) { defs.push({ id: 'advent', corner: opts.adventCorner, box: WREATH, build: function () { return makeStatic(WREATH.w, WREATH.h, scale, dpr, drawWreathStatic); } }); }
			if (opts.hanukkah > 0) { defs.push({ id: 'hanukkah', corner: opts.hanukkahCorner, box: MENORAH, build: function () { return makeStatic(MENORAH.w, MENORAH.h, scale, dpr, function (c) { drawMenorahStatic(c, opts.hanukkah); }); } }); }

			var used = { left: 8, right: 8 }, gap = 10, maxUse = w * 0.5;
			items = [];
			defs.forEach(function (d) {
				var width = d.box.w * scale, corner = d.corner, other = corner === 'left' ? 'right' : 'left';
				if (used[corner] + width > maxUse) {
					if (used[other] + width > maxUse) { return; } // nincs hely, nem takarunk le semmit
					corner = other;
				}
				var x = corner === 'left' ? used[corner] : w - used[corner] - width;
				used[corner] += width + gap;
				items.push({ id: d.id, x: x, canvas: d.build(), box: d.box });
			});
		}

		/* -- fényfüzér -- */

		function buildLights() {
			lights = [];
			wireCanvas = null;
			if (!opts.lights || w < 100) { return; }
			var segs = Math.max(2, Math.round(w / 190)), segW = w / segs, sag = clamp(h * 0.04, 16, 28);
			var cv = document.createElement('canvas');
			cv.width = Math.round(w * dpr); cv.height = Math.round((sag * 2 + 40) * dpr);
			var c = cv.getContext('2d');
			c.scale(dpr, dpr);
			c.strokeStyle = '#1f4d2b';
			c.lineWidth = 2;
			c.lineCap = 'round';
			var cols = BULBS[opts.lightsColor] || BULBS.mixed;
			for (var s = 0; s < segs; s++) {
				var x0 = s * segW, x1 = x0 + segW, cy = 2 + sag * 2;
				c.beginPath(); c.moveTo(x0, 2); c.quadraticCurveTo((x0 + x1) / 2, cy, x1, 2); c.stroke();
				var n = Math.max(4, Math.round(segW / 28));
				for (var i = 1; i < n; i++) {
					var t = i / n, mt = 1 - t;
					var bx = mt * mt * x0 + 2 * mt * t * ((x0 + x1) / 2) + t * t * x1;
					var by = mt * mt * 2 + 2 * mt * t * cy + t * t * 2;
					var tan = Math.atan2(2 * mt * (cy - 2) + 2 * t * (2 - cy), 2 * mt * ((x0 + x1) / 2 - x0) + 2 * t * (x1 - (x0 + x1) / 2));
					lights.push({ x: bx, y: by + 1, ang: tan, color: cols[lights.length % cols.length], ph: rand(0, TAU), sp: rand(1.1, 2.4) });
				}
			}
			wireCanvas = cv;
		}

		function drawLights(t) {
			if (!wireCanvas) { return; }
			ctx.drawImage(wireCanvas, 0, 0, w, wireCanvas.height / dpr);
			var steady = opts.lightsColor === 'warm';
			for (var i = 0; i < lights.length; i++) {
				var b = lights[i];
				var a = steady ? 0.8 + 0.2 * Math.sin(t * b.sp + b.ph) : 0.45 + 0.55 * Math.abs(Math.sin(t * b.sp * 0.7 + b.ph));
				ctx.save();
				ctx.translate(b.x, b.y);
				ctx.rotate(b.ang);
				ctx.fillStyle = '#244a2d';
				ctx.fillRect(-1.6, 0, 3.2, 3.5);
				ctx.globalAlpha = a * 0.9;
				ctx.drawImage(glowSprite(b.color), -13, 1, 26, 26);
				ctx.globalAlpha = 0.55 + 0.45 * a;
				ctx.fillStyle = b.color;
				ctx.strokeStyle = 'rgba(0,0,0,.28)';
				ctx.lineWidth = 0.8;
				ctx.beginPath(); ctx.ellipse(0, 9, 3.3, 5.4, 0, 0, TAU); ctx.fill(); ctx.stroke();
				ctx.globalAlpha = 0.8;
				ctx.fillStyle = '#fff';
				ctx.beginPath(); ctx.ellipse(-1, 7.3, 0.9, 1.7, 0, 0, TAU); ctx.fill();
				ctx.restore();
			}
			ctx.globalAlpha = 1;
		}

		/* -- sarokban álló díszek -- */

		function drawItems(t) {
			for (var i = 0; i < items.length; i++) {
				var it = items[i];
				ctx.drawImage(it.canvas, it.x, h - 2 - it.box.h * scale, it.box.w * scale, it.box.h * scale);
				ctx.save();
				ctx.translate(it.x, h - 2);
				ctx.scale(scale, scale);
				if (it.id === 'tree') { drawTreeDynamic(ctx, t, treeSpots); }
				else if (it.id === 'advent') { drawWreathDynamic(ctx, t, opts.advent); }
				else { drawMenorahDynamic(ctx, t, opts.hanukkah); }
				ctx.restore();
			}
		}

		/* -- húsvéti tojások -- */

		function scan() {
			if (!(opts.eggs || opts.confetti) || !opts.eggSelectors) { ledges.length = 0; return; }
			var scope = opts.eggRoot || document, list, found = [], i;
			try { list = scope.querySelectorAll(opts.eggSelectors); } catch (e) { list = []; }
			var cr = canvas.getBoundingClientRect();
			for (i = 0; i < Math.min(list.length, 600); i++) { found.push(list[i]); }
			ledges = ledges.filter(function (l) { return found.indexOf(l.el) !== -1 && document.documentElement.contains(l.el); });
			var known = ledges.map(function (l) { return l.el; });
			for (i = 0; i < found.length && ledges.length < MAX_LEDGES; i++) {
				var el = found[i];
				if (known.indexOf(el) !== -1 || el === canvas || el.contains(canvas)) { continue; }
				var r = el.getBoundingClientRect();
				if (r.width < 50 || r.height < 10) { continue; }
				var top = r.top - cr.top;
				if (top < -400 || top > cr.height + 400) { continue; }
				var cs = root.getComputedStyle(el);
				if (cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.1) { continue; }
				ledges.push({ el: el, x: 0, y: 0, w: r.width, vis: false });
			}
		}

		function refreshLedges() {
			for (var i = 0; i < ledges.length; i++) {
				var l = ledges[i], r = l.el.getBoundingClientRect();
				if (r.width < 1 || r.height < 1) { l.vis = false; continue; }
				l.x = r.left - ox; l.y = r.top - oy; l.w = r.width;
				l.vis = l.y > 30 && l.y < h - 4 && l.x < w && l.x + l.w > 0;
			}
		}

		function spawnEggs(now) {
			var count = 1 + ((Math.random() * 3) | 0), eh = rand(20, 28), vis = ledges.filter(function (l) { return l.vis; });
			var onLedge = vis.length && Math.random() < 0.55, ledge = onLedge ? pick(vis) : null;
			var span = count * eh * 0.8, group = {
				ledge: ledge, born: now, life: rand(10000, 26000), eggs: [],
				x: ledge ? rand(8, Math.max(9, ledge.w - span - 8)) : rand(10, Math.max(11, w - span - 10))
			};
			for (var i = 0; i < count; i++) {
				group.eggs.push({ sprite: makeEgg(), h: eh * rand(0.92, 1.08), rot: rand(-0.18, 0.18), dx: i * eh * 0.82, delay: i * 180 });
			}
			eggs.push(group);
		}

		function updateEggs(now) {
			if (opts.eggs && now >= nextEgg && eggs.length < 4) {
				spawnEggs(now);
				nextEgg = now + rand(opts.quick ? 1500 : 2500, opts.quick ? 4000 : 7000);
			}
			for (var i = eggs.length - 1; i >= 0; i--) {
				var g = eggs[i], age = now - g.born;
				if (age > g.life + 900 || !opts.eggs || (g.ledge && ledges.indexOf(g.ledge) === -1)) { eggs.splice(i, 1); continue; }
				if (g.ledge && !g.ledge.vis) { continue; }
				var surface = g.ledge ? g.ledge.y : h - 1, baseX = (g.ledge ? g.ledge.x : 0) + g.x;
				for (var k = 0; k < g.eggs.length; k++) {
					var e = g.eggs[k];
					var pop = clamp((age - e.delay) / 450, 0, 1);
					var s = pop <= 0 ? 0 : (pop < 1 ? 1.15 * Math.sin(pop * Math.PI * 0.5 + 0.2) : 1);
					var out = clamp((age - g.life) / 900, 0, 1);
					s *= 1 - out;
					if (s <= 0.01) { continue; }
					var eh = e.h * s, ew = eh * 0.74;
					ctx.save();
					ctx.translate(baseX + e.dx + ew / 2, surface - eh / 2 + 2);
					ctx.rotate(e.rot);
					ctx.globalAlpha = 1 - out * 0.6;
					ctx.drawImage(e.sprite, -ew / 2, -eh / 2, ew, eh);
					ctx.restore();
				}
			}
			ctx.globalAlpha = 1;
		}

		/* -- nyuszi -- */

		function updateBunny(now, dt) {
			if (!opts.bunny) { bunny.active = false; return; }
			if (!bunny.active) {
				if (!bunny.nextAt) { bunny.nextAt = now + (opts.quick ? 2500 : 4000); }
				if (now >= bunny.nextAt) {
					bunny.active = true;
					bunny.u = clamp(h * 0.05, 22, 34);
					bunny.dir = Math.random() < 0.5 ? 1 : -1;
					bunny.x = bunny.dir > 0 ? -bunny.u * 2 : w + bunny.u * 2;
					bunny.speed = rand(110, 230);
					bunny.hop = 0;
				}
				return;
			}
			bunny.x += bunny.dir * bunny.speed * dt;
			bunny.hop += dt * bunny.speed / (bunny.u * 3.2);
			if ((bunny.dir > 0 && bunny.x > w + bunny.u * 2) || (bunny.dir < 0 && bunny.x < -bunny.u * 2)) {
				bunny.active = false;
				bunny.nextAt = now + rand(opts.quick ? 9000 : 22000, opts.quick ? 16000 : 55000);
				return;
			}
			var hopT = bunny.hop % 1, lift = Math.sin(hopT * Math.PI) * bunny.u * 1.1;
			ctx.save();
			ctx.translate(bunny.x, h - 2 - lift);
			ctx.scale(bunny.dir, 1);
			drawBunny(ctx, bunny.u, bunny.hop, hopT);
			ctx.restore();
		}

		/* -- csibe: bejön, csipeget, körülnéz, ugyanott kisétál -- */

		function startChick() {
			chick.active = true;
			chick.u = clamp(h * 0.04, 20, 28);
			chick.side = Math.random() < 0.5 ? 1 : -1; // 1 = bal szél
			chick.dir = chick.side;
			chick.x = chick.side > 0 ? -chick.u : w + chick.u;
			chick.state = 'in';
			chick.t = 0;
			chick.walk = 0;
			chick.target = rand(70, 130);
			chick.pecks = 3 + ((Math.random() * 3) | 0);
			chick.looks = 0;
		}

		function updateChick(now, dt) {
			if (!opts.chick) { chick.active = false; return; }
			if (!chick.active) {
				if (!chick.nextAt) { chick.nextAt = now + (opts.quick ? 5500 : 9000); }
				if (now >= chick.nextAt) { startChick(); }
				return;
			}
			var u = chick.u, dip = 0, turn = 0, moving = false;
			var inward = chick.side;
			var entered = chick.side > 0 ? chick.x : w - chick.x;

			chick.t += dt;
			if (chick.state === 'in') {
				moving = true;
				chick.dir = inward;
				chick.x += inward * 34 * dt;
				if (entered >= chick.target) { chick.state = 'peck'; chick.t = 0; }
			} else if (chick.state === 'peck') {
				// csipeget: pár lépés előre, közben le-le hajtja a fejét
				var cycle = 0.7, p = (chick.t % cycle) / cycle;
				dip = Math.pow(Math.sin(p * Math.PI), 2);
				if (p < 0.5) { chick.x += inward * 6 * dt; }
				if (chick.t > chick.pecks * cycle) { chick.state = 'look'; chick.t = 0; chick.looks = 0; }
			} else if (chick.state === 'look') {
				// megáll és körülnéz: jobbra-balra fordul
				var phase = Math.floor(chick.t / 0.9);
				chick.dir = phase % 2 === 0 ? -inward : inward;
				turn = Math.sin(chick.t * 6) * 0.5;
				if (chick.t > 3.6) { chick.state = 'out'; chick.t = 0; chick.dir = -inward; }
			} else {
				moving = true;
				chick.dir = -inward;
				chick.x -= inward * 44 * dt;
				if ((inward > 0 && chick.x < -u * 1.5) || (inward < 0 && chick.x > w + u * 1.5)) {
					chick.active = false;
					chick.nextAt = now + rand(opts.quick ? 12000 : 25000, opts.quick ? 20000 : 60000);
					return;
				}
			}
			if (moving) { chick.walk += dt * 11; }
			ctx.save();
			ctx.translate(chick.x, h - 1);
			ctx.scale(chick.dir, 1);
			drawChick(ctx, u, chick.walk, dip, turn);
			ctx.restore();
		}

		/* -- színes szalagok az oldal tetején -- */

		function buildStreamers() {
			streamers = [];
			if (!opts.streamers || w < 100) { return; }
			var n = clamp(Math.round(w / 65), 6, 26);
			for (var i = 0; i < n; i++) {
				streamers.push({
					x: (i + rand(0.1, 0.9)) / n * w, len: rand(40, Math.min(240, h * 0.4)), width: rand(5, 15),
					color: hsl((Math.random() * 360) | 0, 85, 58), amp: rand(5, 18), sp: rand(0.8, 1.7), ph: rand(0, TAU), twist: rand(0.35, 0.7)
				});
			}
		}

		function drawStreamers(t) {
			for (var i = 0; i < streamers.length; i++) {
				var s = streamers[i], seg = 7, n = Math.ceil(s.len / seg);
				var px = s.x, py = 0;
				for (var k = 1; k <= n; k++) {
					var f = k / n, y = k * seg;
					var x = s.x + Math.sin(t * s.sp + k * 0.28 + s.ph) * s.amp * f;
					var flat = Math.abs(Math.cos(k * s.twist + t * 0.9 + s.ph)); // a szalag csavarodása
					ctx.strokeStyle = s.color;
					ctx.globalAlpha = 0.55 + 0.45 * flat;
					ctx.lineWidth = Math.max(1, s.width * (0.25 + 0.75 * flat));
					ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
					px = x; py = y;
				}
			}
			ctx.globalAlpha = 1;
		}

		/* -- konfetti az elemekről -- */

		function spawnConfetti(now) {
			var vis = ledges.filter(function (l) { return l.vis; });
			if (!vis.length) { return; }
			var l = pick(vis), n = 18 + ((Math.random() * 18) | 0), bx = l.x + rand(10, Math.max(11, l.w - 10)), hue0 = (Math.random() * 360) | 0;
			for (var i = 0; i < n && confetti.length < 280; i++) {
				confetti.push({
					x: bx + rand(-8, 8), y: l.y, vx: rand(-110, 110), vy: rand(-230, -70), w: rand(4, 9), h: rand(6, 12),
					rot: rand(0, TAU), vr: rand(-6, 6), flip: rand(0, TAU), fs: rand(4, 9),
					color: Math.random() < 0.65 ? hsl((hue0 + rand(-70, 70) + 360) % 360, 90, 58) : hsl((Math.random() * 360) | 0, 90, 58)
				});
			}
		}

		function updateConfetti(now, dt) {
			if (opts.confetti && now >= nextConfetti) {
				spawnConfetti(now);
				nextConfetti = now + rand(opts.quick ? 1200 : 1800, opts.quick ? 2800 : 5000);
			}
			if (!opts.confetti && confetti.length) { confetti.length = 0; }
			for (var i = confetti.length - 1; i >= 0; i--) {
				var p = confetti[i];
				p.vy = Math.min(p.vy + 380 * dt, 95);
				p.vx *= 1 - 1.3 * dt;
				p.x += (p.vx + Math.sin(now / 420 + p.flip) * 22) * dt;
				p.y += p.vy * dt;
				p.rot += p.vr * dt;
				p.flip += p.fs * dt;
				if (p.y > h + 16) { confetti[i] = confetti[confetti.length - 1]; confetti.pop(); continue; }
				ctx.save();
				ctx.translate(p.x, p.y);
				ctx.rotate(p.rot);
				ctx.scale(1, Math.cos(p.flip));
				ctx.fillStyle = p.color;
				ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
				ctx.restore();
			}
		}

		/* -- az évszám tűzijáték-csillogásból -- */

		function addSpark(x, y, vx, vy, color, life) {
			if (sparks.length < 700) { sparks.push({ x: x, y: y, vx: vx, vy: vy, color: color, life: life, max: life }); }
		}

		function resetShow() {
			show.phase = 'wait'; show.parts = []; show.rockets = []; show.until = 0; show.idx = 0; show.eveIdx = 0;
		}

		function showMode() { return opts.nyEve ? (opts.nyRockets ? 'both' : 'eve') : (opts.nyRockets ? 'rockets' : ''); }

		// Szilveszter: egymás után a jelenlegi és a következő év; január 1-jén a rakétákból álló évszám.
		function startShow(now, mode) {
			var fontPx = clamp(Math.min(w * 0.3, h * 0.2), 42, 170);
			var text = mode === 'eve' ? String(opts.year + (show.eveIdx % 2)) : String(opts.year);
			var data = textPoints(text, fontPx);
			show.mode = mode;
			show.fontPx = fontPx;
			show.cx = w / 2;
			show.cy = mode === 'eve' ? 52 + fontPx * 0.65 : h * (opts.nyEve ? 0.56 : 0.36);
			show.parts = [];
			show.rockets = [];
			show.t0 = now;
			show.phase = 'form';

			var i, pts = data.pts, maxDelay = 0;
			if (mode === 'eve') {
				for (i = 0; i < pts.length; i++) {
					var a = rand(0, TAU), r = rand(0, fontPx * 1.3);
					show.parts.push({ tx: show.cx + pts[i].ox, ty: show.cy + pts[i].oy, sx: show.cx + Math.cos(a) * r, sy: show.cy + Math.sin(a) * r * 0.6, delay: rand(0, 0.7), dur: rand(0.9, 1.5), color: pick(SPARKLE_COLORS), core: pick(CORE_COLORS), ph: rand(0, TAU), size: rand(4, 7) });
				}
			} else {
				// minden rakéta az évszám egy függőleges szeletét robbantja ki
				var R = clamp(Math.round(data.w / 90), 5, 9), minX = -data.w / 2, sliceW = data.w / R;
				for (var k = 0; k < R; k++) {
					var bx = show.cx + minX + sliceW * (k + 0.5);
					var order = [0, 4, 2, 6, 1, 5, 3, 7, 8][k] || k;
					var launch = order * 0.28, fly = rand(1.0, 1.5);
					show.rockets.push({ x0: bx + rand(-50, 50), y0: h + 6, bx: bx, by: show.cy + rand(-6, 6), launch: launch, fly: fly, burst: false });
				}
				for (i = 0; i < pts.length; i++) {
					var kk = clamp(Math.floor((pts[i].ox - minX) / sliceW), 0, R - 1), rk = show.rockets[kk];
					show.parts.push({ tx: show.cx + pts[i].ox, ty: show.cy + pts[i].oy, sx: rk.bx + rand(-6, 6), sy: rk.by + rand(-6, 6), delay: rk.launch + rk.fly + rand(0, 0.12), dur: rand(0.8, 1.3), color: pick(SPARKLE_COLORS), core: pick(CORE_COLORS), ph: rand(0, TAU), size: rand(4, 7) });
				}
			}
			for (i = 0; i < show.parts.length; i++) { maxDelay = Math.max(maxDelay, show.parts[i].delay + show.parts[i].dur); }
			show.formEnd = maxDelay;
			show.holdFor = (mode === 'eve' ? 6.5 : 8.5) * (opts.quick ? 0.55 : 1);
		}

		function updateShow(now, dt) {
			var mode = showMode();
			if (!mode) { if (show.parts.length) { resetShow(); } sparks.length = 0; return; }
			var m = mode === 'both' ? (show.mode === 'rockets' ? 'eve' : 'rockets') : mode;

			if (show.phase === 'wait') {
				if (!show.until) { show.until = now + (opts.quick ? 900 : 1800); }
				if (now >= show.until) { startShow(now, mode === 'both' ? (show.nextBoth || 'eve') : mode); show.nextBoth = null; }
			}
			if (show.phase === 'wait') { drawSparks(dt); return; }

			var t = (now - show.t0) / 1000, tsec = now / 1000;
			if (show.phase === 'form' && t > show.formEnd) { show.phase = 'hold'; show.holdStart = t; }
			if (show.phase === 'hold' && t - show.holdStart > show.holdFor) { show.phase = 'fade'; show.fadeStart = t; }
			if (show.phase === 'fade' && t - show.fadeStart > 2.2) {
				var finished = show.mode;
				show.phase = 'wait';
				show.parts = [];
				show.idx++;
				if (finished === 'eve') { show.eveIdx++; }
				// szilveszter: a két évszám váltakozik, január 1-jén szünet után újra indul
				var gap = finished === 'eve' ? (show.eveIdx % 2 ? 0.4 : 3.5) : (opts.quick ? 4 : rand(14, 28));
				show.until = now + gap * 1000;
				if (mode === 'both') { show.nextBoth = finished === 'eve' ? 'rockets' : 'eve'; }
				drawSparks(dt);
				return;
			}

			// rakéták
			for (var r = 0; r < show.rockets.length; r++) {
				var rk = show.rockets[r], rt = t - rk.launch;
				if (rt < 0) { continue; }
				if (rt < rk.fly) {
					var f = ease(rt / rk.fly), x = rk.x0 + (rk.bx - rk.x0) * f, y = rk.y0 + (rk.by - rk.y0) * f;
					addSpark(x + rand(-1.5, 1.5), y + 4, rand(-18, 18), rand(20, 70), pick(SPARKLE_COLORS), rand(0.35, 0.7));
					addSpark(x + rand(-1.5, 1.5), y + 6, rand(-18, 18), rand(20, 70), '#ffb347', rand(0.25, 0.5));
					ctx.globalAlpha = 0.95;
					ctx.drawImage(glowSprite('#fff2b0'), x - 9, y - 9, 18, 18);
					ctx.globalAlpha = 1;
				} else if (!rk.burst) {
					rk.burst = true;
					for (var b = 0; b < 26; b++) {
						var ang = rand(0, TAU), sp = rand(40, 170);
						addSpark(rk.bx, rk.by, Math.cos(ang) * sp, Math.sin(ang) * sp, pick(SPARKLE_COLORS), rand(0.5, 1.1));
					}
				}
			}

			// csillogó részecskék
			for (var i = 0; i < show.parts.length; i++) {
				var p = show.parts[i], px, py, alpha = 1;
				var pt = (t - p.delay) / p.dur;
				if (pt <= 0) { continue; }
				if (show.phase === 'fade') {
					var ft = t - show.fadeStart;
					px = p.tx + Math.sin(i + ft * 2) * ft * 8;
					py = p.ty + ft * ft * 38 + ft * 10;
					alpha = clamp(1 - ft / 2.1, 0, 1);
				} else {
					var e = ease(pt);
					px = p.sx + (p.tx - p.sx) * e;
					py = p.sy + (p.ty - p.sy) * e;
				}
				var tw = 0.55 + 0.45 * Math.sin(tsec * 7 + p.ph);
				var size = p.size * (0.8 + 0.5 * tw);
				ctx.globalAlpha = alpha * (0.45 + 0.35 * tw);
				ctx.drawImage(glowSprite(p.color), px - size, py - size, size * 2, size * 2);
				ctx.globalAlpha = alpha;
				ctx.fillStyle = p.core;
				ctx.beginPath(); ctx.arc(px, py, 1.7 + 0.7 * tw, 0, TAU); ctx.fill();
				ctx.fillStyle = 'rgba(255,255,255,.9)';
				ctx.fillRect(px - 0.7, py - 0.7, 1.4, 1.4);
			}
			ctx.globalAlpha = 1;
			drawSparks(dt);
		}

		function drawSparks(dt) {
			for (var i = sparks.length - 1; i >= 0; i--) {
				var s = sparks[i];
				s.life -= dt;
				if (s.life <= 0) { sparks[i] = sparks[sparks.length - 1]; sparks.pop(); continue; }
				s.vy += 90 * dt;
				s.vx *= 1 - 0.8 * dt;
				s.x += s.vx * dt;
				s.y += s.vy * dt;
				ctx.globalAlpha = clamp(s.life / s.max, 0, 1);
				ctx.fillStyle = s.color;
				ctx.beginPath(); ctx.arc(s.x, s.y, 1.6, 0, TAU); ctx.fill();
			}
			ctx.globalAlpha = 1;
		}

		/* -- fő ciklus -- */

		function frame(now) {
			if (!running) { return; }
			raf = root.requestAnimationFrame(frame);
			if (!last) { last = now; nextEgg = now + (opts.quick ? 1200 : 2500); nextConfetti = now + 1200; }
			var dt = Math.min((now - last) / 1000, 0.05);
			last = now;
			var t = now / 1000;

			var cr = canvas.getBoundingClientRect();
			ox = cr.left; oy = cr.top;
			if (Math.abs(cr.width - w) > 0.5 || Math.abs(cr.height - h) > 0.5) { resize(); }
			if (w < 1 || h < 1) { return; }

			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, w, h);

			drawLights(t);
			drawItems(t);
			if (opts.eggs || opts.confetti) { refreshLedges(); }
			drawStreamers(t);
			updateEggs(now);
			updateBunny(now, dt);
			updateChick(now, dt);
			updateConfetti(now, dt);
			updateShow(now, dt);
		}

		function onScroll() {
			root.clearTimeout(scrollTimer);
			scrollTimer = root.setTimeout(scan, 150);
		}

		resize();
		root.addEventListener('scroll', onScroll, { passive: true });
		root.addEventListener('resize', onScroll);
		scan();
		scanTimer = root.setInterval(scan, 1500);
		raf = root.requestAnimationFrame(frame);

		return {
			update: function (next) {
				var layoutKeys = ['lights', 'lightsColor', 'tree', 'treeCorner', 'advent', 'adventCorner', 'hanukkah', 'hanukkahCorner', 'streamers', 'nyEve', 'nyRockets', 'year'];
				var before = layoutKeys.map(function (k) { return opts[k]; }).join('|');
				assign(opts, next);
				if (before !== layoutKeys.map(function (k) { return opts[k]; }).join('|')) { layout(); }
				if (!opts.eggs) { eggs.length = 0; }
				scan();
			},
			destroy: function () {
				running = false;
				root.cancelAnimationFrame(raf);
				root.clearInterval(scanTimer);
				root.clearTimeout(scrollTimer);
				root.removeEventListener('scroll', onScroll);
				root.removeEventListener('resize', onScroll);
				ctx.setTransform(1, 0, 0, 1, 0, 0);
				ctx.clearRect(0, 0, canvas.width, canvas.height);
			}
		};
	}

	root.SeasonDecorHolidays = { start: start };

	/* ---------- automatikus indítás a webhelyen ---------- */

	var cfg = root.SeasonDecorHolidaysConfig;
	if (cfg) {
		var boot = function () {
			var canvas = document.createElement('canvas');
			canvas.setAttribute('aria-hidden', 'true');
			canvas.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:99998';
			document.body.appendChild(canvas);
			start(canvas, {
				lights: !!cfg.lights, lightsColor: cfg.lightsColor,
				tree: !!cfg.tree, treeCorner: cfg.treeCorner,
				advent: +cfg.advent || 0, adventCorner: cfg.adventCorner,
				hanukkah: +cfg.hanukkah || 0, hanukkahCorner: cfg.hanukkahCorner,
				bunny: !!cfg.bunny, chick: !!cfg.chick, eggs: !!cfg.eggs,
				eggSelectors: cfg.eggSelectors,
				nyEve: !!cfg.nyEve, nyRockets: !!cfg.nyRockets, confetti: !!cfg.confetti, streamers: !!cfg.streamers,
				year: +cfg.year || new Date().getFullYear()
			});
		};
		if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
	}
})(window);
