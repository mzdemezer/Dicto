$(function(){
	var fields = [
				"word"
			,	"type"
			,	"pronunciation"
			,	"explanation"
			,	"chapter"
			,	"important"
			,	"learnt"
			]
		,	$selectors = {
				content: $("#content")
			,	textWord: $("#textWord")
			,	def: $("#def")
			,	searchForm: $("#searchForm")
			,	editForm: $("#editForm")
			,	del: $("#del")
			,	chapterText: $("#chapterText")
			,	chapterButton: $("#chapterButton")
			,	buttonAll: $("#buttonAll")
			,	selLearnt: $("#selLearnt")
			,	selImpo: $("#selImpo")
			,	selType: $("#selType")
			,	info: $("#info")
			,	loginForm: $("#loginForm")
			,	loginWrapper: $("#loginWrapper")
			,	loginId: $("#loginId")
			,	loginPass: $("#loginPass")
			,	buttonLogin: $("#buttonLogin")
			,	userInfo: $("#userInfo")
			,	userPanel: $("#userPanel")
			,	buttonRegister: $("#buttonRegister")
			,	registerWrapper: $("#registerWrapper")
			,	buttonDelete: $("#buttonDelete")
			,	studyWrapper: $("#studyWrapper")
			,	WRiframe: $("#WRiframe")
			}
		,	chaptersPattern = /([1-9]\d*|\d)\s*-\s*([1-9]\d*|\d)|([1-9]\d*|\d)/g;
	
	(function init(){
		var i
			,	user = $selectors.userInfo.text()
			,	opa = $(".opa");
		for(i = 0; i < fields.length; ++i){
			$selectors[fields[i]] = $("#" + fields[i]);
		}
		
		$selectors.selType
			.children()
			.slice(1)
			.clone()
			.appendTo($selectors.type);		
		
		overwriteSubmit($selectors.searchForm, submitSearch);
		overwriteSubmit($selectors.editForm, submitEdit);
		
		if(user){
			$selectors.loginWrapper.hide();
			$selectors.registerWrapper.hide();
			$selectors.userInfo.text("Welcome " + user + "!");
			$selectors.buttonLogin.attr("value", "Log out");
			overwriteSubmit($selectors.loginForm, submitLogout);
			deleteUserClick(submitDeleteUser);
		}else{
			$selectors.userInfo.text("Log in");
			overwriteSubmit($selectors.loginForm, submitLogin);
			$selectors.buttonDelete.hide();
			$selectors.studyWrapper.hide();
		}
		
		$(".opa input, .opa a")
			.on("focus", function(){
				opa.addClass("opafocus");
			}).on("blur", function(){
				opa.removeClass("opafocus");
			});
		
		__render();
		
		$selectors.buttonRegister.on("click", activateRegister);
		
		$selectors.del.on("click", submitDel);
		
		$selectors.chapterButton.on("click", getWordsFromChapters);
		
		$selectors.buttonAll.on("click", getAll);
	})();



	function parseWord(wordObj){
		var parsed
			,	word = wordObj.word;

		if(wordObj.important == null ||
			!!wordObj.important == false){
			parsed = $("<span>");
		}else{
			parsed = $("<em>");
		}
		
		if(wordObj.learnt){
			parsed.addClass("learnt");
		}else{
			parsed.addClass("notlearnt");
		}
		
		parsed = $("<a>")
			.attr("href", "#")
			.on("click", function(){ getWord(word); return false; })
			.append(parsed.text(word))
			.append(" - " + wordObj.explanation)
			.addClass("foundWord");
		return parsed;
	}
	
	function fillForm(wordObj){
		var i;
		for(i = 0; i < fields.length; ++i){
			switch($selectors[fields[i]][0].type){
				case "checkbox":
					$selectors[fields[i]][0].checked = !!(~~wordObj[fields[i]]);
					break;
				default:
					$selectors[fields[i]][0].value = wordObj[fields[i]];
			}
		}
	}
	
	function emptyForm(){
		var i;
		for(i = 0; i < fields.length; ++i){
			$selectors[fields[i]][0].value = "";
		}
	}
	
	function formToWordObj(){
		var wordObj = {}
			,	i;
		for(i = 0; i < fields.length; ++i){
			switch($selectors[fields[i]][0].type){
				case "checkbox":
					wordObj[fields[i]] = ~~$selectors[fields[i]][0].checked;
					break;
				default:
					wordObj[fields[i]] = $selectors[fields[i]][0].value;
			}
		}
		return wordObj;
	}
	
	function getWord(word){
		$.get("/search/" + word, appendWords);
		getWR(word);
	}
	
	function getWR(word){
		$selectors.WRiframe.attr("src", "http://www.wordreference.com/fren/" + word);
	}
	
	function appendWords(data){
		var $list = $("<ul>")
			,	i
			,	len = data.length;
		
		if(len === 1){
			fillForm(data[0]);
		}else if(len === 0){
			emptyForm();
			$selectors.def.empty();
		}else{
			for(i = 0; i < len; ++i){
				$("<li>").html(parseWord(data[i])).appendTo($list);
			}
			$selectors.def.empty();
			$selectors.def.append($("<p>").text(len + " search results:")).append($list)
		}
	}
	
	function submitSearch(){
		getWord($selectors.textWord[0].value);
	}
	
	function postWord(word){
		$.ajax({
			type: "POST"
		,	url: "/edit"
		,	data: word
		,	success: function(data){
				$selectors.info.text(data);
			}
		,	statusCode: {
				401: tellToLogIn
			}
		});
	}
	
	function tellToLogIn(){
		alert("You have to be logged in to change content");
	}
	
	function submitEdit(){
		postWord(formToWordObj());
	}
	
	function delWord(word, func){
		$.ajax({
			type: "DELETE"
		,	url: "/edit/" + word
		,	success: function(data){
				$selectors.info.text(data);
			}
		,	statusCode: {
				401: tellToLogIn
			}
		});
	}
	
	function submitDel(){
		delWord($selectors.word[0].value);
	}
	
	function catchChapters(str){
		var chaps = []
			,	group;

		while(group = chaptersPattern.exec(str)){
			if(group[3] != null){
				group = [ ~~group[3] ];
				group[1] = group[0];
			}else{
				group = [ ~~group[1], ~~group[2] ];
				group = [
					Math.min(group[0], group[1])
				,	Math.max(group[0], group[1])
				];
			}

			chaps.push(group);
		}
		
		if(!chaps.length){
			chaps.push([0, 0]);
		}
		
		return minificateChapters(chaps);
	}
	
	function minificateChapters(arr){
		var i
			,	j;
		
		arr = arr || [];
		
		if(arr.length){
			arr = arr.sort(function(a, b){
				if(a[0] === b[0]){
					if(a.length === 2 && b.length === 2){
						return a[1] - b[1];
					}else{
						return a.length - b.length;
					}
				}else{
					return a[0] - b[0];
				}
			});

			for(i = 0, j = 1; j < arr.length;){
				if(arr[i][1] + 1 >= arr[j][0]){
					arr[i] = [
						Math.min(arr[i][0], arr[j][0])
					,	Math.max(arr[i][1], arr[j][1])
					];
					arr.splice(j, 1);
				}else{
					i += 1;
					j += 1;
				}
			}
		}
		
		for(i = 0; i < arr.length; ++i){
			if(arr[i][0] === arr[i][1]){
				arr[i] = [arr[i][0]];
			}
		}

		return arr;
	}

	function stringifyChapters(arr){
		var str = []
			,	i
			,	len = arr.length;
		
		for(i = 0; i < len; ++i){
			if(arr[i][0] === arr[i][1]){
				str[i] = arr[i][0] + "";
			}else{
				str[i] = arr[i].join(" - ");
			}
		}
		
		return str.join(", ");
	}

	function getChapters(str, opts){
		opts = opts || {};

		opts.chapters = catchChapters(str || "0");

		return opts;
	}
	
	function controlChapters($input, opts){
		opts = opts || {};

		opts = getChapters($input.attr("value"), opts);

		$input.attr("value", stringifyChapters(opts.chapters));
		
		opts.chapters = JSON.stringify(opts.chapters);

		return opts;
	}
	
	function getSearchOptions(opt){
		var i
			,	optArr;
		opt = opt || {};
		
		optArr = [
			{ value: $selectors.selImpo.attr("value"), prop: "important" }
		,	{ value: $selectors.selLearnt.attr("value"), prop: "learnt" }
		,	{ value: $selectors.selType.attr("value"), prop: "type" }
		];
		
		for(i = 0; i < optArr.length; ++i){
			if(optArr[i].value !== "all"){
				opt[optArr[i].prop] = optArr[i].value;
			}
		}

		return opt;
	}
	
	function getWordsFromChapters(){
		var options = getSearchOptions(controlChapters($selectors.chapterText));
		
		$.get("/chapters", options, appendWords);
	}
	
	function getAll(){
		var options = getSearchOptions({ chapters: "all" });
		
		$.get("/chapters", options, appendWords);
	}

	function submitLogin(){
		var loginData = {
			userId: $selectors.loginId[0].value
		,	password: $selectors.loginPass[0].value
		};
		$.ajax({
			type: "POST"
		,	url: "/login"
		,	data: loginData
		,	success: function(data){
				console.log(data);
				
				loginAnimation(loginData.userId);
				overwriteSubmit($selectors.loginForm, submitLogout);
				deleteUserClick(submitDeleteUser);
			}
		,	statusCode: {
				401: function(){
					alert("Bad login or password");
					$selectors.loginPass.attr("value", "");
				}
			,	500: function(){
					alert("Internal server error!");
				}
			}
		});
	}
	
	function submitLogout(){
		$.ajax({
			type: "POST"
		,	url: "/logout"
		,	success: function(data){
				logoutAnimation();
				overwriteSubmit($selectors.loginForm, submitLogin);
			}
		}).fail(function(msg){
			alert("Error while logging out:\n" + msg);
		});
	}
	
	function submitNewUser(){
		var newUserData = {
			userId: $selectors.loginId[0].value
		,	password: $selectors.loginPass[0].value
		};
		$.ajax({
			type: "POST"
		,	url: "/newUser"
		,	data: newUserData
		,	success: function(msg){
				console.log(msg);
				
				newUserAnimation(newUserData.userId)
				overwriteSubmit($selectors.loginForm, submitLogout);
				deleteUserClick(submitDeleteUser);
			}
		,	statusCode: {
				409: function(){
					$selectors.loginPass.attr("value", "");
					alert("Choose different user name!");
				}
			}
		}).fail(function(msg){
			console.log(msg);
		});
	}
	
	function submitDeleteUser(){
		$.ajax({
			type: "DELETE"
		,	url: "/deleteUser"
		,	success: function(msg){
			console.log(msg);
				logoutAnimation();
				$selectors.loginId.attr("value", "");
				overwriteSubmit($selectors.loginForm, submitLogin);
			}
		});
	}
	
	function cancel(){
		cancelAnimation();
		overwriteSubmit($selectors.loginForm, submitLogin);
	}
	
	function activateRegister(){
		registerAnimation();
		
		deleteUserClick(cancel);
		overwriteSubmit($selectors.loginForm, submitNewUser);
	}
	
	function overwriteSubmit($form, func){
		$form[0].onsubmit = function(e){
			e.preventDefault();
			func();
		};
	}
	
	function deleteUserClick(func){
		$selectors.buttonDelete[0].onclick = func;
	}
	
	//animations
	
	function hideRegisterWrapper(time){
		if(time == null){
			time = 1000;
		}
		$selectors.registerWrapper.hide("blind", time);
	}
	
	function showRegisterWrapper(time){
		if(time == null){
			time = 1000;
		}
		$selectors.registerWrapper.show("blind", time);
	}
	
	function hideStudyWrapper(time){
		if(time == null){
			time = 1000;
		}
		$selectors.studyWrapper.hide("blind", time);
	}
	
	function showStudyWrapper(time){
		if(time == null){
			time = 1000;
		}
		$selectors.studyWrapper.show("blind", time);
	}
	
	function hideLoginWrapper(time){
		if(time == null){
			time = 1000;
		}
		$selectors.loginWrapper.hide("clip", time);
	}
	
	function showLoginWrapper(time){
		if(time == null){
			time = 1000;
		}
		$selectors.loginWrapper.show("clip", time);
	}
	
	function shuffleUserInfo(newInfo, time, time2){
		if(time == null){
			time = 700;
		}
		$selectors.userInfo.hide("slide", { direction: "right"}, time, function(){
			if(time2 == null){
				time2 = 600;
			}
			$selectors.userInfo.text(newInfo).show("slide", time2);
		});
	}
	
	function contentFadeOut(){
		$selectors.content.fadeOut(500);
	}
	
	function contentFadeIn(){
		$selectors.content.fadeIn(500);
	}
	
	function centralizeUserPanel(){
		$selectors.userPanel.addClass("cl", 1000);
		$selectors.loginForm.removeClass("opa");
	}
	
	function decentralizeUserPanel(){
		$selectors.userPanel.removeClass("cl", 1000);
		$selectors.loginForm.addClass("opa");
	}
	
	function shuffleLoginButton(newValue){
		$selectors.buttonLogin.hide("blind", 700, function(){
			$selectors.buttonLogin.attr("value", newValue).show("blind", 400);
		});
	}
	
	
	function shuffleDeleteButton(newValue){
		hideDeleteButton(function(){ showDeleteButton(newValue); });
	}
	
	function hideDeleteButton(callback){
		$selectors.buttonDelete.hide("blind", 700, callback);
	}
	
	function showDeleteButton(newValue, time){
		if(newValue != null){
			$selectors.buttonDelete.attr("value", newValue).show("blind", time || 400);
		}else{
			$selectors.buttonDelete.show("blind", 1100);
		}
	}
	
	function loginAnimation(userId, time){
		hideLoginWrapper(time);
		hideRegisterWrapper(time);
		shuffleUserInfo("Welcome " + userId + "!", time, time);
		shuffleLoginButton("Log out");
		showDeleteButton("Delete user", 1100);
		showStudyWrapper();
		$selectors.loginPass.attr("value", "");
	}
	
	function logoutAnimation(time){
		showLoginWrapper(time);
		showRegisterWrapper(time);
		shuffleUserInfo("Log in", time, time);
		shuffleLoginButton("Log in");
		hideStudyWrapper();
		hideDeleteButton();
	}
	
	function registerAnimation(){
		contentFadeOut();
		centralizeUserPanel();
		hideRegisterWrapper();
		shuffleUserInfo("Register now!");
		shuffleLoginButton("Register");
		showDeleteButton("Cancel", 1100);
		$selectors.loginId.attr("value", "");
		$selectors.loginPass.attr("value", "");		
	}
	
	function newUserAnimation(userId){
		decentralizeAnimation();
		hideLoginWrapper();
		hideRegisterWrapper();
		shuffleUserInfo("Welcome " + userId + "!");
		shuffleLoginButton("Log out");
		shuffleDeleteButton("Delete user");
		$selectors.loginPass.attr("value", "");
	}
	
	function decentralizeAnimation(){
		decentralizeUserPanel();
		contentFadeIn();
	}
	
	function cancelAnimation(){
		decentralizeAnimation();
		shuffleUserInfo("Log in");
		shuffleLoginButton("Log in");
		hideDeleteButton();
		showRegisterWrapper();
		$selectors.loginId.attr("value", "");
		$selectors.loginPass.attr("value", "");
	}	
});
