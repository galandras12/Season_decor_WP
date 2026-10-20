(function () {
	'use strict';

	var data = window.SeasonDecorTime;
	if (!data) { return; }

	var MONTHS_SEASON = { 12: 'winter', 1: 'winter', 2: 'winter', 3: 'spring', 4: 'spring', 5: 'spring', 6: 'summer', 7: 'summer', 8: 'summer', 9: 'autumn', 10: 'autumn', 11: 'autumn' };
	var $ = function (id) { return document.getElementById(id); };
	var fields = { d: $('sd-off-days'), h: $('sd-off-hours'), m: $('sd-off-minutes') };

	function pad(n) { return (n < 10 ? '0' : '') + n; }

	// A „falióra” időt UTC getterekkel formázzuk, így nem keveredik a böngésző időzónájával.
	function fmt(wallSec) {
		var d = new Date(wallSec * 1000);
		return d.getUTCFullYear() + '. ' + pad(d.getUTCMonth() + 1) + '. ' + pad(d.getUTCDate()) + '. ' +
			pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds());
	}

	function browserWall() { return Date.now() / 1000 - new Date().getTimezoneOffset() * 60; }

	var loadedBrowser = browserWall();
	function siteWall() { return data.siteWall + (browserWall() - loadedBrowser); }

	function offsetSeconds() {
		return (parseInt(fields.d.value, 10) || 0) * 86400 + (parseInt(fields.h.value, 10) || 0) * 3600 + (parseInt(fields.m.value, 10) || 0) * 60;
	}

	function diffText(sec) {
		if (Math.abs(sec) < 60) { return 'nincs számottevő eltérés'; }
		var s = Math.abs(sec), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.round(s % 3600 / 60);
		var parts = [];
		if (d) { parts.push(d + ' nap'); }
		if (h) { parts.push(h + ' óra'); }
		if (m) { parts.push(m + ' perc'); }
		return parts.join(' ') + (sec > 0 ? ' (a szerver késik)' : ' (a szerver siet)');
	}

	function render() {
		var site = siteWall(), mine = browserWall(), off = offsetSeconds();
		$('sd-clock-site').textContent = fmt(site);
		$('sd-clock-browser').textContent = fmt(mine);
		$('sd-clock-diff').textContent = diffText(mine - site);

		var corrected = site + off;
		var month = new Date(corrected * 1000).getUTCMonth() + 1;
		$('sd-offset-result').innerHTML = 'Korrigált szerver idő: <b>' + fmt(corrected) + '</b> → aktív évszak: <b>' + data.seasons[MONTHS_SEASON[month]] + '</b>';
	}

	function fill(totalSec) {
		var totalMin = Math.round(totalSec / 60), sign = totalMin < 0 ? -1 : 1, a = Math.abs(totalMin);
		fields.d.value = sign * Math.floor(a / 1440);
		fields.h.value = sign * Math.floor(a % 1440 / 60);
		fields.m.value = sign * (a % 60);
		render();
	}

	$('sd-auto-offset').addEventListener('click', function () { fill(browserWall() - siteWall()); });
	$('sd-reset-offset').addEventListener('click', function () { fill(0); });
	Object.keys(fields).forEach(function (k) { fields[k].addEventListener('input', render); });

	render();
	window.setInterval(render, 1000);
})();
