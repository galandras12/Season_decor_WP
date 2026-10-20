/**
 * Season Decor – téli hangulat motor.
 *
 * - hóesés (egyedi vektoros hópehely / pixel / gömb)
 * - ráragadó hó az elemek tetején, egérrel elsöpörhető
 * - zúzmara, ha a látogató sokáig nem görget
 *
 * A motor a webhelyen és az admin előnézetben is ugyanez.
 */
(function (root) {
	'use strict';

	var TAU = Math.PI * 2;
	var SPEED = { slow: 0.55, medium: 1, fast: 1.9 };
	var INTENSITY = { low: 0.4, medium: 1, high: 2 };
	var BUCKET = 4; // a hófedte elemek hóréteg-felbontása (px)
	var MAX_LEDGES = 120;
	var MAX_BITS = 320;

	var DEFAULTS = {
		type: 'snowflake',
		speed: 'medium',
		intensity: 'medium',
		randomAlpha: false,
		stick: false,
		stickSelectors: '',
		stickRoot: null,
		pointerTarget: null,
		maxFlakes: 260
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

	/* ---------- sprite-ok ---------- */

	// Minden hópehely egyedi: véletlenszerű, hatszoros szimmetriájú ágrajz.
	function drawSnowflake(canvas) {
		var s = canvas.width, c = canvas.getContext('2d'), k = s / 64;
		c.setTransform(1, 0, 0, 1, 0, 0);
		c.clearRect(0, 0, s, s);

		var R = s / 2 - 4 * k;
		var arm = rand(0.82, 1) * R;
		var branches = [], n = 2 + ((Math.random() * 3) | 0), i;
		for (i = 0; i < n; i++) {
			branches.push({ t: rand(0.22, 0.88), len: rand(0.16, 0.36) * R, ang: rand(0.5, 1.05), fork: Math.random() < 0.35 });
		}
		var hex = Math.random() < 0.45 ? rand(0.14, 0.26) * R : 0;
		var tip = Math.random() < 0.5 ? rand(0.12, 0.22) * R : 0;

		c.translate(s / 2, s / 2);
		c.lineCap = 'round';
		c.lineJoin = 'round';
		c.strokeStyle = '#ffffff';
		c.shadowColor = 'rgba(70,120,185,.95)';
		c.shadowBlur = 2.2 * k;

		c.lineWidth = rand(1.7, 2.7) * k;
		c.beginPath();
		for (i = 0; i < 6; i++) {
			c.save();
			c.rotate(i * TAU / 6);
			c.moveTo(0, 0);
			c.lineTo(0, -arm);
			if (tip) {
				c.moveTo(-tip * 0.7, -arm - tip * 0.5);
				c.lineTo(0, -arm);
				c.lineTo(tip * 0.7, -arm - tip * 0.5);
			}
			c.restore();
		}
		c.stroke();

		c.lineWidth *= 0.75;
		c.beginPath();
		for (i = 0; i < 6; i++) {
			c.save();
			c.rotate(i * TAU / 6);
			for (var j = 0; j < branches.length; j++) {
				var b = branches[j], by = -b.t * arm;
				for (var side = -1; side <= 1; side += 2) {
					var ex = side * Math.sin(b.ang) * b.len, ey = by - Math.cos(b.ang) * b.len;
					c.moveTo(0, by);
					c.lineTo(ex, ey);
					if (b.fork) {
						var mx = ex * 0.55, my = by + (ey - by) * 0.55;
						c.moveTo(mx, my);
						c.lineTo(mx + side * b.len * 0.28, my - b.len * 0.22);
					}
				}
			}
			c.restore();
		}
		if (hex) {
			for (i = 0; i <= 6; i++) {
				var a = i * TAU / 6;
				if (i === 0) { c.moveTo(Math.sin(a) * hex, -Math.cos(a) * hex); } else { c.lineTo(Math.sin(a) * hex, -Math.cos(a) * hex); }
			}
		}
		c.stroke();
	}

	function makeBallSprite() {
		var s = 32, cv = document.createElement('canvas');
		cv.width = cv.height = s;
		var c = cv.getContext('2d');
		var g = c.createRadialGradient(12, 11, 1, 16, 16, 14);
		g.addColorStop(0, '#ffffff');
		g.addColorStop(0.65, '#f3f8ff');
		g.addColorStop(1, '#bcd4ee');
		c.fillStyle = g;
		c.beginPath();
		c.arc(16, 16, 14, 0, TAU);
		c.fill();
		return cv;
	}

	/* ---------- hóesés ---------- */

	function start(canvas, options) {
		var opts = assign({}, DEFAULTS, options);
		var ctx = canvas.getContext('2d');
		var w = 0, h = 0, dpr = 1, ox = 0, oy = 0;
		var flakes = [], bits = [], ledges = [];
		var ball = makeBallSprite();
		var raf = 0, last = 0, t0 = 0, spawnAcc = 0, relaxAcc = 0, running = true;
		var pointer = { x: 0, y: 0, has: false };
		var scanTimer = 0, scrollTimer = 0;

		function resize() {
			var r = canvas.getBoundingClientRect();
			dpr = Math.min(root.devicePixelRatio || 1, 2);
			w = r.width; h = r.height;
			canvas.width = Math.max(1, Math.round(w * dpr));
			canvas.height = Math.max(1, Math.round(h * dpr));
		}

		/* -- részecskék -- */

		function resetFlake(f, initial) {
			var type = opts.type;
			if (type === 'pixel') { f.size = [2, 3, 3, 4, 5, 6][(Math.random() * 6) | 0]; }
			else if (type === 'ball') { f.size = 2.5 + Math.pow(Math.random(), 1.8) * 6; }
			else { f.size = 7 + Math.pow(Math.random(), 2.2) * 15; }

			var depth = type === 'pixel' ? (f.size - 2) / 4 : (type === 'ball' ? (f.size - 2.5) / 6 : (f.size - 7) / 15);
			f.depth = clamp(depth, 0, 1);
			f.bx = rand(-20, w + 20);
			f.y = initial ? rand(-10, h) : -f.size - rand(0, 40);
			f.vy = 34 + f.depth * 48 + rand(0, 14);
			f.vx = rand(-6, 6);
			f.sa = rand(6, 26);
			f.sf = rand(0.5, 1.5);
			f.ph = rand(0, TAU);
			f.t = 0;
			f.rot = rand(0, TAU);
			f.rs = rand(-1, 1) * 0.9;
			f.alpha = opts.randomAlpha ? rand(0.25, 1) : 0.92;
			f.sticky = Math.random() < 0.75;
			if (type === 'snowflake') {
				if (!f.sprite) { f.sprite = document.createElement('canvas'); f.sprite.width = f.sprite.height = 48; }
				drawSnowflake(f.sprite);
			} else {
				f.sprite = null;
			}
			f.x = f.bx;
			return f;
		}

		function targetCount(now) {
			var base = clamp(w * h / 14000, 24, 130);
			if (w < 600) { base *= 0.6; }
			var m;
			if (opts.intensity === 'varying') {
				var ph = (Math.sin((now - t0) / 1000 / 60 * TAU - 1.3) + 1) / 2;
				m = INTENSITY.low + (INTENSITY.high - INTENSITY.low) * ph;
			} else {
				m = INTENSITY[opts.intensity] || 1;
			}
			return Math.min(opts.maxFlakes, Math.round(base * m));
		}

		function addBit(x, y, vx, vy, size) {
			if (bits.length >= MAX_BITS) { return; }
			bits.push({ x: x, y: y, vx: vx, vy: vy, r: size, life: 1 });
		}

		/* -- hófedte elemek -- */

		function isFixed(el) {
			for (var p = el; p && p.nodeType === 1; p = p.parentElement) {
				if (root.getComputedStyle(p).position === 'fixed') { return true; }
			}
			return false;
		}

		function pageTop(r, fixed) { return fixed ? r.top : r.top + (root.pageYOffset || 0); }
		function pageLeft(r, fixed) { return fixed ? r.left : r.left + (root.pageXOffset || 0); }

		function scan() {
			if (!opts.stick || !opts.stickSelectors) { ledges.length = 0; return; }
			var scope = opts.stickRoot || document, list, found = [];
			try { list = scope.querySelectorAll(opts.stickSelectors); } catch (e) { list = []; }
			var cr = canvas.getBoundingClientRect();
			var max = Math.min(list.length, 600), i;
			for (i = 0; i < max; i++) { found.push(list[i]); }

			// ami már nem létezik / nem illik a szelektorra, az eltűnik
			ledges = ledges.filter(function (l) { return found.indexOf(l.el) !== -1 && document.documentElement.contains(l.el); });

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
					for (var k = 0; k < ledges.length; k++) { if (!ledges[k].vis && !ledges[k].has) { idx = k; break; } }
					if (idx === -1) { break; }
					ledges.splice(idx, 1);
				}
				var fixed = isFixed(el);
				ledges.push(makeLedge(el, r, fixed));
			}
		}

		function makeLedge(el, r, fixed) {
			var n = Math.max(2, Math.ceil(r.width / BUCKET));
			return {
				el: el, fixed: fixed, n: n, w: r.width,
				heap: new Float32Array(n), maxH: clamp(r.width * 0.045, 4, 12),
				x: 0, y: 0, ax: pageLeft(r, fixed), ay: pageTop(r, fixed), vis: false, has: false
			};
		}

		function shed(l) {
			if (l.has) {
				for (var i = 0; i < l.n; i += 2) {
					if (l.heap[i] > 0.8) {
						addBit(l.x + (i + 0.5) * BUCKET, l.y - l.heap[i], rand(-25, 25), rand(-10, 25), rand(1.5, 3.2));
					}
				}
			}
			l.heap.fill(0);
			l.has = false;
		}

		function cap(l, i) {
			var t = l.n > 1 ? i / (l.n - 1) : 0.5;
			return l.maxH * Math.sqrt(Math.min(1, Math.min(t, 1 - t) / 0.06));
		}

		function refreshLedges() {
			for (var i = 0; i < ledges.length; i++) {
				var l = ledges[i], r = l.el.getBoundingClientRect();
				if (r.width < 1 || r.height < 1) { l.vis = false; continue; }

				var px = pageLeft(r, l.fixed), py = pageTop(r, l.fixed);
				if (Math.abs(r.width - l.w) > 6) {
					// az elem mérete változott: újraszámoljuk a hóréteget
					shed(l);
					l.w = r.width; l.n = Math.max(2, Math.ceil(r.width / BUCKET));
					l.heap = new Float32Array(l.n);
					l.maxH = clamp(r.width * 0.045, 4, 12);
					l.ax = px; l.ay = py;
				} else if (Math.abs(px - l.ax) > 4 || Math.abs(py - l.ay) > 4) {
					// az elem elmozdult (animáció): a hó lehullik róla
					l.x = r.left - ox; l.y = r.top - oy;
					shed(l);
					l.ax = px; l.ay = py;
				}
				l.x = r.left - ox;
				l.y = r.top - oy;
				l.vis = l.y > -l.maxH - 2 && l.y < h + 2 && l.x < w && l.x + l.w > 0;
			}
		}

		function land(l, f) {
			var i = Math.floor((f.x - l.x) / BUCKET);
			var amt = l.maxH * (0.1 + f.depth * 0.1);
			var wts = [0.25, 0.6, 1, 0.6, 0.25];
			for (var d = -2; d <= 2; d++) {
				var j = i + d;
				if (j < 0 || j >= l.n) { continue; }
				l.heap[j] = Math.min(cap(l, j), l.heap[j] + amt * wts[d + 2]);
			}
			l.has = true;
		}

		function relax(l) {
			var a = l.heap, prev = a[0], cur, i;
			for (i = 1; i < l.n - 1; i++) {
				cur = a[i];
				a[i] = (prev + 2 * cur + a[i + 1]) / 4;
				prev = cur;
			}
		}

		function sweep(x, y, vx) {
			for (var i = 0; i < ledges.length; i++) {
				var l = ledges[i];
				if (!l.vis || !l.has) { continue; }
				if (x < l.x - 10 || x > l.x + l.w + 10 || y < l.y - l.maxH - 30 || y > l.y + 14) { continue; }
				var c = Math.floor((x - l.x) / BUCKET), rad = 7, any = false;
				for (var j = Math.max(0, c - rad); j <= Math.min(l.n - 1, c + rad); j++) {
					var hv = l.heap[j];
					if (hv > 0.3) {
						if (Math.random() < 0.6) {
							addBit(l.x + (j + 0.5) * BUCKET, l.y - hv, vx * 0.5 + rand(-40, 40), -rand(20, 90), rand(1.4, 3.4));
						}
						l.heap[j] = hv * 0.15;
					}
					if (l.heap[j] > 0.3) { any = true; }
				}
				if (!any) {
					l.has = false;
					for (var q = 0; q < l.n; q++) { if (l.heap[q] > 0.3) { l.has = true; break; } }
				}
			}
		}

		function onPointer(e) {
			var x = e.clientX - ox, y = e.clientY - oy;
			var vx = pointer.has ? (x - pointer.x) * 30 : 0;
			pointer.x = x; pointer.y = y; pointer.has = true;
			if (ledges.length) { sweep(x, y, vx); }
		}

		/* -- rajzolás -- */

		function drawLedges() {
			ctx.save();
			ctx.fillStyle = '#ffffff';
			ctx.shadowColor = 'rgba(70,115,170,.55)';
			ctx.shadowBlur = 3;
			ctx.shadowOffsetY = -0.5;
			for (var i = 0; i < ledges.length; i++) {
				var l = ledges[i];
				if (!l.vis || !l.has) { continue; }
				var y0 = l.y + 1;
				ctx.beginPath();
				ctx.moveTo(l.x, y0);
				for (var j = 0; j < l.n; j++) {
					ctx.lineTo(l.x + (j + 0.5) * BUCKET, y0 - l.heap[j]);
				}
				ctx.lineTo(l.x + l.w, y0);
				ctx.closePath();
				ctx.fill();
			}
			ctx.restore();
		}

		function drawFlake(f) {
			var s = f.size, x = f.x, y = f.y;
			ctx.globalAlpha = f.alpha;
			if (opts.type === 'snowflake') {
				var c = Math.cos(f.rot) * dpr, sn = Math.sin(f.rot) * dpr;
				ctx.setTransform(c, sn, -sn, c, x * dpr, y * dpr);
				ctx.drawImage(f.sprite, -s / 2, -s / 2, s, s);
				ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			} else if (opts.type === 'pixel') {
				var rx = Math.round(x), ry = Math.round(y);
				ctx.fillStyle = 'rgba(90,135,190,.45)';
				ctx.fillRect(rx - 1, ry - 1, s + 2, s + 2);
				ctx.fillStyle = '#ffffff';
				ctx.fillRect(rx, ry, s, s);
			} else {
				ctx.drawImage(ball, x - s / 2, y - s / 2, s, s);
			}
		}

		/* -- fő ciklus -- */

		function frame(now) {
			if (!running) { return; }
			raf = root.requestAnimationFrame(frame);
			if (!last) { last = now; t0 = now; }
			var dt = Math.min((now - last) / 1000, 0.05);
			last = now;

			var cr = canvas.getBoundingClientRect();
			ox = cr.left; oy = cr.top;
			if (Math.abs(cr.width - w) > 0.5 || Math.abs(cr.height - h) > 0.5) { resize(); }
			if (w < 1 || h < 1) { return; }

			var speed = SPEED[opts.speed] || 1;
			var wind = Math.sin(now / 9000) * 10 + Math.sin(now / 3100) * 4;
			var target = targetCount(now);

			// több részecske kell: fokozatosan adagoljuk, hogy ne ugorjon be egyszerre
			if (flakes.length < target) {
				spawnAcc += dt * 45;
				while (spawnAcc >= 1 && flakes.length < target) {
					spawnAcc -= 1;
					flakes.push(resetFlake({}, false));
				}
			} else { spawnAcc = 0; }

			if (opts.stick) { refreshLedges(); }
			var active = [];
			for (var li = 0; li < ledges.length; li++) { if (ledges[li].vis) { active.push(ledges[li]); } }

			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, w, h);

			var i, f;
			for (i = flakes.length - 1; i >= 0; i--) {
				f = flakes[i];
				var prevY = f.y;
				f.t += dt;
				f.y += f.vy * speed * dt;
				f.bx += (f.vx + wind * (0.4 + f.depth)) * dt;
				if (f.bx < -30) { f.bx += w + 60; } else if (f.bx > w + 30) { f.bx -= w + 60; }
				f.x = f.bx + Math.sin(f.t * f.sf + f.ph) * f.sa;
				f.rot += f.rs * dt;

				var gone = f.y > h + f.size;
				if (!gone && f.sticky && active.length) {
					for (var a = 0; a < active.length; a++) {
						var l = active[a];
						if (prevY <= l.y && f.y >= l.y && f.x >= l.x + 3 && f.x <= l.x + l.w - 3) {
							land(l, f);
							gone = true;
							break;
						}
					}
				}
				if (gone) {
					if (flakes.length > target) { flakes[i] = flakes[flakes.length - 1]; flakes.pop(); continue; }
					resetFlake(f, false);
				}
				drawFlake(f);
			}
			ctx.globalAlpha = 1;

			if (opts.stick) {
				relaxAcc += dt;
				if (relaxAcc > 0.5) {
					relaxAcc = 0;
					for (i = 0; i < active.length; i++) { if (active[i].has) { relax(active[i]); } }
				}
				drawLedges();
			}

			// leeső / szétszálló hódarabkák
			ctx.fillStyle = '#ffffff';
			for (i = bits.length - 1; i >= 0; i--) {
				var b = bits[i];
				b.life -= dt * 0.8;
				if (b.life <= 0 || b.y > h + 10) { bits[i] = bits[bits.length - 1]; bits.pop(); continue; }
				b.vy += 260 * dt;
				b.vx *= 1 - 1.4 * dt;
				b.x += b.vx * dt;
				b.y += b.vy * dt;
				ctx.globalAlpha = clamp(b.life * 1.4, 0, 1);
				ctx.beginPath();
				ctx.arc(b.x, b.y, b.r, 0, TAU);
				ctx.fill();
			}
			ctx.globalAlpha = 1;
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

		var init = Math.round(targetCount(performance.now()) * 0.7);
		for (var n = 0; n < init; n++) { flakes.push(resetFlake({}, true)); }
		scan();
		scanTimer = root.setInterval(scan, 1500);
		raf = root.requestAnimationFrame(frame);

		return {
			update: function (next) {
				var typeChanged = next.type && next.type !== opts.type;
				var alphaChanged = next.randomAlpha !== undefined && next.randomAlpha !== opts.randomAlpha;
				assign(opts, next);
				if (typeChanged) {
					flakes = [];
					for (var q = 0, c = Math.round(targetCount(performance.now()) * 0.7); q < c; q++) { flakes.push(resetFlake({}, true)); }
				} else if (alphaChanged) {
					for (var z = 0; z < flakes.length; z++) { flakes[z].alpha = opts.randomAlpha ? rand(0.25, 1) : 0.92; }
				}
				if (!opts.stick) { ledges.forEach(shed); }
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

	/* ---------- zúzmara ---------- */

	function startFrost(options) {
		var delay = Math.max(5, +options.delay || 30);
		var GROW = 45; // ennyi másodperc alatt ér a teljes zúzmara
		var canvas = document.createElement('canvas');
		var ctx = canvas.getContext('2d');
		var tex = null, W = 0, H = 0, level = 0, shown = -1;
		var idleSince = performance.now(), timer = 0, resizeTimer = 0;

		canvas.setAttribute('aria-hidden', 'true');
		canvas.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:99998;opacity:0;transition:opacity .4s';
		document.body.appendChild(canvas);

		function fern(c, x, y, a, len, depth) {
			var x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
			c.moveTo(x, y);
			c.lineTo(x2, y2);
			if (depth <= 0) { return; }
			for (var k = 1; k <= 3; k++) {
				var t = k / 4 + rand(-0.04, 0.04), bx = x + (x2 - x) * t, by = y + (y2 - y) * t, l = len * 0.42 * (1 - t * 0.3);
				fern(c, bx, by, a + rand(0.7, 1.1), l, depth - 1);
				fern(c, bx, by, a - rand(0.7, 1.1), l, depth - 1);
			}
			fern(c, x2, y2, a + rand(-0.15, 0.15), len * 0.55, depth - 1);
		}

		function buildTexture() {
			var tw = Math.ceil(W / 2), th = Math.ceil(H / 2);
			tex = document.createElement('canvas');
			tex.width = tw; tex.height = th;
			var c = tex.getContext('2d'), i;
			var maxR = Math.hypot(tw, th) / 2;

			var g = c.createRadialGradient(tw / 2, th / 2, 0, tw / 2, th / 2, maxR);
			g.addColorStop(0, 'rgba(235,246,255,0)');
			g.addColorStop(0.55, 'rgba(225,240,255,.12)');
			g.addColorStop(1, 'rgba(205,228,250,.6)');
			c.fillStyle = g;
			c.fillRect(0, 0, tw, th);

			// jégszemcsék a szélek felé sűrűsödve
			c.fillStyle = '#fff';
			for (i = 0; i < 1400; i++) {
				var x = Math.random() * tw, y = Math.random() * th;
				var e = Math.min(x, tw - x, y, th - y) / Math.min(tw, th);
				if (Math.random() < 0.9 - e * 2.2) {
					c.globalAlpha = rand(0.05, 0.22);
					c.beginPath();
					c.arc(x, y, rand(0.5, 2), 0, TAU);
					c.fill();
				}
			}
			c.globalAlpha = 1;

			// jégvirág-kristályok a szélekről befelé nőve
			var count = Math.round((tw + th) / 16);
			c.lineCap = 'round';
			c.strokeStyle = 'rgba(255,255,255,.6)';
			c.shadowColor = 'rgba(120,170,225,.9)';
			c.shadowBlur = 2;
			c.lineWidth = 1;
			c.beginPath();
			for (i = 0; i < count; i++) {
				var side = (Math.random() * 4) | 0, sx, sy, ang;
				if (side === 0) { sx = rand(0, tw); sy = 0; ang = Math.PI / 2; }
				else if (side === 1) { sx = rand(0, tw); sy = th; ang = -Math.PI / 2; }
				else if (side === 2) { sx = 0; sy = rand(0, th); ang = 0; }
				else { sx = tw; sy = rand(0, th); ang = Math.PI; }
				fern(c, sx, sy, ang + rand(-0.5, 0.5), rand(40, 130), 3);
			}
			c.stroke();
		}

		function render() {
			if (Math.abs(level - shown) < 0.004) { return; }
			shown = level;
			canvas.style.opacity = level > 0.001 ? '1' : '0';
			if (level <= 0.001) { return; }
			if (!tex) { buildTexture(); }

			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.globalCompositeOperation = 'source-over';
			ctx.clearRect(0, 0, W, H);
			ctx.drawImage(tex, 0, 0, W, H);

			var maxR = Math.hypot(W, H) / 2;
			var ri = maxR * (0.95 - 0.55 * level), ro = maxR * (1.03 - 0.15 * level);
			var g = ctx.createRadialGradient(W / 2, H / 2, ri, W / 2, H / 2, ro);
			g.addColorStop(0, 'rgba(0,0,0,0)');
			g.addColorStop(1, 'rgba(0,0,0,1)');
			ctx.globalCompositeOperation = 'destination-in';
			ctx.fillStyle = g;
			ctx.fillRect(0, 0, W, H);
			ctx.globalCompositeOperation = 'source-over';
		}

		function size() {
			W = canvas.width = Math.max(1, root.innerWidth);
			H = canvas.height = Math.max(1, root.innerHeight);
			tex = null;
			shown = -1;
			render();
		}

		function activity() { idleSince = performance.now(); }

		function tick() {
			if (document.hidden) { return; }
			var idle = (performance.now() - idleSince) / 1000;
			var target = clamp((idle - delay) / GROW, 0, 1);
			if (target > level) { level = target; }
			else if (level > target) { level = Math.max(target, level - 0.07); } // gyorsan elolvad
			render();
		}

		var events = ['scroll', 'wheel', 'keydown', 'touchstart', 'touchmove', 'pointerdown'];
		events.forEach(function (ev) { root.addEventListener(ev, activity, { passive: true }); });
		function onResize() { root.clearTimeout(resizeTimer); resizeTimer = root.setTimeout(size, 300); }
		root.addEventListener('resize', onResize);
		document.addEventListener('visibilitychange', activity);
		size();
		timer = root.setInterval(tick, 120);

		return {
			destroy: function () {
				root.clearInterval(timer);
				events.forEach(function (ev) { root.removeEventListener(ev, activity); });
				root.removeEventListener('resize', onResize);
				document.removeEventListener('visibilitychange', activity);
				if (canvas.parentNode) { canvas.parentNode.removeChild(canvas); }
			}
		};
	}

	root.SeasonDecorWinter = { start: start, startFrost: startFrost };

	/* ---------- automatikus indítás a webhelyen ---------- */

	var cfg = root.SeasonDecorWinterConfig;
	if (cfg) {
		var boot = function () {
			if (root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }

			var canvas = document.createElement('canvas');
			canvas.setAttribute('aria-hidden', 'true');
			canvas.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:99999';
			document.body.appendChild(canvas);

			start(canvas, {
				type: cfg.type,
				speed: cfg.speed,
				intensity: cfg.intensity,
				randomAlpha: !!cfg.randomAlpha,
				stick: !!cfg.stick,
				stickSelectors: cfg.stickSelectors
			});
			if (cfg.frost) { startFrost({ delay: cfg.frostDelay }); }
		};
		if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
	}
})(window);
