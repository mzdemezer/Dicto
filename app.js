// var http = require("http")
// 	,	express = require("express")
// 	,	loggedStore = require("loggedStore")
// 	,	store = loggedStore({ reapInterval: 3600000 })
// 	,	mysql = require("mysql")
// 	,	crypt = require("crypt")
// 	,	database
// 	,	app = express()
// 	,	query = require("queries")
// 	,	jsonicate = require("fileJSONicator")
// 	,	files
// 	,	urlJSON = require("urlJSON")(app)
// 	,	reqFileParams = require("reqFileParams");
	
var cluster = require("cluster")
	,	express = require("express")
	,	app
	,	modules = {
			path: require("path")
		,	crypt: require("crypt")
		,	async: require("async")
		,	jsdom: require("jsdom")
		,	sessionStore: require("sessionStore")
		,	errorCodes: require("./errorCodes.js")
		,	validate: require("validate")
		,	database: require("queriesManager")
		,	utils: require("utils")
		,	nodeUtil: require("util")
		,	queryUtil: require("queryUtil")
		}
	,	stdinUtils = require("stdinUtils")
	,	config = require("./appConfig")
	,	errorHandlers = {};

modules.async.waterfall([
	threadInit
,	setConfiguration
,	getPassword
,	configureDatabase
,	initDatabase
,	configurePreAppModules
,	configureApp
,	configurePostAppModules
,	configureRoutes
], startApp);

function threadInit(next){
	if(~~process.env.threadNum){
		config.database.initQueries = false;
	}
	next(null);
}

function setConfiguration(next){
	config.app.port = process.env.PORT || config.app.port;
	config.init.log = modules.validate.sParse(process.env.logInit, config.init.log);
	config.database.queriesModule = require("queries");
	config.database.poolSize = ~~process.env.poolSize || config.database.poolSize;
	config.database.log = modules.validate.sParse(process.env.logDatabase, config.database.log);
	config.database.cluster = modules.validate.sParse(process.env.cluster, config.database.cluster);
	config.database.numCPUs = ~~process.env.numCPUs;
	config.database.minSize = ~~process.env.minPoolSize || config.database.minSize;
	config.sessionStore.reapInterval = modules.validate.sParse(process.env.reapInterval, config.sessionStore.reapInterval);

	errorHandlers[modules.errorCodes.unauthorized] = redirectUnauthorized;
	errorHandlers[modules.errorCodes.dbDuplicate] = notifyDuplicates;
	errorHandlers[modules.errorCodes.emptyForm] = emptyFormHandler;
	next(null);
}

function getPassword(next){
	var idx
		,	password;
	if(cluster.isWorker && process.env.__PASSWORD){
		next(null, process.env.__PASSWORD);
	}else{
		idx = process.argv.indexOf("-p");
		if(idx !== -1){
			idx += 1;
			password = process.argv[idx];
			if(password){
				return next(null, password);
			}
		}
		console.log("Password to MySQL database:");
		stdinUtils.getPassword(function(password){
			next(null, password);
		});
	}
}

function configureDatabase(password, next){
	config.database.password = password;
	modules.database = modules.database(config.database);
	next(null);
}

function initDatabase(next){
	modules.database(function(err, qrMan){
		if(err){
			if(RegExp(modules.errorCodes.dbAccessDenied).exec(err)){
				console.log("Wrong password to MySQL database.");
				process.exit(3);
			}else{
				console.log(err);
				process.exit(4);
			}
		}
		modules.database = qrMan;
		next(null);
	});
}

function configurePreAppModules(next){
	modules.sessionStore = modules.sessionStore(config.sessionStore);
	modules.crypt = modules.crypt(config.crypt);
	modules.utils = modules.utils(config.app);
	next(null);
}

function configureApp(next){
	var publicPath = modules.path.join(__dirname, "public");
	
	app = express();
	app.configure(function(){
		app.set("port", config.app.port);
		app.set("views", modules.path.join(__dirname, "views"));
		app.set("view engine", "jade");
// 		app.set("view options", { layout: false });
		app.use(express.favicon());
		// app.use(function(req, res, next){
		// 	console.log("ip: " + req.ip);
		// 	next();
		// });
		app.use(express.logger("dev"));
		app.use(express.bodyParser({ keepExtensions: true, uploadDir: modules.path.join(__dirname, "uploads") }));
		app.use(express.cookieParser());
		app.use(express.methodOverride());
		app.use(modules.utils.useHostRedirect)
		app.use(app.router);
		app.use(require("stylus").middleware(publicPath));
		app.use(express.static(publicPath));
		app.use(errorHandler);
		app.use(renderError);
	});
	
	next(null);
}

function configurePostAppModules(next){
	next(null);
}

function configureRoutes(next){
	require("./routes/routes.js")(app, modules);
	next(null);
}


function startApp(){
	var port = app.get("port");
	app.listen(port, function(){
		console.log("Express server listening on port " + port);
	});
}


function errorHandler(err, req, res, next){
	var handler = errorHandlers[err];
	if(handler){
		handler(err, req, res, next);
	}else{
		console.log("error> " + err);
		req.error = err;
		req.statusCode = 500;
		next();
	}
}

function renderError(req, res, next){
	if(!req.error){
		req.error = "It's certainly not here, pal";
		req.statusCode = 404;
	}
	res.status(req.statusCode).render("error", {
		user: req.logged
	,	error: req.error
	});
}

function redirectUnauthorized(err, req, res, next){
	res.hostRedirect("/login?redirect=" + req.url);
}

function emptyFormHandler(err, req, res, next){
	res.redirect("back");
}

function notifyDuplicates(err, req, res, next){
	res.json(409, { body: req.duplicates });
}










function getTableName(err){
	return err.toString()
		.split(" ")[3]
		.slice(1, -1)
		.split(".")[1];
}

function requireLogged(errHandler){
	errHandler = errHandler || function(req, res, next){
		res.redirect("/");
	}

	return function(req, res, next){
		// next();
		if(req.logged){
			next();
		}else{
			errHandler(req, res, next);
		}
	}
}

function errorHandler(err, req, res, next){
	var query;
	if(err.code === "ER_NO_SUCH_TABLE"){
		query = getTableName(err);
		if(query === "words"){
			query = query.createWords();
			database.query(query, function(){
			console.log(query);
			res.render("index", { title: "404" });
			});
		}else{
			console.log("Unhandled error: " + err);
			next();
		}
	}else{
		console.log("Unhandled error: " + err);
		next();
	}
}

(function init(){
	function startServer(){
		console.log("The server is connected to MySQL database");		
		files = {
			standard: jsonicate([
					// "/public/stylesheets/style.css"
					"/public/javascripts/jquery.js"
				,	"/public/javascripts/jquery-ui.js"
				], __dirname)
		,	index: jsonicate([ "/public/javascripts/index.js" ],		__dirname)
		,	learn: jsonicate([ "/public/javascripts/learn.js" ], __dirname)
		,	test: jsonicate([ "/public/javascripts/test.js" ], __dirname)
		,	fill: jsonicate([ "/public/javascripts/fill.js" ], __dirname)
		,	match: jsonicate([ "/public/javascripts/match.js" ], __dirname)
		};

		app.listen(app.get("port"), function(){
			console.log("Express server listening on port " + app.get("port"));
		});
	}
	
	function removeNextLine(data){
		return /^([^\n\r]*)/.exec(data)[1];
	}
	
	function startApp(pass){
		pass = removeNextLine(pass);
		database = mysql.createConnection({
			host     : "localhost"
		,	user     : "root"
		,	password : pass
		});
		
		database.connect(function(err){
			if(!err){
				database.query("use Dicto;", function(err, rows, fields){
					if(err && err.code === "ER_BAD_DB_ERROR"){
						database.query(query.createDicto(), function(err, rows, fields){
							if(err){
								console.log("MySQL problem: cannot create database!");
							}else{
								database.query(query.createWords(), function(err, rows, fields){
									if(err){
										console.log("MySQL problem: cannot create words table!");
									}else{
										database.query(query.createUsers(), startServer);
									}
								});
							}
						});
					}else{
						startServer();
					}
				});
			}else{
				console.log("Problem with connection to MySQL:");
				console.log(err);
			}
		});
	}

	var password = process.argv[2];
	if(password && password != ""){
		startApp(password);
	}else{
		process.stdin.resume();
		process.stdin.setEncoding("utf8");
		process.stdin.on("data", function(data){
			process.stdin.pause();
			startApp(data);
		});
	}
});


function protoName(vArg){
	return Object.prototype.toString.call(vArg);
}

function uniqueComp(a, b){
	var type = typeof a
		,	i;
	if(type !== typeof b){
		return false;
	}else{
		switch(type){
			case "number":
				return a === b ||
					(isNaN(a) && isNaN(b));
			case "object":
				type = protoName(a);
				if(type === protoName(b)){
					switch(type){
						case "[object Array]":
							type = a.length;
							if(type !== b.length){
								return false;
							}
							for(i = 0; i < type; ++i){
								if(!uniqueComp(a[i], b[i])){
									return false;
								}
							}
							return true;
						case "[object Object]":
							for(i in a){
								if(!uniqueComp(a[i], b[i])){
									return false;
								}
							}
							return true;
						case "[object RegExp]":
							return a.toString() === b.toString();
						default:
							return a === b;
					}
				}else{
					return false;
				}
			default:
				return a === b;
		}
	}
}

/**
	Slightly modified standard:
	uniqueComp returns true for objects
	or arrays that have the same properties,
	although they may have different references,
	so:
	
	uniqueComp({prop: 5}, {prop: 5})
	//true
	
	{prop: 5} === {prop: 5}
	//false
	*/

function unique(arr){
	var a = []
		,	len = arr.length
		,	i
		,	j;

	for(i = 0; i < len; ++i) {
		for(j = 0; j < a.length; ++j) {
			if(uniqueComp(arr[i], a[j])){
				i += 1;
				j = 0;
			}
		}
		a.push(arr[i]);
	}
	return a;
};

function isIn(elem, arr){
	var i
		,	len;

	for(i = 0, len = arr.length; i < len; ++i){
		if(uniqueComp(elem, arr[i])){
			return true;
		}
	}
	return null;
}
