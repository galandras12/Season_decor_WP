/**
 * Season Decor – tavaszi hangulat motor.
 *
 * - apró fehér / rózsaszín virágok nyílnak véletlenszerű elemeken, majd elhervadnak
 * - ha az oldal sokáig mozdulatlan, a két szélén lentről felfelé kizöldül (levelek, rózsaszín virágok)
 * - apró fűszálak nőnek a weboldal alján, idővel beterítik az egész alját
 *
 * A motor a webhelyen és az admin előnézetben is ugyanez.
 */
(function (root) {
	'use strict';

	var TAU = Math.PI * 2;
	var MAX_LEDGES = 80;
	var GRASS_COLORS = ['#3f9a3a', '#5cb844', '#86cf56'];
	var STORE_KEY = 'season_decor_spring_grass';

	var DEFAULTS = {
		flowers: true,
		flowerColor: 'mixed',
		flowerSelectors: '',
		flowerRoot: null,
		maxFlowers: 10,
		grow: true,
		growDelay: 30,
		growSeconds: 70,
		grass: true,
		grassSeconds: 90,
		persist: false
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

	function drawLeaf(c, x, y, ang, size, color) {
		c.save();
		c.translate(x, y);
		c.rotate(ang);
		c.fillStyle = color;
		c.beginPath();
		c.moveTo(0, 0);
		c.quadraticCurveTo(size * 0.5, -size * 0.55, size, 0);
		c.quadraticCurveTo(size * 0.5, size * 0.55, 0, 0);
		c.fill();
		c.restore();
	}

	function drawBlossom(c, x, y, r, petal, rot) {
		c.fillStyle = petal;
		for (var i = 0; i < 5; i++) {
			var a = rot + i * TAU / 5;
			c.beginPath();
			c.arc(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85, r * 0.72, 0, TAU);
			c.fill();
		}
		c.fillStyle = '#ffd54a';
		c.beginPath();
		c.arc(x, y, r * 0.5, 0, TAU);
		c.fill();
	}

	function start(canvas, options) {
		var opts = assign({}, DEFAULTS, options);
		var ctx = canvas.getContext('2d');
		var w = 0, h = 0, dpr = 1, ox = 0, oy = 0;
		var ledges = [], flowers = [], vines = [], blades = [];
		var raf = 0, last = 0, running = true, scanTimer = 0, scrollTimer = 0, nextFlower = 0;
		var idleSince = performance.now(), level = 0, grassStart = Date.now();

		try {
			if (opts.persist) {
				var saved = parseInt(root.sessionStorage.getItem(STORE_KEY), 10);
				if (saved) { grassStart = saved; } else { root.sessionStorage.setItem(STORE_KEY, String(grassStart)); }
			}
		} catch (e) { /* a tárolás nem elérhető, nem gond */ }

		function resize() {
			var r = canvas.getBoundingClientRect();
			dpr = Math.min(root.devicePixelRatio || 1, 2);
			w = r.width; h = r.height;
			canvas.width = Math.max(1, Math.round(w * dpr));
			canvas.height = Math.max(1, Math.round(h * dpr));
			buildVines();
			blades = [];
		}

		/* -- virágok az elemeken -- */

		function pageTop(r, fixed) { return fixed ? r.top : r.top + (root.pageYOffset || 0); }
		function isFixed(el) {
			for (var p = el; p && p.nodeType === 1; p = p.parentElement) {
				if (root.getComputedStyle(p).position === 'fixed') { return true; }
			}
			return false;
		}

		function scan() {
			if (!opts.flowers || !opts.flowerSelectors) { ledges.length = 0; return; }
			var scope = opts.flowerRoot || document, list, found = [], i;
			try { list = scope.querySelectorAll(opts.flowerSelectors); } catch (e) { list = []; }
			var cr = canvas.getBoundingClientRect();
			for (i = 0; i < Math.min(list.length, 600); i++) { found.push(list[i]); }

			ledges = ledges.filter(function (l) { return found.indexOf(l.el) !== -1 && document.documentElement.contains(l.el); });
			var known = ledges.map(function (l) { return l.el; });
			for (i = 0; i < found.length && ledges.length < MAX_LEDGES; i++) {
				var el = found[i];
				if (known.indexOf(el) !== -1 || el === canvas || el.contains(canvas)) { continue; }
				var r = el.getBoundingClientRect();
				if (r.width < 40 || r.height < 10) { continue; }
				var top = r.top - cr.top;
				if (top < -400 || top > cr.height + 400) { continue; }
				var cs = root.getComputedStyle(el);
				if (cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.1) { continue; }
				ledges.push({ el: el, fixed: isFixed(el), w: r.width, x: 0, y: 0, vis: false });
			}
		}

		function refreshLedges() {
			for (var i = 0; i < ledges.length; i++) {
				var l = ledges[i], r = l.el.getBoundingClientRect();
				if (r.width < 1 || r.height < 1) { l.vis = false; continue; }
				l.x = r.left - ox; l.y = r.top - oy; l.w = r.width;
				l.vis = l.y > 20 && l.y < h - 4 && l.x < w && l.x + l.w > 0;
			}
		}

		function pickColor() {
			if (opts.flowerColor === 'white') { return 'white'; }
			if (opts.flowerColor === 'pink') { return 'pink'; }
			return Math.random() < 0.5 ? 'white' : 'pink';
		}

		function spawnFlower(now) {
			var vis = ledges.filter(function (l) { return l.vis; });
			if (!vis.length) { return; }
			var l = vis[(Math.random() * vis.length) | 0];
			var r = rand(4, 7);
			flowers.push({
				ledge: l, dx: rand(8, Math.max(9, l.w - 8)), r: r, stem: rand(9, 18), color: pickColor(),
				born: now, life: rand(10000, 28000), rot: rand(0, TAU), sway: rand(0, TAU)
			});
		}

		function updateFlowers(now) {
			var vis = 0, i;
			for (i = 0; i < ledges.length; i++) { if (ledges[i].vis) { vis++; } }
			if (opts.flowers && vis && now >= nextFlower && flowers.length < opts.maxFlowers) {
				spawnFlower(now);
				nextFlower = now + rand(1200, 4000);
			}
			for (i = flowers.length - 1; i >= 0; i--) {
				var f = flowers[i], l = f.ledge, age = now - f.born;
				if (age > f.life + 2500 || ledges.indexOf(l) === -1 || !opts.flowers) { flowers.splice(i, 1); continue; }
				if (!l.vis) { continue; }

				var bloom = clamp(age / 1800, 0, 1);
				bloom = 1 - Math.pow(1 - bloom, 3);
				var wilt = clamp((age - f.life) / 2500, 0, 1);
				var x = l.x + f.dx, y = l.y + 1;
				var sway = Math.sin(now / 900 + f.sway) * 1.6 * bloom;
				var sh = f.stem * bloom;
				var hx = x + sway + wilt * 4, hy = y - sh + wilt * sh * 0.45;

				ctx.globalAlpha = 1 - wilt * 0.85;
				ctx.strokeStyle = '#4c9a3f';
				ctx.lineWidth = 1.6;
				ctx.beginPath();
				ctx.moveTo(x, y);
				ctx.quadraticCurveTo(x + sway * 0.3, y - sh * 0.5, hx, hy);
				ctx.stroke();
				if (bloom > 0.4) {
					drawLeaf(ctx, x + sway * 0.2, y - sh * 0.35, -0.7, 6 * bloom, '#5cb844');
					drawLeaf(ctx, x + sway * 0.2, y - sh * 0.5, Math.PI + 0.7, 5 * bloom, '#6fc24e');
				}
				var petal = f.color === 'white' ? '#ffffff' : '#ff9cc2';
				ctx.save();
				ctx.shadowColor = 'rgba(60,90,60,.45)';
				ctx.shadowBlur = 2;
				drawBlossom(ctx, hx, hy, f.r * bloom, petal, f.rot);
				ctx.restore();
				ctx.globalAlpha = 1;
			}
		}

		/* -- kizöldülő szélek -- */

		function buildVines() {
			vines = [];
			['left', 'right'].forEach(function (side) {
				for (var k = 0; k < 3; k++) {
					var len = h * (k === 0 ? rand(0.8, 1) : rand(0.5, 0.9));
					var n = Math.max(6, Math.round(len / 10));
					var base = 6 + k * 15, phase = rand(0, TAU), freq = rand(5, 8);
					var dir = side === 'left' ? 1 : -1, edge = side === 'left' ? 0 : w;
					var pts = [], leaves = [], blossoms = [];
					for (var i = 0; i <= n; i++) {
						var t = i / n;
						pts.push({ x: edge + dir * (base + 9 * Math.sin(t * freq + phase) + t * 6), y: h - t * len });
						if (i > 2 && i % 3 === 0) {
							leaves.push({ i: i, side: (i / 3) % 2 ? 1 : -1, size: rand(10, 17), tone: Math.random() < 0.5 ? '#4fae48' : '#7ccb5a' });
						}
						if (i > 5 && i % 7 === 0 && Math.random() < 0.8) {
							blossoms.push({ i: i, r: rand(5, 8), rot: rand(0, TAU), off: rand(-6, 6) });
						}
					}
					vines.push({ pts: pts, leaves: leaves, blossoms: blossoms, k: k, dir: dir });
				}
			});
		}

		function drawVines() {
			if (level <= 0.003) { return; }
			ctx.lineCap = 'round';
			for (var v = 0; v < vines.length; v++) {
				var vn = vines[v], n = vn.pts.length - 1;
				var g = clamp(level * 1.18 - vn.k * 0.12, 0, 1);
				var m = Math.floor(g * n);
				if (m < 1) { continue; }
				ctx.strokeStyle = '#3f8f3c';
				ctx.lineWidth = 3.2 - vn.k * 0.5;
				ctx.beginPath();
				ctx.moveTo(vn.pts[0].x, vn.pts[0].y);
				for (var i = 1; i <= m; i++) { ctx.lineTo(vn.pts[i].x, vn.pts[i].y); }
				ctx.stroke();

				for (var a = 0; a < vn.leaves.length; a++) {
					var lf = vn.leaves[a];
					if (lf.i > m) { break; }
					var sc = clamp((m - lf.i) / 5, 0, 1), p = vn.pts[lf.i];
					drawLeaf(ctx, p.x, p.y, -Math.PI / 2 + lf.side * 0.95, lf.size * sc, lf.tone);
				}
				ctx.save();
				ctx.shadowColor = 'rgba(80,60,60,.35)';
				ctx.shadowBlur = 2;
				for (var b = 0; b < vn.blossoms.length; b++) {
					var bl = vn.blossoms[b];
					if (bl.i > m) { break; }
					var s2 = clamp((m - bl.i) / 6, 0, 1), q = vn.pts[bl.i];
					drawBlossom(ctx, q.x + vn.dir * (4 + bl.off * 0.3), q.y, bl.r * s2, '#ff8fbb', bl.rot);
				}
				ctx.restore();
			}
		}

		/* -- fű -- */

		function spawnBlade(initial) {
			blades.push({
				x: rand(0, w), maxH: rand(0.45, 1) * clamp(h * 0.05, 12, 30),
				born: initial ? -1e9 : performance.now(), dur: rand(2500, 5000),
				bend: rand(2, 5), bw: rand(1.3, 2.4), c: (Math.random() * 3) | 0, ph: rand(0, TAU)
			});
		}

		function updateGrass(now) {
			if (!opts.grass) { blades.length = 0; return; }
			var total = clamp(w * 0.6, 60, 760);
			var want = Math.round(total * clamp((Date.now() - grassStart) / 1000 / opts.grassSeconds, 0, 1));
			var initial = blades.length === 0 && want > 8;
			while (blades.length < want) { spawnBlade(initial); }

			var t = now / 1000;
			for (var c = 0; c < 3; c++) {
				ctx.fillStyle = GRASS_COLORS[c];
				ctx.beginPath();
				for (var i = 0; i < blades.length; i++) {
					var b = blades[i];
					if (b.c !== c) { continue; }
					var g = clamp((now - b.born) / b.dur, 0, 1);
					g = 1 - Math.pow(1 - g, 2);
					var hh = b.maxH * g, sway = Math.sin(t * 1.4 + b.x * 0.03 + b.ph) * b.bend * g;
					ctx.moveTo(b.x - b.bw, h + 1);
					ctx.quadraticCurveTo(b.x - b.bw * 0.3, h - hh * 0.55, b.x + sway, h - hh);
					ctx.quadraticCurveTo(b.x + b.bw * 0.6, h - hh * 0.5, b.x + b.bw, h + 1);
				}
				ctx.fill();
			}
		}

		/* -- fő ciklus -- */

		function activity() { idleSince = performance.now(); }

		function frame(now) {
			if (!running) { return; }
			raf = root.requestAnimationFrame(frame);
			if (!last) { last = now; nextFlower = now + 1000; }
			var dt = Math.min((now - last) / 1000, 0.05);
			last = now;

			var cr = canvas.getBoundingClientRect();
			ox = cr.left; oy = cr.top;
			if (Math.abs(cr.width - w) > 0.5 || Math.abs(cr.height - h) > 0.5) { resize(); }
			if (w < 1 || h < 1) { return; }

			// kizöldülés: mozdulatlanság után nő, aktivitásra gyorsan visszahúzódik
			var target = opts.grow ? clamp(((now - idleSince) / 1000 - opts.growDelay) / opts.growSeconds, 0, 1) : 0;
			if (target > level) { level = target; } else if (level > target) { level = Math.max(target, level - dt * 0.7); }

			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, w, h);

			if (opts.grass) { updateGrass(now); }
			drawVines();
			if (opts.flowers) { refreshLedges(); }
			updateFlowers(now);
		}

		function onScroll() {
			root.clearTimeout(scrollTimer);
			scrollTimer = root.setTimeout(scan, 150);
		}

		var events = ['scroll', 'wheel', 'keydown', 'touchstart', 'touchmove', 'pointerdown'];
		events.forEach(function (ev) { root.addEventListener(ev, activity, { passive: true }); });
		root.addEventListener('scroll', onScroll, { passive: true });
		root.addEventListener('resize', onScroll);

		resize();
		scan();
		scanTimer = root.setInterval(scan, 1500);
		raf = root.requestAnimationFrame(frame);

		return {
			update: function (next) {
				var grassWasOn = opts.grass;
				assign(opts, next);
				if (!opts.flowers) { flowers.length = 0; }
				if (!grassWasOn && opts.grass) { grassStart = Date.now(); }
				scan();
			},
			destroy: function () {
				running = false;
				root.cancelAnimationFrame(raf);
				root.clearInterval(scanTimer);
				root.clearTimeout(scrollTimer);
				events.forEach(function (ev) { root.removeEventListener(ev, activity); });
				root.removeEventListener('scroll', onScroll);
				root.removeEventListener('resize', onScroll);
				ctx.setTransform(1, 0, 0, 1, 0, 0);
				ctx.clearRect(0, 0, canvas.width, canvas.height);
			}
		};
	}

	root.SeasonDecorSpring = { start: start };

	/* ---------- automatikus indítás a webhelyen ---------- */

	var cfg = root.SeasonDecorSpringConfig;
	if (cfg) {
		var boot = function () {
			if (root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
			var canvas = document.createElement('canvas');
			canvas.setAttribute('aria-hidden', 'true');
			canvas.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:99999';
			document.body.appendChild(canvas);
			start(canvas, {
				flowers: !!cfg.flowers,
				flowerColor: cfg.flowerColor,
				flowerSelectors: cfg.flowerSelectors,
				grow: !!cfg.grow,
				growDelay: cfg.growDelay,
				grass: !!cfg.grass,
				persist: true
			});
		};
		if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
	}
})(window);
