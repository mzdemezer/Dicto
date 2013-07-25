module.exports = function(app, mds){
	var routes = []
		,	util = require("util")
		,	routeFuncs = {
				requireLogged: requireLogged
			}
		,	routeFuncsMd;
	
	routeFuncsMd = function(funcName){
		if(typeof funcName === "string"
		&& routeFuncs.hasOwnProperty(funcName)){
			return routeFuncs[funcName];
		}else{
			console.log("Modules.routeFuncs> Invalid funcName: " + funcName);
		}
	}
	
	addRoutes([
		"./all.js"
	,	"./index.js"
	,	"./login.js"
	,	"./search.js"
	,	"./edit.js"
	,	"./learn.js"
	,	"./test.js"
	]);
	setRoutes();
	
	function addRoute(route){
		routes.push(require(route));
	}
	
	function addRoutes(newRoutes){
		if(util.isArray(newRoutes)){
			routes = routes.concat(newRoutes);
		}else{
			routes.push(newRoutes);
		}
	}
	
	function setRoutes(){
		for(var i = 0, len = routes.length; i < len; ++i){
			require(routes[i])(app, mds, routeFuncsMd);
		}
	}
	
	function requireLogged(func){
		var func = func || function(req, res, next) {
				next(mds.errorCodes.unauthorized);
			};
		return function (req, res, next){
			if(req.logged){
				next();
			}else{
				func(req, res, next);
			}
		}
	}
	
	/*
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
	};
	if(req.logged){
		opts.userId = req.cookies["logged-user-id"].userId;
	}
  res.render("index", {
		user: req.logged
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

app.get(urlJSON.register("/chapters"), urlJSON("/chapters"), function(req, res, next){
	database.query(query.chapter(req.body.urlJSON), function(err, rows, fields){
		if(err){
			next(err, req, res);
		}else{
			res.json(rows);
		}
	});
});

app.get(urlJSON.register("/count"), urlJSON("/count"), function(req, res, next){
	database.query(query.count(req.body.urlJSON), function(err, rows, fields){
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
 
app.get(urlJSON.register("/test/:test"), urlJSON("/test/:test"), requireLogged(), function(req, res, next){
	var opts;

	database.query(query.chapter(req.body.urlJSON), function(err, rows, fields){
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
*/
};
