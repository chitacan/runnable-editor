(function() {
	// spin.js $ plugin.
	$.fn.spin = function(opts) {
 		this.each(function() {
	 		var $this = $(this),
	 				data = $this.data();

			if (data.spinner) {
	 			data.spinner.stop();
	 			delete data.spinner;
	 		}
			if (opts !== false) {
	 			data.spinner = new Spinner(
					$.extend({color: $this.css('color')}, opts)
				).spin(this);
	 		}
		});
		return this;
	};

	// init ace editor.
	var editor = ace.edit("editor");
	editor.setTheme("ace/theme/twilight");
	editor.getSession().setMode("ace/mode/javascript");
	editor.commands.addCommand({
		name:'run code',
		bindKey: {win:'Ctrl-R', mac:'Command-R'},
		exec: function() {
			var code = editor.getValue();
			deferred = setTimeout(function(){
				showSpin();
			},300);
			requestIOServer(code);
		}
	});

	var spinOpt = {radius:6, width:3};
	var cssSpinShow = {"color":"rgba(255,255,255,0)", "text-shadow":"none"};
	var cssSpinHide = {"color":"", "text-shadow":""};

	var html = $('html');
	var notification = $('.bottom-right');
	var popupMsg	= $('aside div p');
	var runBtn		= $('.container button');
	var deferred;

	var runUrl = window.location.origin + '/run';
	var runSocket = io.connect(runUrl);

	// disable auto resize font change while in animation.
	// if you want to allow it, "editor.renderer.$textLayer.$pollSizeChanges()".
	// see also "https://github.com/ajaxorg/ace/issues/1014".
	clearInterval(editor.renderer.$textLayer.$pollSizeChangesTimer);

	// for test
	function requestServer(code) {
		$.ajax({
			url:'/run_code',
			type:'POST',
			data:{'code':code},
			dataType:'json',
			success: function(res) {
				showResult(res.result);
			},
			error: function() {
				showResult();
			}
		});
	}

	function requestIOServer(code) {
		runSocket.emit('run_code', {'code':code});
	}

	function showSpin() {
		runBtn.spin(spinOpt);
		runBtn.css(cssSpinShow);
	}

	function hideSpin() {
		clearTimeout(deferred);
		runBtn.spin(false);
		runBtn.css(cssSpinHide);
	}

	function showResult(result) {
		hideSpin();

		// error
		if (!result || result.error) {
			console.log('error!!');
			return;
		}
		// console.log(result);
		popupMsg.html(result);
		Avgrund.show('#default-popup');
	}
	
	// handle "RunOnButton" click evnet.
	$('#wrap .container .btn').on('click', function(e) {
		e.preventDefault();

		var code = editor.getValue();
		deferred = setTimeout(function(){
			showSpin();
		},300);

		requestIOServer(code);
	});

	runSocket.on('connect', function() {
		console.log('[run socket connected]');
	});

	runSocket.on('error', function(data) {
		hideSpin();
		notification.notify({
			message: { text:'[error] : ' + data.error },
			type:'error'
		}).show();
	});

	runSocket.on('console', function(data) {
		notification.notify({
			message: { text:'[console] : ' + data.result },
			type:'info'
		}).show();
	});

	runSocket.on('run_result', function(data) {
		hideSpin();

		if (data.hasLog) {
			if (html.hasClass('avgrund-active')) Avgrund.hide();
			notification.notify({
				message: { text:'[return] : ' + data.result } 
			}).show();
		} else {
			showResult(data.result);
		}
	});
})();
