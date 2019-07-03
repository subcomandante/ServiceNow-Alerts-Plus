function log(str) {
	console.log(str);
}

var delay = 10000;

function myTimer() {
	loadIconNumber()
}

function checkDelay () {
	chrome.storage.sync.get('favoriteDelay', function (items) {
		delay = parseInt(items.favoriteDelay);
		if (delay == 999) {
			delay = 30000;
		} else {
			delay = delay*1000*60;
		}
	});
	setTimeout(function(){
		console.log("delay final " + delay);
		return delay;
	}, 20);
}

function getDelayOption() {
	chrome.storage.sync.get('favoriteDelay', function (items) {
		fdelay = parseInt(items.favoriteDelay);
		if (fdelay == 999) {
			delay = 30000;
		} else {
			delay = fdelay*1000*60;
		}
	});
}

getDelayOption()


// class highcharts-axis-labels ---------------------
