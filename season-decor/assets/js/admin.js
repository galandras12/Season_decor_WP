(function () {
	'use strict';

	var form = document.querySelector('.sd-form');
	var canvas = document.getElementById('sd-preview-canvas');
	if (!form || !canvas) { return; }

	var season = form.getAttribute('data-season');
	var preview = document.getElementById('sd-preview');
	var NAME = form.getAttribute('data-option');

	function field(key) { return form.querySelector('[name="' + NAME + '[' + key + ']"]'); }
	function checked(key) { var f = field(key); return !!f && f.checked; }

	var readers = {
		winter: function () {
			return {
				type: field('type').value,
				speed: field('speed').value,
				intensity: field('intensity').value,
				randomAlpha: checked('random_alpha'),
				stick: checked('stick')
			};
		},
		spring: function () {
			var fc = form.querySelector('[name="' + NAME + '[flower_color]"]:checked');
			return {
				flowers: checked('flowers'),
				flowerColor: fc ? fc.value : 'mixed',
				grow: checked('grow'),
				grass: checked('grass'),
				tree: checked('tree'),
				treeSide: (form.querySelector('[name="' + NAME + '[tree_side]"]:checked') || { value: 'right' }).value
			};
		},
		summer: function () {
			var corner = form.querySelector('[name="' + NAME + '[sun_corner]"]:checked');
			return {
				sun: checked('sun'),
				sunCorner: corner ? corner.value : 'right',
				sunDisc: checked('sun_disc'),
				ice: checked('ice'),
				ball: checked('ball')
			};
		},
		autumn: function () {
			var color = form.querySelector('[name="' + NAME + '[leaf_color]"]:checked');
			return {
				leafColor: color ? color.value : 'mixed',
				pile: checked('pile'),
				pileSeconds: Math.max(10, parseInt(field('pile_seconds').value, 10) || 60),
				stick: checked('stick'),
				straight: checked('motion_straight'),
				gusts: checked('motion_gusts'),
				sway: checked('motion_sway'),
				hedgehog: checked('hedgehog')
			};
		}
	};

	var libs = { winter: window.SeasonDecorWinter, autumn: window.SeasonDecorAutumn, summer: window.SeasonDecorSummer, spring: window.SeasonDecorSpring };
	var lib = libs[season];
	var read = readers[season];
	if (lib && read) {
		var engine = lib.start(canvas, Object.assign({
			stickSelectors: '.sd-demo-card, .sd-demo-btn',
			iceSelectors: '.sd-demo-card, .sd-demo-btn',
			iceRoot: preview,
			flowerSelectors: '.sd-demo-card, .sd-demo-btn',
			flowerRoot: preview,
			growDelay: 3,
			growSeconds: 12,
			grassSeconds: 25,
			maxCubes: 2,
			firstBallDelay: 1500,
			stickRoot: preview,
			pointerTarget: preview
		}, read()));
		form.addEventListener('change', function () { engine.update(read()); });
	}

	// A függő almezők halványak, ha a fő kapcsoló ki van kapcsolva.
	function syncDependents() {
		Array.prototype.forEach.call(form.querySelectorAll('[data-sd-depends]'), function (box) {
			var toggle = document.getElementById(box.getAttribute('data-sd-depends'));
			box.classList.toggle('is-off', !!toggle && !toggle.checked);
		});
	}
	form.addEventListener('change', syncDependents);
	syncDependents();
})();
