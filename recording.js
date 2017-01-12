//Set refers to the placement of the body parts (eg 1243 means knees and toes are swapped)
//Seq refers to the "real" order of the parts (eg 1334 means head, knees, knees, toes, regardless of the set)

const server = require('http').createServer();
const io = require('socket.io')(server);
const fs = require('fs');

$(document).ready(function() {	
	var setDict = ['4231', '4321', '3412'];
	var seqDict = ['1441411414', '1434213324', '2134432112'];
	var partDict = ['Head', 'Shoulders', 'Knees', 'Toes'];
	
	var recording, timer, startTime, seqPos, curStep, i;
	var wstream = null;
	var maxTime = 5000; //Time (ms) between each command
	var kinectConnected = false;
	var participantName = 'Name';
	var metadata = ['undefined', 'undefined', 'undefined', 'undefined', 'undefined'];
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
		metadata[0] = participantName;
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
			$('#score_buttons').addClass('noevents').fadeTo(0, 0.25);
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
			if(seqPos == 0) {
				var dir = '';
				var now = new Date();
				dir += 'C:/data/' + ('0' + now.getDate()).slice(-2) + '.' + ('0' + now.getHours()).slice(-2) + '.' + ('0' + now.getMinutes()).slice(-2) + '-step' + (parseInt(curStep) + 1).toString() + '-' + participantName;
				wstream = fs.createWriteStream(dir + '.csv');
				metadata[parseInt(curStep) + 1] = dir + '/';
				seqPos++;
			}
			io.emit('start', parseInt(curStep) + 1);
			recording = 1;
			$('#bgfocus').fadeIn();
			$(this).addClass('noevents').fadeTo(0, 0.25);
			$('#record-stop').removeClass('noevents').fadeTo(0, 1);
			$('#score_buttons').removeClass('noevents').fadeTo(0, 1);
			$('.list-group-item').addClass('noevents');			
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
		$('.list-group-item').removeClass('noevents');
		$('#nav' + curStep).trigger('click');
		if(curStep == 3) {
			var toWrite = metadata[0] + ', ' + metadata[1] + ', ' + metadata[2] + ', ' + metadata[3] + ', ' + metadata[4] + '\n'; 
			fs.appendFile('C:/data/participants.csv', toWrite, function(err) {
				if(err)
					console.log(err);
			});
		}
	}
	
	$('#score_0').click(function() {scoreClick(0)});
	$('#score_1').click(function() {scoreClick(1)});
	$('#score_2').click(function() {scoreClick(2)});
	function scoreClick(val) {
		completeRecording();
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
	
	function completeRecording() {
		if(seqPos > seqDict[curStep].length - 1) {
			if(curStep < setDict.length - 1) {
				curStep++;
				seqPos = 0;
			}
			wstream.end();
		} else {		
			var temp = '#a' + (seqDict[curStep][seqPos]).toString();
			$(temp).css('background-image', 'none');
			$('h3', temp).css('color', 'black');
			$('#seq' + (seqPos - 1)).css('color', 'black');
			var now = new Date();
			wstream.write((seqPos + 1) + ',' + ('0' + now.getMinutes()).slice(-2) + '.' + ('0' + now.getSeconds()).slice(-2) + '.' + now.getMilliseconds() + '\r\n');
			seqPos++;
		}
		io.emit('complete');
		stopRecording();
	}
	
	//Update function
	setInterval(function() {
		if(recording == 1) {
			if(kinectConnected) {
				var temp;
				if(timer == 0) {
					var temp;
					temp = '#a' + (seqDict[curStep][seqPos - 1]).toString();
					$(temp).css('background-image', 'url("img/' + $(temp).attr('id') + '.png")');
					$(temp).fadeOut(0).fadeIn('slow');
					$('h3', temp).css('color', 'red');
					$('#seq' + (seqPos - 1)).css('color', 'red');
				}
				timer += 100;
				$('#view .glyphicon-arrow-up').css('left', '+=1');
			}
			else {
				stopRecording();
			}
		}
	}, 100);
});