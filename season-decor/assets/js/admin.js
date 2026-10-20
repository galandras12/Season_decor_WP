(function () {
	'use strict';

	var form = document.querySelector('.sd-form');
	var canvas = document.getElementById('sd-preview-canvas');
	if (!form || !canvas || !window.SeasonDecorWinter) { return; }

	var preview = document.getElementById('sd-preview');
	var NAME = 'season_decor_winter';

	function field(key) { return form.querySelector('[name="' + NAME + '[' + key + ']"]'); }

	function read() {
		return {
			type: field('type').value,
			speed: field('speed').value,
			intensity: field('intensity').value,
			randomAlpha: field('random_alpha').checked,
			stick: field('stick').checked
		};
	}

	var engine = window.SeasonDecorWinter.start(canvas, Object.assign({
		stickSelectors: '.sd-demo-card, .sd-demo-btn',
		stickRoot: preview,
		pointerTarget: preview
	}, read()));

	form.addEventListener('change', function () { engine.update(read()); });

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
