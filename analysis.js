const fs = require('fs');
const csv = require('csv');
const app = require('electron').remote;
const dialog = app.dialog;

$(document).ready(function() {
	var setDict = ['1234', '1324', '4231', '4321'];
	var seqDict = ['123434', '3423132412', '1324323123', '4313122423'];
	var partDict = ['Head', 'Shoulders', 'Knees', 'Toes'];
	
	var playing, loading, timer, startTime, seqPos, curStep, i, j;
	var maxTime = 3000; //Time (ms) between each command
	var buffers = [];
	playing = loading = timer = startTime = seqPos = curStep = i = 0;
	j = -2;

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
	pbctx.clearRect(0, 0, 640, 360);
	pbctx.fillText('Loading...', playbackCanvas.width / 2, playbackCanvas.height / 2);
	$('.progress-bar').css('width','0%').attr('aria-valuenow', 0).text('0%');
	var dir = dialog.showOpenDialog({properties: ['openDirectory']});
	reqVideo(dir);
	
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
		if(i > 10) {
			i -= 10;
			drawFrame();
			drawConfidences();
		}
	});
	$('#analysis-prev').click(function() {
		if(i > 0) {
			i--;
			drawFrame();
			drawConfidences();
		}
	});
	$('#analysis-next').click(function() {
		if(i < buffers.length - 1) {
			i++;
			drawFrame();
			drawConfidences();
		}
	});
	$('#analysis-forward').click(function() {
		if(i < buffers.length - 11) {
			i += 10;
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
			$('#spoken').text('Spoken: ' + partDict[setDict[curStep].charAt(seqDict[curStep][j] - 1) - 1]);
			$('#correct').text('Command: ' + partDict[seqDict[curStep][j] - 1]);
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
			i++;
			drawFrame();
			drawConfidences();
		} else if(playing) {
			playing = 0;
			$('#analysis-play').removeClass('glyphicon-pause').addClass('glyphicon-play');
		}
	}, 30);
	
	function reqVideo(dir) {
		dir = dir.toString().replace(/\\/g, '/') + '/';
		console.log(dir);
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
						fs.readdir(dir + 'frames/', function(err, files) {
							if(err) {
								console.log(err.toString());
							}
							else {
								var k = 0;
								next();
								function next() {
									if(k < files.length) {
										fs.readFile(dir + 'frames/' + files[k], function(err, buf) {
											if(err) {
												console.log(err.toString());
											}
											else {
												buffers.push({buffer: buf.toString('base64'), name: files[k].toString(), dataclass: lookup[files[k]][0], confidences: lookup[files[k]][1]});
												var prog = parseInt(100 * k / (files.length - 1));
												$('.progress-bar').css('width', prog + '%').attr('aria-valuenow', prog).text(parseInt(prog) + '%');
												if(k >= files.length - 1) {
													$('.progress').fadeOut(function() {
														var frameTimeHMS = /\d{2}\-\d{2}\-\d{2}\.\d{3}/.exec(buffers[0].name).toString();
														var a = frameTimeHMS.split('-');
														startTime = parseFloat(a[0] * 3600 + a[1] * 60 + a[2]);
														$('.analysis-controls').removeClass('noevents').fadeTo(0, 1, function() {
															$('#analysis-play').trigger('click');
														});
														timer = 0;
													});
												} else {
													k++;
													next();
												}
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
});