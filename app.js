var express = require('express')
  , http    = require('http')
	, socket  = require('socket.io')
  , path    = require('path')
	, vm      = require('vm')
	, colors  = require('colors');

var app    = express();
var server = http.createServer(app);
var io     = socket.listen(server);

function Sandbox(socket) {
	Sandbox.prototype.hasLog = false;
	this.console = new function() {
		this.log = function(msg) {
			Sandbox.prototype.hasLog = true;
			console.log('sandbox.log : '.cyan + msg);
			socket.emit('console', {result:msg, fromConsole:true});
		}
	};
};

process.on('uncaughtException', function(err) {
	console.log('== uncaughtException =='.yellow);
	console.log(err.toString().yellow);
});

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use('/public',express.static(path.join(__dirname, '/public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', function(req, res) {
	res.sendfile('views/index.html');
});

// for test
app.post('/run_code', function(req, res) {
	var code = req.body.code;
	if (!code) {
		res.send({'run_error':'you should request with some code'});
		return;
	}

	var result;
	try {
		result = vm.runInNewContext(code, {});
	} catch(e) {
		console.log(e.toString().yellow);
		res.send({'run_error':e.toString()});
		return;
	}
	console.log('vm result : '.green + result);
	res.send({'result':result});
});

io.of('/run').on('connection', function(socket) {
	socket.on('run_code', function(data) {
		var code = data.code;
		var result, sandbox;

		if (!code) {
			socket.emit(
				'run_error', 
				{success:false, error:'you should request with some code'}
			);
			return;
		}

		try {
			sandbox = new Sandbox(socket);
			result = vm.runInNewContext(code, sandbox);
		} catch(e) {
			console.log(e.toString().yellow);
			socket.emit('run_error', {success:false, error:e.toString()});
			return;
		}

		if (!result) {
			socket.emit('run_error', {success:false, error:'nothing has been executed'});
			return;
		}
		socket.emit(
			'run_result', 
			{success:true, result:result, hasLog:sandbox.hasLog}
		);
	});
});

server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
