var http = require("http")
	,	express = require("express")
	,	mysql = require("mysql")
  , http = require("http")
	// ,	process = require("process")
	,	database
	,	app = express()
	,	query = (function(){
			var queries = {
				createDicto: "CREATE DATABASE Dicto;"
			,	createWords: "CREATE TABLE words (word VARCHAR(40), type VARCHAR(4), explanation VARCHAR(10000), pronunciation VARCHAR(20), chapter INT, important BOOL, learnt BOOL);"
			,	chapter: "SELECT * FROM words WHERE chapter"
			,	word: "SELECT * FROM words WHERE word"
			, insertWord: "INSERT INTO words (word,type,explanation,pronunciation,chapter,important,learnt) VALUE "
			,	deleteWord: "DELETE FROM words WHERE word="
			,	learnt: "learnt=TRUE"
			,	notLearnt: "learnt=FALSE"
			, important: "important=TRUE"
			, notImportant: "important=FALSE"
			,	all: "SELECT * FROM words"
			,	orderByWord: " ORDER BY word"
			};
			
			function quoteString(str){
				return "'" + str.replace("\'", "\\\'").replace("\"", "\\\"") + "'";
			}
			
			function concatOptions(opt1, opt2){
				if(opt1 === ""){
					return opt2;
				}else if(opt2 === ""){
					return opt1;
				}else{
					return opt1 + " AND " + opt2;
				}
			}
			
			function getOptions(body){
				var qry;
				if(body.learnt === "0"){
					qry = queries.notLearnt;
				}else if(body.learnt != null){
					qry = queries.learnt;
				}else{
					qry = "";
				}
				
				if(body.important === "0"){
					qry = concatOptions(qry, queries.notImportant);
				}else if(body.important != null){
					qry = concatOptions(qry, queries.important);
				}
				
				return qry;
			}
			
			function insertQuery(word){
				var fieldArr = [word.word, word.type, word.explanation, word.pronunciation]
				,	i;
				for(i = 0; i < fieldArr.length; ++i){
					fieldArr[i] = quoteString(fieldArr[i]);
				}
				fieldArr = fieldArr.concat([~~word.chapter, ~~word.important, ~~word.learnt]).join();

				return queries.insertWord + "(" + fieldArr + ");";
			}

			function chapterQuery(body){
				var qry;
				if(body.to == null || body.to === body.from){
					qry = queries.chapter + "=" + body.from;
				}else{
					qry = queries.chapter + ">=" + body.from + " AND chapter<=" + body.to;
				}
				return concatOptions(qry, getOptions(body)) + queries.orderByWord + ";";
			}
			
			function wordQuery(word){
				return queries.word + "=" + quoteString(word) + ";";
			}
			
			function topQuery(word, limit){
				return queries.word + " LIKE " + quoteString("%" + word + "%") + " ORDER BY POSITION(" + quoteString(word) + " IN word)" + " LIMIT " + limit + ";";
			}
			
			function deleteQuery(word){
				return queries.deleteWord + quoteString(word) + ";";
			}
			
			function allQuery(body){
				var qry = getOptions(body);
				if(qry === ""){
					qry = queries.all;
				}else{
					qry = queries.all + " WHERE " + qry;
				}
				qry += queries.orderByWord + ";";
				return qry;
			}
			
			return {
				createDicto: function(){return queries.createDicto;}
			,	createWords: function(){return queries.createWords;}
			,	insert: insertQuery
			,	word: wordQuery
			,	top: function(wrd){return topQuery(wrd, 20);}
			,	chapter: chapterQuery
			,	del: deleteQuery
			,	all: allQuery
			};
		})();

app.configure(function(){
  app.set("port", process.env.PORT || 80);
  app.set("views", __dirname + "/views");
  app.set("view engine", "jade");
	app.set("view options", { layout: false });
  app.use(express.logger("dev"));
  app.use(express.bodyParser());
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

app.get("/", function(req, res, next){
  res.render("index");
});

app.get("/search/:word", function(req, res, next){
  database.query(query.word(req.word), function(err, rows, fields){
		if(err){
			next(err, req, res);
		}else{
			if(rows.length === 0){
				database.query(query.top(req.word), function(err, rows, fields){
					if(err){
						next(err, req, res);
					}else{
						res.json(rows);
					}
				});
			}else{
				res.json(rows);
			}
		}
	});
});

app.get("/WR/:word", function getWRword(req, res){
	var WRreq = http.get("http://www.wordreference.com/fren/" + req.word, function(resp){
		resp.on("data", function(chunk){
			res.send(chunk);
		});
	}).on("error", function(err){
		console.log("HTTP GET error: " + err.message);
		res.send("HTTP GET error: " + err.message);
	});
});

function addParamsToURL(str){
	str.replace("/", "\\\/");
	return RegExp("^" + str + "?([^\/]*)$")
}

function parseGetJSON(str){
	var i
		,	json = {};
	if(str[0] === "?"){
		str = str.slice(1);
	}
	str = str.split("&");
	
	for(i = 0; i < str.length; ++i){
		str[i] = str[i].split("=");
		json[str[i][0]] = str[i][1]
	}
	return json;
}

function parseURLjson(URLregExpStr){
	URLregExpStr = addParamsToURL(URLregExpStr);
	return function(req, res, next){
		req.body = parseGetJSON(URLregExpStr.exec(req.url)[1]);
		next();
	};
}

app.get(addParamsToURL("/all"), parseURLjson("/all"), function(req, res, next){
	database.query(query.all(req.body), function(err, rows, fields){
		if(err){
			next(err, req, res);
		}else{
			res.json(rows);
		}
	});
});

app.get(addParamsToURL("/chapters"), parseURLjson("/chapters"), function(req, res, next){
	database.query(query.chapter(req.body), function(err, rows, fields){
		if(err){
			next(err, req, res);
		}else{
			res.json(rows);
		}
	});
});

app.post("/edit", function(req, res, next){
	database.query(query.del(req.body.word), function(err, rows, fields){
		if(err){
			next(err, req, res);
		}else{
			database.query(query.insert(req.body), function(err, rows, fields){
				if(err){
					next(err, req, res);
				}else{
					res.send("Edited: " + req.body.word);
				}
			});
		}
	});
});

app.del("/edit/:word", function(req, res, next){
	database.query(query.del(req.word), function(err, rows, fields){
		if(err){
			next(err, req, res);
		}else{
			res.send("Deleted: " + req.word);
		}
	});
});

function getTableName(err){
	return err.toString()
		.split(" ")[3]
		.slice(1, -1)
		.split(".")[1];
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
		app.listen(app.get("port"), function(){
			console.log("Express server listening on port " + app.get("port"));
		});
	}

	function startApp(pass){
		pass = /^([^\n\r]*)/.exec(pass)[1];
		database = mysql.createConnection({
			host     : "localhost"
		,	user     : "root"
		,	password : pass
		});
		process.stdin.pause();
		database.connect(function(err){
			if(!err){
				database.query("use Dicto;", function(err, rows, fields){
					if(err && err.code === "ER_BAD_DB_ERROR"){
						database.query(query.createDicto(), function(err, rows, fields){
							if(err){
								console.log("MySQL problem: cannot create database!");
							}else{
								database.query(query.createWords(), startServer);
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
		process.stdin.on("data", startApp);
	}
})();
