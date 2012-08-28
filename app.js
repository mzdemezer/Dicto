var http = require("http")
	,	express = require("express")
	,	loggedStore = require("loggedStore")
	,	store = loggedStore({ reapInterval: 3600000 })
	,	mysql = require("mysql")
	,	crypt = require("crypt")
	,	database
	,	app = express()
	,	query = require("queries")
	,	jsonicate = require("fileJSONicator")
	,	files
	,	urlParams = require("urlParams")(app)
	,	reqFileParams = require("reqFileParams");

app.configure(function(){
  app.set("port", process.env.PORT || 80);
  app.set("views", __dirname + "/views");
  app.set("view engine", "jade");
	app.set("view options", { layout: false });
  app.use(express.logger("dev"));
	app.use(express.favicon(/*__dirname + path*/));
  app.use(express.bodyParser());
	app.use(express.cookieParser());
	app.use(store.authenticate);
  app.use(express.methodOverride());
  app.use(app.router);
	app.use(errorHandler);
  app.use(express.static(__dirname + "/public"));
});

app.configure("development", function(){
  app.use(express.errorHandler());
});

app.param("word", function(req, res, next, word){
	req.word = word.toLowerCase();
	next();
});

app.param("test", (function(){
	var	tests = [
				"fill"
			,	"match"
			];

	return function(req, res, next, testName){
		if(isIn(testName, tests)){
			req.testName = testName;	
			next();
		}else{
			throw new Error("No such test as " + testName + " is implemented.");
		}
	}
})());

app.get("/", function(req, res, next){
	var opts = {
		userId: ""
	, otherFiles: reqFileParams("index")
	};
	if(req.logged){
		opts.userId = req.cookies["logged-user-id"].userId;
	}
  res.render("index", opts);
});

app.get(urlParams.register("/standard"), urlParams("/standard"), function(req, res, next){
	var otherFiles = []
		,	i
		,	url_files = req.body.urlParams.files;
	try{
		url_files = JSON.parse(url_files);
		for(i = 0; i < url_files.length; ++i){
			if(files[url_files[i]]){
				otherFiles.push(files[url_files[i]]);
			}
		}
	}catch(err){
		otherFiles = [];
	}
	res.json(files.standard.concat(otherFiles));
});

app.post("/login", function loginValidate(req, res, next){
	database.query(query.getUser(req.body.userId), function(err, rows, fields){
		if(err){
			res.send(500);
		}else{
			if(rows.length === 0){
				crypt.encrypt(crypt.random());
				res.send(401);
			}else{
				if(crypt.isPassword(req.body.password, rows[0].passHash, rows[0].salt)){
					store.newSession(req.body.userId, crypt.random(), res);
					res.send(200);
				}else{
					res.send(401);
				}
			}
		}
	});
});

app.post("/logout", function(req, res, next){
	if(req.logged){
		store.endSession(req, res);
		res.send(200);
	}else{
		next();
	}
});

app.post("/newUser", function(req, res, next){
	database.query(query.getUser(req.body.userId), function(err, rows, fields){
		if(rows.length === 0){
			var encryption = crypt.encrypt(req.body.password);
			
			database.query(query.insertUser(req.body.userId, encryption.hash, encryption.salt), function(err, rows, fields){
				if(err){
					console.log(err);
					res.send(err, 500);
				}else{
					store.newSession(req.body.userId, crypt.random(), res);
					res.send(201);
				}
			});
		}else{
			res.send(409);
		}
	});
});

app.del("/deleteUser", requireLogged(function(req, res, next){
	res.send(401);
}), function(req, res, next){
	var userId;
	userId = store.endSession(req, res);
	database.query(query.delUser(userId), function(err, rows, fields){
		if(err){
			res.send(500)
		}else{
			res.send(204);
		}
	});
});

app.get("/search/:word", function(req, res, next){
  database.query(query.word(req.word), function(err, rows, fields){
		if(err){
			next(err, req, res);
		}else{
			if(rows.length === 0){
				database.query(query.contain(req.word), function(err, rows, fields){
					if(err){
						next(err, req, res);
					}else{
						res.json(rows);
					}
				});
			}else{
				res.json(rows[0]);
			}
		}
	});
});

app.get(urlParams.register("/chapters"), urlParams("/chapters"), function(req, res, next){
	database.query(query.chapter(req.body.urlParams), function(err, rows, fields){
		if(err){
			next(err, req, res);
		}else{
			res.json(rows);
		}
	});
});

app.get(urlParams.register("/count"), urlParams("/count"), function(req, res, next){
	database.query(query.count(req.body.urlParams), function(err, rows, fields){
		if(err){
			next(err, req, res);
		}else{
			res.json(rows);
		}
	});
});

app.post("/edit", requireLogged(function(req, res, next){
	res.send(401);
}), function(req, res, next){
	database.query(query.word(req.body.word), function(err, rows, fields){
		if(err){
			next(err, req, res);
		}else{
			if(rows.length){
				database.query(query.modify(req.body), function(err, rows, fields){
					if(err){
						next(err, req, res);
					}else{
						res.send("Edited: " + req.body.word, 200);
					}
				});
			}else{
				req.body.learnt = 0;
				database.query(query.insert(req.body), function(err, rows, fields){
					if(err){
						next(err, req, res);
					}else{
						res.send("Added: " + req.body.word, 201);
					}
				});
			}
		}
	});
});

app.del("/edit/:word", requireLogged(function(req, res, next){
	res.send(401);
}), function(req, res, next){
	database.query(query.del(req.word), function(err, rows, fields){
		if(err){
			next(err, req, res);
		}else{
			res.send("Deleted: " + req.word, 200);
		}
	});
});

app.get("/learn", requireLogged(), function(req, res, next){
	var opts;

	opts = {
		userId: ""
	, otherFiles: reqFileParams("learn")
	};
	if(req.logged){
		opts.userId = req.cookies["logged-user-id"].userId;
	}
	res.render("learn", opts);

});

app.get("/test", requireLogged(), function(req, res, next){
	var opts;

	opts = {
		userId: 0//req.cookies["logged-user-id"].userId
	, otherFiles: reqFileParams("test")
	};

	res.render("test", opts);
});
 
app.get(urlParams.register("/test/:test"), urlParams("/test/:test"), requireLogged(), function(req, res, next){
	var opts;

	database.query(query.chapter(req.body.urlParams), function(err, rows, fields){
		opts = {
			userId: 0//req.cookies["logged-user-id"].userId
		, otherFiles: reqFileParams(req.testName)
		,	words: JSON.stringify(rows)
		};

		res.render(req.testName, opts);
	});
});

app.post("/test/update", requireLogged(), function(req, res, next){
	database.query(query.learn(req.body.words), function(err, rows, fields){
		if(err){console.log("err: " + err);
			next()
		}else{
			res.send(204);
		}
	});
});

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
					"/public/stylesheets/style.css"
				,	"/public/javascripts/jquery.js"
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
})();


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
				if(type	=== protoName(b)){
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
