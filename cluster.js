var	cluster = require("cluster")
	,	modules = {
			path: require("path")
		,	async: require("async")
		,	sessionStore: require("sessionStore")
		,	database: require("queriesManager")
		,	crypt: require("crypt")
		,	commander: require("commandCenter")
		}
	,	config = require("./clusterConfig")
	,	appConfig = require("./appConfig")
	,	errorCodes = require("./errorCodes")
	,	restartWorker
	,	commands = {
			"eval": function(args, pass){
				var i
					,	len
					,	status;

				for(i = 1, len = args.length; i < len; ++i){
					status = eval(args[i]);
				}
				pass(status);
			}
		,	"restart": restart
		,	"start": start
		,	"stop": function stop(args, pass){
				Object.keys(cluster.workers).forEach(function(id){
					cluster.workers[id].destroy();
				});
				pass(true);
			}
		,	"workers": function(args, pass){
				console.log(cluster.workers);
				pass(true);
			}
		,	"kickall": function(args, pass){
				modules.sessionStore.endAll(function(){
					console.log("All users kicked");
					pass(true);
				});
			}
		,	"addUser": function(args, pass){
				process.stdout.write("New user nick: ");
				modules.commander.getLine(function(nick){
					modules.database({
						type: "getUser"
					,	arguments: [ nick ]
					}, function(err, resp){
						if(err){
							console.log(err);
							pass(false);
						}else if(resp[0].length){
							console.log("\tA user with this nick already exists");
							pass(false);
						}else{
							process.stdout.write("Password: ");
							modules.commander.getPassword(function(password){
								modules.crypt.encrypt(password, function(dgst){
									modules.database({
										type: "addUser"
									,	arguments: [ nick, dgst.hash, dgst.salt ]
									}, function(err, resp){
										if(err){
											console.log(err);
											pass(false);
										}else{
											console.log(resp);
											pass(true);
										}
									});
								});
							});
						}
					});
				});
			}
		,	"delUser": function(args, pass){
				if(args[1]){
					modules.database({
						type: "delUser"
					,	arguments: [ args[1] ]
					}, function(err, resp){
						if(err){
							console.log(err);
							pass(false);
						}else{
							console.log(resp);
							kick(args, pass);
						}
					});
				}else{
					console.log("\tWhat user you're saying...");
					pass(false);
				}
			}
		,	"kick": kick
		,	"makeBackup": require("./backup.js")(modules)
		,	"loadBackup": require("./backupRestore.js")(modules)
		};

function setConfiguration(next){
	config.cluster.exec = modules.path.join(__dirname, config.cluster.exec);
	config.forkEnv.numCPUs = require("os").cpus().length;
	appConfig.database.initQueries = false;
	appConfig.database.queriesModule = require("queries");
	
	next(null);
}

function configurateModules(next){
	modules.commander = modules.commander(config.commander);
	
	modules.crypt = modules.crypt(appConfig.crypt);
	modules.sessionStore = modules.sessionStore(appConfig.sessionStore);
	next(null);
}

function getPassword(next){
	var idx = process.argv.indexOf("-p")
		,	password;

	if(idx !== -1){
		idx += 1;
		password = process.argv[idx];
		if(password){
			return next(null, password);
		}
	}
	console.log("Password to MySQL database:");
	modules.commander.getPassword(function(password){
		next(null, password);
	});
}
	
function configureWorkers(password, next){
	var errs = []
		,	i;
	for(i = 0; i < config.forkEnv.numCPUs; ++i){
		errs.push({
			code: null
		,	timeout: null
		});
	}
	config.forkEnv.__PASSWORD = password;
	cluster.setupMaster(config.cluster);
	
	cluster.on("exit", function(worker, code, signal){
		var env = clone(config.forkEnv)
			,	newWorker;
		env.threadNum = worker.__threadNum;

		console.log(worker.process.pid + " died, threadNum: " + worker.__threadNum);
		if(worker.suicide === false){
			if(restartWorker.isOnline(worker.id)){
				restartWorker.offline(worker.id);
				newWorker = cluster.fork(env);
				newWorker._events = worker._events;
				newWorker.__threadNum = env.threadNum;
			} else {
				console.log(worker.process.pid + " ended its misery due to some init bug. It won't be automatically restarted because of potential fatal code error.");
				restartWorker.stop();
			}
		}else if(restartWorker.last() === worker.id){
			cluster.fork(env).on("listening", function(newWorker, address){
				restartWorker.online(worker.id);
				restartWorker(worker.id);
			}).__threadNum = env.threadNum;
		}
	});
	
	cluster.on("online", function(worker){
		console.log("Worker " + worker.process.pid + " online");
		worker.on("message", function(msg){
			console.log("___message___received___");
			console.log(msg);
		});
	});

	next(null);
}

function fork(next){
	var i
		,	forkEnv = config.forkEnv;
	
	forkEnv.logInit = config.init.log;
	start(null, function(){
		next(null);
	});
}

function runDatabase(next){
	appConfig.database.password = config.forkEnv.__PASSWORD;
	modules.database(appConfig.database)(function(err, qrMod){
		if(err){
			console.log("Weird database init error:\n" + err);
			process.exit(4);
		}else{
			modules.database = qrMod;
			next(null);
		}
	});
}

function runCommander(){
	modules.commander.start(commands);
}

function clone(o){
	return JSON.parse(JSON.stringify(o));
}

function sendMessage(msg, cb){
	var worker = cluster.workers;
	worker = worker[Object.keys(worker)[0]];
	cb = cb || function(){};
	if(worker){
		worker.send(msg);
		cb(true);
	}else{
		console.log("No workers available");
		cb(false);
	}
}

function restart(args, pass){
	var pid = process.pid.toString();
	restartWorker.init({
		args: Object.keys(cluster.workers)
	,	callback: pass
	,	destroyed: pid
	})(pid);
}

/**	
	*	Argument passed to the function is
	*	authorization id - if function is 
	*	called by something that isn't the
	*	last worker, then nothing happens
	*/
restartWorker = (function(){
	var args = null
		,	callback = null
		,	destroyed = null
		,	ids = {}
		,	my = function(id){
			if(id === destroyed && args !== null){
				if(args.length){
					destroyed = 0|args.shift();
					cluster.workers[destroyed].destroy();
				}else{
					finish();
				}
			}
		};
	
	function isOnline(id) {
		return ids[id] === true;
	}
	my.isOnline = isOnline;

	function online(id) {
		return ids[id] = true;
	}
	my.online = online;

	function offline(id) {
		if(ids.hasOwnProperty(id) && ids[id] === true) {
			delete ids[id];
			return true;
		} else {
			return false;
		}
	}
	my.offline = offline;

	function isSaturated() {
		return Object.keys(ids).length === config.forkEnv.numCPUs;
	}
	my.isSaturated = isSaturated;

	my.init = function(state){
		args = state.args || args;
		callback = state.callback || callback || function(){};
		destroyed = state.destroyed || destroyed;
		offline(destroyed);
		return my;
	};
	
	my.last = function(){
		return destroyed;
	};
	
	my.callback = function(){
		return callback;
	};

	my.stop = function(){
		var cb = callback;
		args = null;
		callback = null;
		destroy = null;
		if(cb && typeof cb === "function") {
			cb(false);
		}
	};

	function finish(){
		var cb = callback
			,	i
			,	workersArr = Object.keys(cluster.workers)
			,	worker
			,	arr = []
			,	forkEnv = clone(config.forkEnv);
		args = null;
		callback = null;
		destroy = null;
		for(i = 0; i < forkEnv.numCPUs; ++i){
			if(worker = cluster.workers[workersArr[i]]){
				arr.push(worker.__threadNum);
			}
		}
		if(workersArr.length){
			for(i = 0; i < forkEnv.numCPUs; ++i){
				if(arr.indexOf(i) === -1){
					forkEnv.threadNum = i;
					cluster.fork(forkEnv).__threadNum = i;
				}
			}
			cb(true);
		}else{
			start(null, cb);
		}
	}
	
	return my;
})();

function start(args, pass){
	var forkEnv;
	pass = pass || function(){};
	if(Object.keys(cluster.workers).length){
		console.log("Some threads are running, stop them first or use restart");
		pass(false);
	}else{
		cluster.on("listening", function(worker){
			var i
				,	worker;
			if(worker.__threadNum === 0){
				cluster.removeAllListeners("listening");
				
				if(forkEnv.numCPUs > 1){
					forkEnv = clone(config.forkEnv);
					for(i = 1; i < forkEnv.numCPUs; ++i){
						forkEnv.threadNum = i;
						worker = cluster.fork(forkEnv);
						worker.__threadNum = i;
					}
					worker.on("listening", function(){
						restartWorker.online(worker.id);
						worker.removeAllListeners("listening");
						pass(true);
					});
				}else{
					pass(true);
				}
			}
		});
		
		forkEnv = clone(config.forkEnv);
		forkEnv.threadNum = 0;
		cluster.fork(forkEnv).__threadNum = 0;
	}
}

function kick(args, pass){
	if(args[1]){
		modules.sessionStore.kick(args[1], function(){
			pass(true);
		});
	}else{
		console.log("\tWhom to kick you say?");
		pass(false);
	}
}

modules.async.waterfall([
	setConfiguration
,	configurateModules
,	getPassword
,	configureWorkers
,	fork
,	runDatabase
], runCommander);
