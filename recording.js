//Set refers to the placement of the body parts (eg 1243 means knees and toes are swapped)
//Seq refers to the "real" order of the parts (eg 1334 means head, knees, knees, toes, regardless of the set)

const server = require('http').createServer();
const io = require('socket.io')(server);
const fs = require('fs');

$(document).ready(function() {
	var headAudio, shoulderAudio, kneeAudio, toeAudio;
	headAudio = document.createElement('audio');
	shoulderAudio = document.createElement('audio');
	kneeAudio = document.createElement('audio');
	toeAudio = document.createElement('audio');
	headAudio.setAttribute('src', 'sounds/head.wav');
	shoulderAudio.setAttribute('src', 'sounds/shoulders.wav');
	kneeAudio.setAttribute('src', 'sounds/knees.wav');
	toeAudio.setAttribute('src', 'sounds/toes.wav');
	var audios = [headAudio, shoulderAudio, kneeAudio, toeAudio];
	
	var setDict = ['1234', '1324', '4231', '4321'];
	var seqDict = ['123434', '3423132412', '1324323123', '4313122423'];
	var partDict = ['Head', 'Shoulders', 'Knees', 'Toes'];
	
	var recording, timer, startTime, seqPos, curStep, i;
	var wstream = null;
	var maxTime = 3000; //Time (ms) between each command
	var kinectConnected = false;
	var participantName = 'Name';
	recording = timer = startTime = seqPos = curStep = i = 0;
	
	//Initalisation
	$('.container').fadeIn();
	/*$('body').on('mousedown', function(e) {
		e.preventDefault();
	});*/
	
	//Preload images
	$.fn.preload = function() {
		this.each(function() {
			$('<img>')[0].src = this;
		});
	}
	$(['img/Human.png']).preload();
		
	//Name modal
	$('.modal').modal('show');	
	$('#nameForm').submit(function(e) {
		e.preventDefault();
		$('.modal').modal('hide');
		participantName = $('#name').val();
		if(kinectConnected)
			io.emit('name', participantName);
	});
	
	//Nav
	for(i = 0; i <= setDict.length - 1; i++) {
		$('.list-group').append('<a href="#" class="list-group-item' + '" id="nav' + i + '"></a>');
	}
	$('.list-group-item').click(function() {
		if(recording == 0) {
			$('#bgfocus').fadeOut();
			$('.list-group-item').removeClass('active');
			$(this).addClass('active');
			curStep = $(this).attr('id').charAt(3);
			var seqText = '';
			for(i = 0; i < seqDict[curStep].length; i++) {
				seqText += '<span id="seq' + i + '">' + seqDict[curStep][i] +'</span>';
			}
			$('#seq').html(seqText);
			$('#a1, #a2, #a3, #a4').css('background-image', 'none');
			$('#a1 h3').text(partDict[parseInt(setDict[curStep].toString().charAt(0)) - 1]).css('color', 'black');
			$('#a2 h3').text(partDict[parseInt(setDict[curStep].toString().charAt(1)) - 1]).css('color', 'black');
			$('#a3 h3').text(partDict[parseInt(setDict[curStep].toString().charAt(2)) - 1]).css('color', 'black');
			$('#a4 h3').text(partDict[parseInt(setDict[curStep].toString().charAt(3)) - 1]).css('color', 'black');
			$('#record-stop').addClass('noevents').fadeTo(0, 0.25);
			if(kinectConnected)
				$('#record-start').removeClass('noevents').fadeTo(0, 1);
			else
				$('#record-start').addClass('noevents').fadeTo(0, 0.25);
			$('.list-group-item').removeClass('noevents');
		}
	});
	$('#nav0').trigger('click');
	
	//Recording controls
	$('#record-start').click(function() {
		if(recording == 0) {
			io.emit('start', parseInt(curStep) + 1);
			recording = 1;
			$('#bgfocus').fadeIn();
			$(this).addClass('noevents').fadeTo(0, 0.25);
			$('#record-stop').removeClass('noevents').fadeTo(0, 1);
			$('.list-group-item').addClass('noevents');
			var filename = '';
			var now = new Date();
			filename += 'C:/data/' + ('0' + now.getDate()).slice(-2) + '.' + ('0' + now.getHours()).slice(-2) + '.' + ('0' + now.getMinutes()).slice(-2) + '-step' + (parseInt(curStep) + 1).toString() + '-' + participantName + '.csv';
			wstream = fs.createWriteStream(filename);
		}		
	});	
	$('#record-stop').click(function() {
		if(recording == 1) {
			io.emit('cancel');
			stopRecording();
		}
	});	
	function stopRecording() {
		recording = 0;
		timer = 0;
		seqPos = 0;
		$('.list-group-item').removeClass('noevents');
		$('#nav' + curStep).trigger('click');
		wstream.end();
	}
	
	//To analysis
	$('#analysisBtn').click(function() {
		$('.container').fadeOut(function() {
			window.location.href = 'analysis.html';		
		});
	});
	
	//Kinect connection
	server.listen(3000);
	io.on('connection', function(socket) {
		console.log('Client connected');
		
		kinectConnected = true;
		$('#record-start').removeClass('noevents').fadeTo(0, 1);
		io.emit('name', participantName);
		
		socket.on('disconnect', function() {
			console.log('Client disconnected');
			
			kinectConnected = false;
			$('#record-start').addClass('noevents').fadeTo(0, 0.25);
		});
	});
	
	//Update function
	setInterval(function() {
		if(recording == 1) {
			if(kinectConnected) {
				timer += 100;
				$('#view .glyphicon-arrow-up').css('left', '+=1');
				if(timer >= maxTime) {
					timer = 0;
					var temp;
					if(seqPos > 0) {
						temp = '#a' + (seqDict[curStep][seqPos - 1]).toString();
						$(temp).css('background-image', 'none');
						$('h3', temp).css('color', 'black');
						$('#seq' + (seqPos - 1)).css('color', 'black');
					}
					if(seqPos > seqDict[curStep].length - 1) {
						io.emit('complete');
						if(curStep < setDict.length - 1)
							curStep++;
						stopRecording();
					} else {		
						temp = '#a' + (seqDict[curStep][seqPos]).toString();
						$(temp).css('background-image', 'url("img/' + $(temp).attr('id') + '.png")');
						$(temp).fadeOut(0).fadeIn('slow');
						$('h3', temp).css('color', 'red');
						$('#seq' + seqPos).css('color', 'red');
						audios[setDict[curStep].charAt(seqDict[curStep][seqPos] - 1) - 1].play();
						var now = new Date();
						wstream.write((seqPos + 1) + ',' + ('0' + now.getMinutes()).slice(-2) + '.' + ('0' + now.getSeconds()).slice(-2) + '.' + now.getMilliseconds() + '\r\n');
						seqPos++;
					}
				}
			}
			else {
				stopRecording();
			}
		}
	}, 100);
});