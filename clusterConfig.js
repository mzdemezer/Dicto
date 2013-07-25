module.exports = {
	init: {
		log: false
	}
,	cluster: {
		exec: "app.js"
	,	silent: false
	}
,	forkEnv: {
		minPoolSize: 10
	,	cluster: true
	,	logDatabase: false
	}
,	commander: {
		prompt: "Dicto$ "
	}
}
