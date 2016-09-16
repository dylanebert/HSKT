const fs = require('fs');
const csv = require('csv');

$(document).ready(function() {
	var setDict = ['1234', '1324', '4231', '4321'];
	var seqDict = ['123434', '3423132412', '1324323123', '4313122423'];
	var partDict = ['Head', 'Shoulders', 'Knees', 'Toes'];
	
	var playing, loading, timer, startTime, seqPos, curStep, curSet, curSeq, i, j;
	var maxTime = 3000; //Time (ms) between each command
	var buffers = [];
	playing = loading = timer = startTime = seqPos = curStep = i = 0;
	j = -2;
	curSet = curSeq = '';

	//Declare canvases
	var playbackCanvas = document.getElementById('playback');
	var predictionCanvas = document.getElementById('confidences');
	var pbctx = playbackCanvas.getContext('2d');
	var pctx = predictionCanvas.getContext('2d');
	pbctx.textAlign = 'center';
	pbctx.font = '16px sans-serif';	
	var predictionChart = new Chart(pctx, {
		type: 'doughnut',
		data: {
			labels: ["Head", "Shoulders", "Knees", "Toes"],
			datasets: [{
				data: [0.25, 0.25, 0.25, 0.25],
				backgroundColor: [
					'rgba(255, 99, 132, 0.2)',
					'rgba(54, 162, 235, 0.2)',
					'rgba(255, 206, 86, 0.2)',
					'rgba(75, 192, 192, 0.2)'
				],
				borderColor: [
					'rgba(255,99,132,1)',
					'rgba(54, 162, 235, 1)',
					'rgba(255, 206, 86, 1)',
					'rgba(75, 192, 192, 1)'
				]
			}]
		},
		options: {
			responsive: false
		}
	});	
	var imageObj = new Image();
	imageObj.onload = function() {
		pbctx.save();
		pbctx.clearRect(0, 0, 640, 360);
		pbctx.drawImage(this, 0, 0, 1920, 1080, 0, 0, 640, 360);
		pbctx.restore();
	};
	
	//Intialisation
	$('body').on('mousedown', function(e) {
		e.preventDefault();
	});
	$('.container').fadeIn();
	loading = 1;
	curStep = 1;
	curSet = setDict[curStep];
	curSeq = setDict[curStep];
	pbctx.clearRect(0, 0, 640, 360);
	pbctx.fillText('Loading...', playbackCanvas.width / 2, playbackCanvas.height / 2);
	$('.progress-bar').css('width','0%').attr('aria-valuenow', 0).text('0%');
	reqVideo();
	
	//Analysis controls
	$('#analysis-play').click(function() {
		if(playing == 0 && i < buffers.length - 1) {
			playing = 1;
			$(this).removeClass('glyphicon-play').addClass('glyphicon-pause');
		}
		else if(playing == 1) {
			playing = 0;
			$(this).removeClass('glyphicon-pause').addClass('glyphicon-play');
		}
	});	
	$('#analysis-step-back').click(function() {
		i = 0;
		drawFrame();
		drawConfidences();
	});	
	$('#analysis-rewind').click(function() {
		if(i > 5) {
			i -= 5;
			drawFrame();
			drawConfidences();
		}
	});	
	$('#analysis-forward').click(function() {
		if(i < buffers.length - 5) {
			i += 5;
			drawFrame();
			drawConfidences();
		}
	});	
	$('#analysis-step-forward').click(function() {
		i = buffers.length - 1;
		drawFrame();
		drawConfidences();
	});
	
	$('#recordingBtn').click(function() {
		$('.container').fadeOut(function() {
			window.location.href = 'recording.html';		
		});
	});
	
	function drawFrame() {
		var frameTimeHMS = /\d{2}\-\d{2}\-\d{2}\.\d{3}/.exec(buffers[i].name).toString();
		var a = frameTimeHMS.split('-');
		var frameTime = parseFloat(a[0] * 3600 + a[1] * 60 + a[2]);
		j = Math.floor((frameTime - startTime) / 3) - 1;
		imageObj.src = 'data:image/jpeg;base64,' + buffers[i].buffer;
		if(j > -1) {
			$('#spoken').text('Spoken: ' + partDict[curSet.charAt(curSeq[j] - 1) - 1]);
			$('#correct').text('Command: ' + partDict[curSeq[j] - 1]);
		}
		$('#frameNumber').text(i.toString());
		$('#prediction').text('Prediction: ' + partDict[parseInt(buffers[i].dataclass)]);
	}
	
	function drawConfidences() {
		var confidences = [];
		var re = /\b0.\d+\b/g;
		var str = buffers[i].confidences.toString();
		var arr;
		while((arr = re.exec(str)) !== null) {
			confidences.push(parseFloat(arr[0]));
		}
		predictionChart.data.datasets[0].data = confidences;
		predictionChart.update();
	}
	
	setInterval(function() {
		if(playing && i < buffers.length - 1) {
			drawFrame();
			drawConfidences();
			i++;
		} else if(playing) {
			playing = 0;
			$('#analysis-play').removeClass('glyphicon-pause').addClass('glyphicon-play');
		}
	}, 30);
	
	function reqVideo() {
		var dir = 'C:/data/23.08-step11-Sanika/';
		var lookup = {};
		fs.readFile(dir + 'analysis.csv', 'utf8', function(err, data) {
			if(err) {
				console.log(err.toString());
			}
			else {
				csv.parse(data, function(err, output) {
					if(err) {
						console.log(err.toString());
					}
					else {
						output.forEach(function(entry) {
							lookup[entry[0]] = [entry[1], entry[2]];
						});
						fs.readdir(dir, function(err, files) {
							if(err) {
								console.log(err.toString());
							}
							else {
								var k = 0;
								next();
								function next() {
									if(k < files.length) {
										fs.readFile(dir + files[k], function(err, buf) {
											if(err) {
												console.log(err.toString());
											}
											else if(files[k] != 'analysis.csv') {
												drawImage({buffer: buf.toString('base64'), index: k, max: files.length - 1, name: files[k].toString(), dataclass: lookup[files[k]][0], confidences: lookup[files[k]][1]});
												k++;
												next();
											}
										});
									}
								}
							}
						});
					}
				});
			}
		});
	}
	
	function drawImage(data) {
		buffers.push(data);
		var prog = parseInt(100 * data.index / data.max);
		$('.progress-bar').css('width', prog + '%').attr('aria-valuenow', prog).text(parseInt(prog) + '%');
		//playing = 1; //Skip preloading
		if(data.index + 1 == data.max) {
			$('.progress').fadeOut(function() {
				var frameTimeHMS = /\d{2}\-\d{2}\-\d{2}\.\d{3}/.exec(buffers[0].name).toString();
				var a = frameTimeHMS.split('-');
				startTime = parseFloat(a[0] * 3600 + a[1] * 60 + a[2]);
				$('#analysis-step-back').removeClass('noevents').fadeTo(0, 1);
				$('#analysis-rewind').removeClass('noevents').fadeTo(0, 1);
				$('#analysis-forward').removeClass('noevents').fadeTo(0, 1);
				$('#analysis-step-forward').removeClass('noevents').fadeTo(0, 1);
				$('#analysis-play').removeClass('noevents').fadeTo(0, 1, function() {
					$(this).trigger('click');
				});
				drawFrame();
				timer = 0;
			});			
		}
	}
});