/**
 * Season Decor – őszi hangulat motor.
 *
 * - hulló falevelek (egységes barna vagy az ősz színei)
 * - mozgás: egyenes, fuvallatok, himbálózás (külön kapcsolhatók)
 * - a levelek megállnak az elemeken, és a képernyő alján felhalmozódhatnak
 * - néha egy süni sétál át a képernyő alján, a rá hulló levelek a hátán maradnak
 *
 * A motor a webhelyen és az admin előnézetben is ugyanez.
 */
(function (root) {
	'use strict';

	var TAU = Math.PI * 2;
	var MAX_LEDGES = 120;
	var MAX_GROUND = 350;
	var HEAP_BUCKET = 10;

	var DEFAULTS = {
		leafColor: 'mixed',
		pile: true,
		pileSeconds: 60,
		stick: false,
		stickSelectors: '',
		stickRoot: null,
		pointerTarget: null,
		straight: true,
		gusts: true,
		sway: true,
		hedgehog: true
	};

	var PALETTES = {
		brown: ['#8b5a2b'],
		mixed: ['#8b5a2b', '#a9702f', '#c2842d', '#d6a21e', '#e3bd3c', '#9db46a', '#bccc8c']
	};

	function rand(a, b) { return a + Math.random() * (b - a); }
	function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
	function assign(t) {
		for (var i = 1; i < arguments.length; i++) {
			var s = arguments[i];
			if (s) { for (var k in s) { if (Object.prototype.hasOwnProperty.call(s, k)) { t[k] = s[k]; } } }
		}
		return t;
	}
	function shade(hex, f) {
		var n = parseInt(hex.slice(1), 16);
		var r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
		return 'rgb(' + r + ',' + g + ',' + b + ')';
	}

	/* ---------- levél sprite-ok ---------- */

	var SHAPES = ['maple', 'oak', 'simple'];

	function leafPath(c, shape, R) {
		var i;
		c.beginPath();
		if (shape === 'maple') {
			// ötkaréjos juharlevél
			var n = 20;
			for (i = 0; i <= n; i++) {
				var a = -Math.PI / 2 + (i / n) * TAU;
				var lobe = Math.abs(Math.cos(a * 2.5 + Math.PI / 2));
				var r = R * (0.42 + 0.58 * Math.pow(lobe, 0.55));
				var x = Math.cos(a) * r, y = Math.sin(a) * r;
				if (i === 0) { c.moveTo(x, y); } else { c.lineTo(x, y); }
			}
			c.closePath();
		} else if (shape === 'oak') {
			// hullámos szélű tölgylevél
			var steps = 18;
			for (i = 0; i <= steps; i++) {
				var t = i / steps, hw = R * 0.5 * Math.pow(Math.sin(Math.PI * t), 0.8) * (1 + 0.28 * Math.sin(t * 20));
				var yy = -R + t * 2 * R;
				if (i === 0) { c.moveTo(hw, yy); } else { c.lineTo(hw, yy); }
			}
			for (i = steps; i >= 0; i--) {
				var u = i / steps, hw2 = R * 0.5 * Math.pow(Math.sin(Math.PI * u), 0.8) * (1 + 0.28 * Math.sin(u * 20 + 1.5));
				c.lineTo(-hw2, -R + u * 2 * R);
			}
			c.closePath();
		} else {
			// egyszerű, hegyes végű levél
			c.moveTo(0, -R);
			c.bezierCurveTo(R * 0.85, -R * 0.45, R * 0.7, R * 0.55, 0, R);
			c.bezierCurveTo(-R * 0.7, R * 0.55, -R * 0.85, -R * 0.45, 0, -R);
			c.closePath();
		}
	}

	function makeLeafSprite(shape, color) {
		var s = 64, cv = document.createElement('canvas');
		cv.width = cv.height = s;
		var c = cv.getContext('2d'), R = s / 2 - 6;
		c.translate(s / 2, s / 2);
		leafPath(c, shape, R);
		c.fillStyle = color;
		c.fill();
		c.lineWidth = 1.5;
		c.lineJoin = 'round';
		c.strokeStyle = shade(color, 0.7);
		c.stroke();
		// főér és nyél
		c.beginPath();
		c.moveTo(0, -R * 0.85);
		c.lineTo(0, R + 4);
		c.lineWidth = 1.6;
		c.stroke();
		if (shape !== 'simple') {
			c.lineWidth = 1;
			c.beginPath();
			for (var k = -1; k <= 1; k += 2) {
				c.moveTo(0, -R * 0.1); c.lineTo(k * R * 0.55, -R * 0.45);
				c.moveTo(0, R * 0.2); c.lineTo(k * R * 0.4, -R * 0.05);
			}
			c.stroke();
		}
		return cv;
	}

	function buildSprites(mode) {
		var colors = PALETTES[mode] || PALETTES.mixed, out = [];
		SHAPES.forEach(function (sh) { colors.forEach(function (col) { out.push(makeLeafSprite(sh, col)); }); });
		return out;
	}

	/* ---------- süni ---------- */

	function drawHedgehog(c, bw, legT) {
		var rx = bw / 2, ry = bw * 0.31, i;
		// lábak
		c.fillStyle = '#b98f63';
		for (i = 0; i < 4; i++) {
			var lx = (i < 2 ? -0.42 : 0.38) * rx * 1.2 + (i % 2 ? 6 : -6) * bw / 90;
			var sw = Math.sin(legT + i * 1.6) * bw * 0.04;
			c.beginPath();
			c.ellipse(lx + sw, ry + bw * 0.02, bw * 0.055, bw * 0.045, 0, 0, TAU);
			c.fill();
		}
		// tüskék: két sorban a háton és a hátsó részen
		c.lineCap = 'round';
		for (var row = 0; row < 2; row++) {
			var rr = row ? 0.8 : 0.97;
			for (i = 0; i <= 30; i++) {
				var a = Math.PI * 0.1 + (i / 30) * Math.PI * 1.0;
				var px = Math.cos(a) * rx * rr, py = -Math.sin(a) * ry * rr;
				var nx = Math.cos(a), ny = -Math.sin(a), len = bw * (row ? 0.1 : 0.15) * (0.85 + 0.3 * ((i * 7) % 5) / 5);
				c.strokeStyle = (i + row) % 2 ? '#3d2818' : '#9a7a52';
				c.lineWidth = Math.max(1.4, bw * 0.03);
				c.beginPath();
				c.moveTo(px, py);
				c.lineTo(px + nx * len, py + ny * len);
				c.stroke();
			}
		}
		c.fillStyle = '#5b3d26';
		c.beginPath();
		c.ellipse(0, 0, rx * 0.97, ry * 0.97, 0, Math.PI * 0.95, Math.PI * 2.25);
		c.fill();
		c.beginPath();
		c.ellipse(-rx * 0.05, ry * 0.15, rx * 0.9, ry * 0.8, 0, 0, TAU);
		c.fill();
		// fej
		c.fillStyle = '#d8b48a';
		c.beginPath();
		c.ellipse(rx * 0.92, ry * 0.4, bw * 0.19, bw * 0.13, -0.12, 0, TAU);
		c.fill();
		c.beginPath();
		c.arc(rx * 0.74, ry * 0.05, bw * 0.045, 0, TAU);
		c.fill();
		c.fillStyle = '#1b1109';
		c.beginPath(); c.arc(rx * 1.1, ry * 0.43, bw * 0.032, 0, TAU); c.fill();
		c.beginPath(); c.arc(rx * 0.93, ry * 0.28, bw * 0.02, 0, TAU); c.fill();
	}

	/* ---------- fő motor ---------- */

	function start(canvas, options) {
		var opts = assign({}, DEFAULTS, options);
		var ctx = canvas.getContext('2d');
		var w = 0, h = 0, dpr = 1, ox = 0, oy = 0;
		var leaves = [], ledges = [];
		var sprites = buildSprites(opts.leafColor);
		var heap = [];
		var raf = 0, last = 0, running = true, spawnAcc = 0, scanTimer = 0, scrollTimer = 0;
		var gust = { next: 0, until: 0, start: 0, dir: 1, power: 0, v: 0 };
		var hh = { active: false, x: 0, dir: 1, nextAt: 0, legT: 0, bw: 60, riders: 0 };
		var pointer = { x: 0, y: 0, has: false };

		function resize() {
			var r = canvas.getBoundingClientRect();
			dpr = Math.min(root.devicePixelRatio || 1, 2);
			w = r.width; h = r.height;
			canvas.width = Math.max(1, Math.round(w * dpr));
			canvas.height = Math.max(1, Math.round(h * dpr));
			heap = [];
			for (var i = 0, n = Math.ceil(w / HEAP_BUCKET) + 2; i < n; i++) { heap.push(0); }
		}

		/* -- levelek -- */

		function swayChance() {
			if (!opts.sway) { return 0; }
			return opts.straight ? 0.35 : 1;
		}

		function resetLeaf(f, initial) {
			f.state = 'fall';
			f.size = rand(18, 36);
			f.sprite = sprites[(Math.random() * sprites.length) | 0];
			f.bx = rand(-20, w + 20);
			f.y = initial ? rand(-10, h) : -f.size - rand(0, 60);
			f.t = rand(0, 10);
			f.rot = rand(0, TAU);
			f.light = rand(0.6, 1.4);
			f.vx = rand(-8, 8);
			f.sticky = Math.random() < 0.6;
			f.ledge = null;
			if (Math.random() < swayChance()) {
				f.mode = 'sway';
				f.vy = rand(50, 82);
				f.sa = rand(34, 72);
				f.sf = rand(0.9, 1.6);
				f.ph = rand(0, TAU);
			} else {
				f.mode = 'straight';
				f.vy = rand(80, 125);
				f.sa = 0; f.sf = 0; f.ph = 0;
				f.rs = rand(-0.7, 0.7);
			}
			f.x = f.bx;
			return f;
		}

		function targetCount() {
			var n = clamp(w * h / 32000, 10, 45);
			return Math.round(w < 600 ? n * 0.7 : n);
		}

		function heapAt(x) { return heap[clamp(Math.floor(x / HEAP_BUCKET), 0, heap.length - 1)] || 0; }
		function heapAdd(x, v) {
			var i = clamp(Math.floor(x / HEAP_BUCKET), 0, heap.length - 1);
			heap[i] = Math.max(0, heap[i] + v);
		}

		function toGround(f, now) {
			var b = heapAt(f.x);
			f.state = 'ground';
			f.y = h - b - f.size * 0.12;
			f.rot = rand(0, TAU);
			f.inc = Math.min(f.size * 0.09, Math.max(0, 40 - b));
			heapAdd(f.x, f.inc);
			f.expire = now + opts.pileSeconds * 1000 * rand(0.8, 1.2);
			f.alpha = 1;
			var ground = 0;
			for (var i = 0; i < leaves.length; i++) { if (leaves[i].state === 'ground') { ground++; } }
			if (ground > MAX_GROUND) { dropOldestGround(); }
		}

		function dropOldestGround() {
			var oi = -1, ot = Infinity;
			for (var i = 0; i < leaves.length; i++) {
				if (leaves[i].state === 'ground' && leaves[i].expire < ot) { ot = leaves[i].expire; oi = i; }
			}
			if (oi >= 0) { removeLeaf(oi); }
		}

		function removeLeaf(i) {
			var f = leaves[i];
			if (f.state === 'ground') { heapAdd(f.x, -f.inc); }
			leaves[i] = leaves[leaves.length - 1];
			leaves.pop();
		}

		function release(f, kickX) {
			if (f.ledge) {
				var k = f.ledge.riders.indexOf(f);
				if (k >= 0) { f.ledge.riders.splice(k, 1); }
				f.ledge = null;
			}
			if (f.state === 'back') { hh.riders = Math.max(0, hh.riders - 1); }
			f.state = 'fall';
			f.sticky = false;
			f.bx = f.x - (f.mode === 'sway' ? Math.sin(f.t * f.sf + f.ph) * f.sa : 0);
			f.vx = (kickX || 0) + rand(-15, 15);
			f.vy = rand(10, 40);
		}

		/* -- hófedte, azaz levélfedte elemek -- */

		function isFixed(el) {
			for (var p = el; p && p.nodeType === 1; p = p.parentElement) {
				if (root.getComputedStyle(p).position === 'fixed') { return true; }
			}
			return false;
		}
		function pageTop(r, fixed) { return fixed ? r.top : r.top + (root.pageYOffset || 0); }
		function pageLeft(r, fixed) { return fixed ? r.left : r.left + (root.pageXOffset || 0); }

		function dropLedge(l, kick) {
			var riders = l.riders.slice();
			for (var i = 0; i < riders.length; i++) { release(riders[i], kick ? rand(-40, 40) : 0); }
			l.riders.length = 0;
		}

		function scan() {
			if (!opts.stick || !opts.stickSelectors) {
				ledges.forEach(function (l) { dropLedge(l, false); });
				ledges.length = 0;
				return;
			}
			var scope = opts.stickRoot || document, list, found = [], i;
			try { list = scope.querySelectorAll(opts.stickSelectors); } catch (e) { list = []; }
			var cr = canvas.getBoundingClientRect();
			for (i = 0; i < Math.min(list.length, 600); i++) { found.push(list[i]); }

			ledges = ledges.filter(function (l) {
				var ok = found.indexOf(l.el) !== -1 && document.documentElement.contains(l.el);
				if (!ok) { dropLedge(l, false); }
				return ok;
			});

			var known = ledges.map(function (l) { return l.el; });
			for (i = 0; i < found.length; i++) {
				var el = found[i];
				if (known.indexOf(el) !== -1 || el === canvas || el.contains(canvas)) { continue; }
				var r = el.getBoundingClientRect();
				if (r.width < 40 || r.height < 10) { continue; }
				var top = r.top - cr.top;
				if (top < -400 || top > cr.height + 400) { continue; }
				var cs = root.getComputedStyle(el);
				if (cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.1) { continue; }
				if (ledges.length >= MAX_LEDGES) {
					var idx = -1;
					for (var k = 0; k < ledges.length; k++) { if (!ledges[k].vis && !ledges[k].riders.length) { idx = k; break; } }
					if (idx === -1) { break; }
					ledges.splice(idx, 1);
				}
				var fixed = isFixed(el);
				ledges.push({ el: el, fixed: fixed, w: r.width, x: 0, y: 0, ax: pageLeft(r, fixed), ay: pageTop(r, fixed), vis: false, riders: [] });
			}
		}

		function refreshLedges() {
			for (var i = 0; i < ledges.length; i++) {
				var l = ledges[i], r = l.el.getBoundingClientRect();
				if (r.width < 1 || r.height < 1) { l.vis = false; continue; }
				var px = pageLeft(r, l.fixed), py = pageTop(r, l.fixed);
				if (Math.abs(r.width - l.w) > 6 || Math.abs(px - l.ax) > 4 || Math.abs(py - l.ay) > 4) {
					// az elem elmozdult vagy átméreteződött: a levelek lehullanak róla
					dropLedge(l, true);
					l.w = r.width; l.ax = px; l.ay = py;
				}
				l.x = r.left - ox;
				l.y = r.top - oy;
				l.vis = l.y > -40 && l.y < h + 2 && l.x < w && l.x + l.w > 0;
			}
		}

		/* -- fuvallatok -- */

		function updateGust(now, dt) {
			if (!opts.gusts) { gust.v = 0; gust.until = 0; return; }
			if (!gust.next) { gust.next = now + rand(3000, 7000); }
			if (!gust.until && now >= gust.next) {
				gust.start = now;
				gust.until = now + rand(1800, 3000);
				gust.dir = Math.random() < 0.5 ? -1 : 1;
				gust.power = rand(110, 230);
				// a fuvallat az elemeken megállt leveleket is elfújhatja
				for (var i = 0; i < leaves.length; i++) {
					if (leaves[i].state === 'rest' && Math.random() < 0.6) { release(leaves[i], gust.dir * gust.power * 0.5); }
				}
			}
			if (gust.until) {
				var p = (now - gust.start) / (gust.until - gust.start);
				if (p >= 1) { gust.until = 0; gust.v = 0; gust.next = now + rand(6000, 14000); }
				else { gust.v = gust.dir * gust.power * Math.sin(Math.PI * p); }
			}
		}

		/* -- süni -- */

		function updateHedgehog(now, dt) {
			if (!opts.hedgehog) {
				if (hh.active) { hh.active = false; releaseRiders(); }
				return;
			}
			hh.bw = clamp(w * 0.09, 56, 96);
			if (!hh.active) {
				if (!hh.nextAt) { hh.nextAt = now + 3500; }
				if (now >= hh.nextAt) {
					hh.active = true;
					hh.dir = Math.random() < 0.5 ? -1 : 1;
					hh.x = hh.dir > 0 ? -hh.bw : w + hh.bw;
					hh.speed = Math.max(18, w / 45);
					hh.riders = 0;
				}
				return;
			}
			hh.x += hh.dir * hh.speed * dt;
			hh.legT += dt * hh.speed * 0.2;
			if ((hh.dir > 0 && hh.x > w + hh.bw * 1.1) || (hh.dir < 0 && hh.x < -hh.bw * 1.1)) {
				hh.active = false;
				hh.nextAt = now + rand(12000, 30000);
				for (var i = leaves.length - 1; i >= 0; i--) { if (leaves[i].state === 'back') { removeLeaf(i); } }
				hh.riders = 0;
			}
		}

		function releaseRiders() {
			for (var i = 0; i < leaves.length; i++) { if (leaves[i].state === 'back') { release(leaves[i], 0); } }
			hh.riders = 0;
		}

		function hhGeometry() {
			var bw = hh.bw, ry = bw * 0.31, legs = bw * 0.07;
			return { bw: bw, rx: bw / 2, ry: ry, cy: h - legs - ry - bw * 0.02 + Math.sin(hh.legT * 2) * 0.8 };
		}
		// a tüskék felső íve a hedgehog helyi (előre néző) koordinátáiban
		function hhTop(g, lx) {
			var k = 1 - (lx / g.rx) * (lx / g.rx);
			return g.cy - (g.ry + g.bw * 0.07) * Math.sqrt(Math.max(0, k));
		}

		/* -- egér: az elemeken megállt levelek lesöpörhetők -- */

		function onPointer(e) {
			var x = e.clientX - ox, y = e.clientY - oy;
			var vx = pointer.has ? (x - pointer.x) * 30 : 0;
			pointer.x = x; pointer.y = y; pointer.has = true;
			for (var i = 0; i < leaves.length; i++) {
				var f = leaves[i];
				if (f.state === 'rest' && Math.abs(f.x - x) < 26 && Math.abs(f.y - y) < 26) { release(f, vx * 0.6); }
			}
		}

		/* -- rajzolás -- */

		function drawLeaf(f, flat) {
			var c = Math.cos(f.rot) * dpr, s = Math.sin(f.rot) * dpr, k = flat || 1;
			ctx.setTransform(c, s * k, -s, c * k, f.x * dpr, f.y * dpr);
			var sz = f.size;
			ctx.drawImage(f.sprite, -sz / 2, -sz / 2, sz, sz);
		}

		function frame(now) {
			if (!running) { return; }
			raf = root.requestAnimationFrame(frame);
			if (!last) { last = now; }
			var dt = Math.min((now - last) / 1000, 0.05);
			last = now;

			var cr = canvas.getBoundingClientRect();
			ox = cr.left; oy = cr.top;
			if (Math.abs(cr.width - w) > 0.5 || Math.abs(cr.height - h) > 0.5) { resize(); }
			if (w < 1 || h < 1) { return; }

			updateGust(now, dt);
			updateHedgehog(now, dt);
			if (opts.stick) { refreshLedges(); }

			var active = [], i;
			for (i = 0; i < ledges.length; i++) { if (ledges[i].vis) { active.push(ledges[i]); } }

			var falling = 0;
			for (i = 0; i < leaves.length; i++) { if (leaves[i].state === 'fall') { falling++; } }
			var target = targetCount();
			if (falling < target) {
				spawnAcc += dt * 3;
				while (spawnAcc >= 1 && falling < target) { spawnAcc -= 1; falling++; leaves.push(resetLeaf({}, false)); }
			} else { spawnAcc = 0; }

			var g = hh.active ? hhGeometry() : null;

			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, w, h);

			var f, a;
			// 1) a földön heverő levelek
			for (i = leaves.length - 1; i >= 0; i--) {
				f = leaves[i];
				if (f.state !== 'ground') { continue; }
				var left = f.expire - now;
				if (left < 0) { removeLeaf(i); continue; }
				ctx.globalAlpha = left < 3000 ? left / 3000 : 1;
				drawLeaf(f, 0.5);
			}
			ctx.globalAlpha = 1;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

			// 2) süni
			if (g) {
				ctx.save();
				ctx.setTransform(dpr * hh.dir, 0, 0, dpr, hh.x * dpr, g.cy * dpr);
				drawHedgehog(ctx, g.bw, hh.legT);
				ctx.restore();
				ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			}

			// 3) hulló, megálló és a süni hátán utazó levelek
			for (i = leaves.length - 1; i >= 0; i--) {
				f = leaves[i];
				if (f.state === 'ground') { continue; }

				if (f.state === 'rest') {
					var l = f.ledge;
					if (now >= f.restUntil) { release(f, rand(-20, 20)); }
					else { f.x = l.x + f.dx; f.y = l.y - f.size * 0.12; drawLeaf(f, 0.55); continue; }
				}
				if (f.state === 'back') {
					if (!g) { release(f, 0); }
					else {
						f.x = hh.x + hh.dir * f.lx;
						f.y = hhTop(g, f.lx) + f.dy;
						drawLeaf(f, 0.85);
						continue;
					}
				}

				var prevY = f.y;
				f.t += dt;
				f.y += f.vy * dt;
				f.bx += (f.vx + gust.v * f.light) * dt;
				if (f.bx < -40) { f.bx += w + 80; } else if (f.bx > w + 40) { f.bx -= w + 80; }
				if (f.mode === 'sway') {
					var ph = f.t * f.sf + f.ph;
					f.x = f.bx + Math.sin(ph) * f.sa;
					f.rot = Math.sin(ph + 1.2) * 0.75 + (gust.v * 0.004);
				} else {
					f.x = f.bx;
					f.rot += (f.rs + gust.v * 0.012) * dt;
				}

				var done = false;
				// a süni hátán megáll
				if (g && f.vy > 0 && hh.riders < 14) {
					var lx = (f.x - hh.x) * hh.dir;
					if (lx > -g.rx * 0.9 && lx < g.rx * 0.5) {
						var top = hhTop(g, lx);
						if (prevY < top && f.y >= top) {
							f.state = 'back'; f.lx = lx; f.dy = rand(-3, 3) - f.size * 0.1; f.rot = rand(-0.8, 0.8);
							hh.riders++;
							done = true;
						}
					}
				}
				// elemeken megáll
				if (!done && f.sticky && active.length) {
					for (a = 0; a < active.length; a++) {
						var lg = active[a];
						if (lg.riders.length < 5 && prevY <= lg.y && f.y >= lg.y && f.x >= lg.x + 4 && f.x <= lg.x + lg.w - 4) {
							f.state = 'rest'; f.ledge = lg; f.dx = f.x - lg.x; f.restUntil = now + rand(5000, 14000); f.rot = rand(-0.9, 0.9);
							lg.riders.push(f);
							done = true;
							break;
						}
					}
				}
				if (done) { drawLeaf(f, f.state === 'back' ? 0.85 : 0.55); continue; }

				// leért az aljára
				if (f.y >= h - heapAt(f.x) - f.size * 0.2 && f.vy > 0) {
					if (opts.pile) { toGround(f, now); drawLeaf(f, 0.5); continue; }
					if (f.y > h + f.size) {
						if (falling > target) { removeLeaf(i); continue; }
						resetLeaf(f, false);
					}
				}
				drawLeaf(f);
			}
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		}

		function onScroll() {
			root.clearTimeout(scrollTimer);
			scrollTimer = root.setTimeout(scan, 150);
		}

		/* -- indítás -- */

		resize();
		var ptTarget = opts.pointerTarget || root;
		ptTarget.addEventListener('pointermove', onPointer, { passive: true });
		root.addEventListener('scroll', onScroll, { passive: true });
		root.addEventListener('resize', onScroll);

		for (var n = 0, init = Math.round(targetCount() * 0.8); n < init; n++) { leaves.push(resetLeaf({}, true)); }
		scan();
		scanTimer = root.setInterval(scan, 1500);
		raf = root.requestAnimationFrame(frame);

		return {
			update: function (next) {
				var colorChanged = next.leafColor && next.leafColor !== opts.leafColor;
				var wasPile = opts.pile;
				assign(opts, next);
				if (colorChanged) {
					sprites = buildSprites(opts.leafColor);
					for (var i = 0; i < leaves.length; i++) { leaves[i].sprite = sprites[(Math.random() * sprites.length) | 0]; }
				}
				if (wasPile && !opts.pile) {
					for (var j = leaves.length - 1; j >= 0; j--) { if (leaves[j].state === 'ground') { removeLeaf(j); } }
				}
				scan();
			},
			destroy: function () {
				running = false;
				root.cancelAnimationFrame(raf);
				root.clearInterval(scanTimer);
				root.clearTimeout(scrollTimer);
				ptTarget.removeEventListener('pointermove', onPointer);
				root.removeEventListener('scroll', onScroll);
				root.removeEventListener('resize', onScroll);
				ctx.setTransform(1, 0, 0, 1, 0, 0);
				ctx.clearRect(0, 0, canvas.width, canvas.height);
			}
		};
	}

	root.SeasonDecorAutumn = { start: start };

	/* ---------- automatikus indítás a webhelyen ---------- */

	var cfg = root.SeasonDecorAutumnConfig;
	if (cfg) {
		var boot = function () {
			if (root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
			var canvas = document.createElement('canvas');
			canvas.setAttribute('aria-hidden', 'true');
			canvas.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:99999';
			document.body.appendChild(canvas);
			start(canvas, {
				leafColor: cfg.leafColor,
				pile: !!cfg.pile,
				pileSeconds: cfg.pileSeconds,
				stick: !!cfg.stick,
				stickSelectors: cfg.stickSelectors,
				straight: !!cfg.straight,
				gusts: !!cfg.gusts,
				sway: !!cfg.sway,
				hedgehog: !!cfg.hedgehog
			});
		};
		if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
	}
})(window);
