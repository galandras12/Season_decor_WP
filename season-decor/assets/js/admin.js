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

	var lib = season === 'autumn' ? window.SeasonDecorAutumn : window.SeasonDecorWinter;
	var read = readers[season];
	if (lib && read) {
		var engine = lib.start(canvas, Object.assign({
			stickSelectors: '.sd-demo-card, .sd-demo-btn',
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
