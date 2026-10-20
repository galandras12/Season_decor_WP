/**
 * Season Decor – nyári hangulat motor.
 *
 * - a nap sugarai a weboldal bal vagy jobb felső sarkában
 * - jégkockák jelennek meg véletlenszerű elemeken, majd elolvadnak
 * - strandlabda gurul / pattog át a weboldal alján
 *
 * A motor a webhelyen és az admin előnézetben is ugyanez.
 */
(function (root) {
	'use strict';

	var TAU = Math.PI * 2;
	var MAX_LEDGES = 80;

	var DEFAULTS = {
		sun: true,
		sunCorner: 'right',
		sunDisc: true,
		ice: true,
		iceSelectors: '',
		iceRoot: null,
		ball: true,
		maxCubes: 6,
		firstBallDelay: 4000
	};

	var BALL_COLORS = [
		['#ff5252', '#ffd600', '#29b6f6'],
		['#ff7043', '#ffee58', '#26c6da'],
		['#ec407a', '#ffca28', '#42a5f5']
	];

	function rand(a, b) { return a + Math.random() * (b - a); }
	function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
	function assign(t) {
		for (var i = 1; i < arguments.length; i++) {
			var s = arguments[i];
			if (s) { for (var k in s) { if (Object.prototype.hasOwnProperty.call(s, k)) { t[k] = s[k]; } } }
		}
		return t;
	}

	/* ---------- strandlabda sprite ---------- */

	function makeBallSprite(colors) {
		var s = 96, cv = document.createElement('canvas');
		cv.width = cv.height = s;
		var c = cv.getContext('2d'), R = s / 2 - 3, i;
		c.translate(s / 2, s / 2);
		c.save();
		c.beginPath();
		c.arc(0, 0, R, 0, TAU);
		c.clip();
		for (i = 0; i < 6; i++) {
			c.beginPath();
			c.moveTo(0, 0);
			c.arc(0, 0, R + 2, i * TAU / 6, (i + 1) * TAU / 6);
			c.closePath();
			c.fillStyle = i % 2 ? '#ffffff' : colors[(i / 2) | 0];
			c.fill();
		}
		c.restore();
		// fehér sapka a pólusnál, körvonal, fény
		c.fillStyle = '#ffffff';
		c.beginPath(); c.arc(0, 0, R * 0.16, 0, TAU); c.fill();
		c.lineWidth = 2;
		c.strokeStyle = 'rgba(0,0,0,.25)';
		c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke();
		return cv;
	}

	/* ---------- fő motor ---------- */

	function start(canvas, options) {
		var opts = assign({}, DEFAULTS, options);
		var ctx = canvas.getContext('2d');
		var w = 0, h = 0, dpr = 1, ox = 0, oy = 0;
		var ledges = [], cubes = [], drops = [];
		var raf = 0, last = 0, running = true, scanTimer = 0, scrollTimer = 0;
		var nextCube = 0;
		var ball = { active: false, nextAt: 0, sprite: null };

		function resize() {
			var r = canvas.getBoundingClientRect();
			dpr = Math.min(root.devicePixelRatio || 1, 2);
			w = r.width; h = r.height;
			canvas.width = Math.max(1, Math.round(w * dpr));
			canvas.height = Math.max(1, Math.round(h * dpr));
		}

		/* -- elemek, amelyeken jégkocka jelenhet meg -- */

		function pageTop(r, fixed) { return fixed ? r.top : r.top + (root.pageYOffset || 0); }
		function isFixed(el) {
			for (var p = el; p && p.nodeType === 1; p = p.parentElement) {
				if (root.getComputedStyle(p).position === 'fixed') { return true; }
			}
			return false;
		}

		function scan() {
			if (!opts.ice || !opts.iceSelectors) { ledges.length = 0; return; }
			var scope = opts.iceRoot || document, list, found = [], i;
			try { list = scope.querySelectorAll(opts.iceSelectors); } catch (e) { list = []; }
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
				var fixed = isFixed(el);
				ledges.push({ el: el, fixed: fixed, w: r.width, x: 0, y: 0, ay: pageTop(r, fixed), vis: false });
			}
		}

		function refreshLedges() {
			for (var i = 0; i < ledges.length; i++) {
				var l = ledges[i], r = l.el.getBoundingClientRect();
				if (r.width < 1 || r.height < 1) { l.vis = false; continue; }
				l.moved = Math.abs(pageTop(r, l.fixed) - l.ay) > 4;
				if (l.moved) { l.ay = pageTop(r, l.fixed); }
				l.x = r.left - ox;
				l.y = r.top - oy;
				l.w = r.width;
				l.vis = l.y > 0 && l.y < h - 4 && l.x < w && l.x + l.w > 0;
			}
		}

		/* -- jégkockák -- */

		function spawnCube(now) {
			var vis = ledges.filter(function (l) { return l.vis; });
			if (!vis.length) { return; }
			var l = vis[(Math.random() * vis.length) | 0];
			var size = rand(22, 34);
			cubes.push({
				ledge: l, dx: rand(6, Math.max(7, l.w - size - 6)), size: size, rot: rand(-0.25, 0.25),
				born: now, meltAt: now + rand(3500, 10000), meltFor: rand(4000, 8000), dripAcc: 0
			});
		}

		function updateCubes(now, dt) {
			var vis = 0, i;
			for (i = 0; i < ledges.length; i++) { if (ledges[i].vis) { vis++; } }
			if (opts.ice && vis && now >= nextCube && cubes.length < opts.maxCubes) {
				spawnCube(now);
				nextCube = now + rand(1500, 5000);
			}
			for (i = cubes.length - 1; i >= 0; i--) {
				var c = cubes[i], l = c.ledge;
				var m = clamp((now - c.meltAt) / c.meltFor, 0, 1);
				var gone = (now - c.meltAt) > c.meltFor + 2500;
				if (gone || ledges.indexOf(l) === -1 || !opts.ice) { cubes.splice(i, 1); continue; }
				if (!l.vis) { continue; }
				c.m = m;
				// csöpögés olvadás közben
				if (m > 0.05 && m < 1) {
					c.dripAcc += dt * (1 + m * 3);
					if (c.dripAcc > 0.6 && drops.length < 80) {
						c.dripAcc = 0;
						drops.push({ x: l.x + c.dx + c.size * rand(0.15, 0.85), y: l.y, vy: rand(20, 60), r: rand(1.2, 2.3), life: 1 });
					}
				}
				drawCube(c, l, now);
			}
		}

		function drawCube(c, l, now) {
			var m = c.m || 0;
			var pop = clamp((now - c.born) / 400, 0, 1);
			var s = c.size * (0.6 + 0.4 * pop);
			var melt = m;
			var hgt = s * (1 - 0.8 * melt), wid = s * (1 + 0.12 * melt);
			var x = l.x + c.dx, y = l.y;
			var fade = (now - c.meltAt) > c.meltFor ? clamp(1 - ((now - c.meltAt - c.meltFor) / 2500), 0, 1) : 1;

			// tócsa
			if (melt > 0.02) {
				ctx.globalAlpha = 0.5 * fade;
				ctx.fillStyle = '#a9dcf7';
				ctx.beginPath();
				ctx.ellipse(x + s / 2, y - 1, s * (0.35 + 0.65 * melt), 2 + s * 0.08 * melt, 0, 0, TAU);
				ctx.fill();
			}
			if (m >= 1) { ctx.globalAlpha = 1; return; }

			ctx.save();
			ctx.globalAlpha = (0.92 - 0.25 * melt) * fade;
			ctx.translate(x + s / 2, y - hgt / 2 + 1);
			ctx.rotate(c.rot * (1 - melt));
			var g = ctx.createLinearGradient(-wid / 2, -hgt / 2, wid / 2, hgt / 2);
			g.addColorStop(0, 'rgba(225,246,255,.95)');
			g.addColorStop(1, 'rgba(150,208,245,.8)');
			ctx.fillStyle = g;
			ctx.strokeStyle = 'rgba(255,255,255,.95)';
			ctx.lineWidth = 1.5;
			var r = Math.min(5, hgt * 0.25);
			ctx.beginPath();
			ctx.moveTo(-wid / 2 + r, -hgt / 2);
			ctx.arcTo(wid / 2, -hgt / 2, wid / 2, hgt / 2, r);
			ctx.arcTo(wid / 2, hgt / 2, -wid / 2, hgt / 2, r);
			ctx.arcTo(-wid / 2, hgt / 2, -wid / 2, -hgt / 2, r);
			ctx.arcTo(-wid / 2, -hgt / 2, wid / 2, -hgt / 2, r);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
			// csillanás és buborékok
			ctx.strokeStyle = 'rgba(255,255,255,.9)';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(-wid * 0.3, -hgt * 0.15);
			ctx.lineTo(-wid * 0.1, -hgt * 0.35);
			ctx.stroke();
			ctx.fillStyle = 'rgba(255,255,255,.55)';
			ctx.beginPath(); ctx.arc(wid * 0.18, hgt * 0.12, 2, 0, TAU); ctx.fill();
			ctx.beginPath(); ctx.arc(wid * 0.05, hgt * 0.25, 1.3, 0, TAU); ctx.fill();
			ctx.restore();
			ctx.globalAlpha = 1;
		}

		function updateDrops(dt) {
			ctx.fillStyle = '#8fd0f5';
			for (var i = drops.length - 1; i >= 0; i--) {
				var d = drops[i];
				d.vy += 520 * dt;
				d.y += d.vy * dt;
				d.life -= dt * 0.35;
				if (d.y > h + 4 || d.life <= 0) { drops.splice(i, 1); continue; }
				ctx.globalAlpha = clamp(d.life * 1.5, 0, 0.85);
				ctx.beginPath();
				ctx.ellipse(d.x, d.y, d.r, d.r * 1.5, 0, 0, TAU);
				ctx.fill();
			}
			ctx.globalAlpha = 1;
		}

		/* -- nap -- */

		function drawSun(now) {
			var left = opts.sunCorner === 'left';
			var cx = left ? 0 : w, cy = 0, sgn = left ? 1 : -1;
			var L = clamp(Math.min(w, h) * 0.95 + 120, 220, 700);

			var glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, L * 0.95);
			glow.addColorStop(0, 'rgba(255,236,140,.55)');
			glow.addColorStop(0.35, 'rgba(255,214,90,.2)');
			glow.addColorStop(1, 'rgba(255,214,90,0)');
			ctx.fillStyle = glow;
			ctx.fillRect(left ? 0 : w - L, 0, L, L);

			// sugarak: lassan hullámzó, szélesedő-keskenyedő nyalábok
			var rays = ctx.createRadialGradient(cx, cy, 30, cx, cy, L);
			rays.addColorStop(0, 'rgba(255,232,120,.34)');
			rays.addColorStop(1, 'rgba(255,232,120,0)');
			ctx.fillStyle = rays;
			var n = 9, t = now / 1000;
			for (var i = 0; i < n; i++) {
				var th = (i + 0.5) / n * Math.PI / 2 + Math.sin(t * 0.35 + i) * 0.05;
				var half = 0.045 + 0.02 * Math.sin(t * 0.7 + i * 2);
				var len = L * (0.78 + 0.22 * Math.sin(t * 0.5 + i * 1.7));
				var a1 = th - half, a2 = th + half;
				ctx.beginPath();
				ctx.moveTo(cx, cy);
				ctx.lineTo(cx + sgn * Math.cos(a1) * len, cy + Math.sin(a1) * len);
				ctx.lineTo(cx + sgn * Math.cos(a2) * len, cy + Math.sin(a2) * len);
				ctx.closePath();
				ctx.fill();
			}

			if (!opts.sunDisc) {
				// csak a nap sárgás fénye: puha, korong nélküli ragyogás a sarokban
				var core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 190);
				core.addColorStop(0, 'rgba(255,240,150,.85)');
				core.addColorStop(0.5, 'rgba(255,222,100,.35)');
				core.addColorStop(1, 'rgba(255,214,90,0)');
				ctx.fillStyle = core;
				ctx.fillRect(left ? 0 : w - 190, 0, 190, 190);
				return;
			}

			// napkorong a sarokban
			var pulse = 1 + Math.sin(t * 1.2) * 0.02;
			var r = 54 * pulse;
			var disc = ctx.createRadialGradient(cx + sgn * 6, 6, 4, cx, cy, r);
			disc.addColorStop(0, '#fffbd0');
			disc.addColorStop(0.55, '#ffd83d');
			disc.addColorStop(1, '#ff9f1c');
			ctx.save();
			ctx.shadowColor = 'rgba(255,190,40,.9)';
			ctx.shadowBlur = 28;
			ctx.fillStyle = disc;
			ctx.beginPath();
			ctx.arc(cx, cy, r, 0, TAU);
			ctx.fill();
			ctx.restore();
		}

		/* -- strandlabda -- */

		function startBall(now) {
			var fromLeft = Math.random() < 0.5;
			var r = clamp(w * 0.02, 14, 24) * rand(0.85, 1.2);
			ball.active = true;
			ball.r = r;
			ball.dir = fromLeft ? 1 : -1;
			ball.x = fromLeft ? -r * 2 : w + r * 2;
			ball.speed = rand(60, 260);
			ball.y = h - r;
			ball.vy = 0;
			ball.rot = rand(0, TAU);
			ball.mode = Math.random() < 0.5 ? 'roll' : 'bounce';
			ball.switchAt = now + rand(900, 3000);
			ball.hop = rand(220, 400);
			ball.sprite = makeBallSprite(BALL_COLORS[(Math.random() * BALL_COLORS.length) | 0]);
		}

		function updateBall(now, dt) {
			if (!opts.ball) { ball.active = false; return; }
			if (!ball.active) {
				if (!ball.nextAt) { ball.nextAt = now + opts.firstBallDelay; }
				if (now >= ball.nextAt) { startBall(now); }
				return;
			}
			var ground = h - ball.r;
			if (now >= ball.switchAt) {
				ball.mode = ball.mode === 'roll' ? 'bounce' : 'roll';
				ball.switchAt = now + rand(900, 3000);
				if (Math.random() < 0.4) { ball.speed = rand(60, 260); } // néha gyorsít, lassít
				ball.hop = rand(220, 400);
			}
			ball.x += ball.dir * ball.speed * dt;
			ball.vy += 900 * dt;
			ball.y += ball.vy * dt;
			if (ball.y >= ground) {
				ball.y = ground;
				ball.vy = ball.mode === 'bounce' ? -ball.hop * rand(0.85, 1) : 0;
			}
			ball.rot += ball.dir * (ball.speed / ball.r) * dt;

			if ((ball.dir > 0 && ball.x > w + ball.r * 2) || (ball.dir < 0 && ball.x < -ball.r * 2)) {
				ball.active = false;
				ball.nextAt = now + rand(15000, 40000);
				return;
			}

			// árnyék a földön
			var air = clamp((ground - ball.y) / 120, 0, 1);
			ctx.fillStyle = 'rgba(0,0,0,' + (0.22 * (1 - air * 0.6)) + ')';
			ctx.beginPath();
			ctx.ellipse(ball.x, h - 1, ball.r * (0.9 - air * 0.3), 2.5, 0, 0, TAU);
			ctx.fill();

			var cs = Math.cos(ball.rot) * dpr, sn = Math.sin(ball.rot) * dpr;
			ctx.setTransform(cs, sn, -sn, cs, ball.x * dpr, ball.y * dpr);
			ctx.drawImage(ball.sprite, -ball.r, -ball.r, ball.r * 2, ball.r * 2);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		}

		/* -- fő ciklus -- */

		function frame(now) {
			if (!running) { return; }
			raf = root.requestAnimationFrame(frame);
			if (!last) { last = now; nextCube = now + 1200; }
			var dt = Math.min((now - last) / 1000, 0.05);
			last = now;

			var cr = canvas.getBoundingClientRect();
			ox = cr.left; oy = cr.top;
			if (Math.abs(cr.width - w) > 0.5 || Math.abs(cr.height - h) > 0.5) { resize(); }
			if (w < 1 || h < 1) { return; }

			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, w, h);

			if (opts.sun) { drawSun(now); }
			if (opts.ice) { refreshLedges(); }
			updateCubes(now, dt);
			updateDrops(dt);
			updateBall(now, dt);
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
				assign(opts, next);
				if (!opts.ice) { cubes.length = 0; }
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

	root.SeasonDecorSummer = { start: start };

	/* ---------- automatikus indítás a webhelyen ---------- */

	var cfg = root.SeasonDecorSummerConfig;
	if (cfg) {
		var boot = function () {
			if (root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
			var canvas = document.createElement('canvas');
			canvas.setAttribute('aria-hidden', 'true');
			canvas.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:99999';
			document.body.appendChild(canvas);
			start(canvas, {
				sun: !!cfg.sun,
				sunCorner: cfg.sunCorner,
				sunDisc: cfg.sunDisc !== false,
				ice: !!cfg.ice,
				iceSelectors: cfg.iceSelectors,
				ball: !!cfg.ball
			});
		};
		if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
	}
})(window);
