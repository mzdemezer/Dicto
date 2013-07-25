/**
	Swap plugin
	*/

(function($){

	$.fn.swap = function($elem, opts){
		var	type;
		
		opts = opts || {};
		switch(typeof opts){
			case "string":
				type = opts;
				break;
			case "object":
				type = opts.type;
				break;
			default:
				return swapOuter.call(this, $elem);
		}
		
		switch(type.toLowerCase()){
			case "inner":
				return swapInner.call(this, $elem);
			default:
				return swapOuter.call(this, $elem);
		}
	}
	
	function swapOuter($elem){
		var $prev;
		if(!this.is($elem)){
			$prev = $elem.prev();
			if(!$prev.length){
				$prev = $elem.parent();
				this.before($elem);
				$prev.prepend(this);
			}else{
				this.before($elem);
				if(!this.is($prev)){
					$prev.after(this);
				}
			}
		}
		
		return this;
	}

	function swapInner($elem){
		var html;
		if(!this.is($elem)){
			html = this.html();
			this.html($elem.html());
			$elem.html(html);
		}
		
		return this;
	}
	
})(jQuery);

$(function(){
	var	wordBank = words
		,	rounds = 1
		,	subRounds = 0
		,	subRoundsLimit = 4
		,	shuff
		, wordIdx = 0
		,	curr
		,	done = false
		,	matchSpeed = 300
		,	allFocusFields = [
				"fillForm"
			,	"menu"
			,	"quiz"
			,	"controlPanel"
			,	"terms"
			,	"defs"
			]
		,	noFocus = [
				"beginButton"
			,	"checkButton"
			,	"nextButton"
			,	"endButton"
			]
		,	$s = {
			allFocus: $()
		,	noFocus: $()
		,	stats: $("#stats")
		,	results: $("#results")
		,	footer: $("#footer")
		}
		,	overwriteSubmit;

		if(wordBank.length < 4){
		$("#content")
			.empty()
			.append($("<h1>")
				.text("You need more words to play this game.")
				.addClass("bigText center")
			);

		return;
	}

	(function initSelectors(){
		var i
			,	len
			,	field;
		for(i = 0, len = allFocusFields.length; i < len; ++i){
			field = allFocusFields[i];
			$s[field] = $("#" + field);
			$s.allFocus = $s.allFocus.add($s[field]);
		}
		
		for(i = 0, len = noFocus.length; i < len; ++i){
			field = noFocus[i];
			$s[field] = $("#" + field);
			$s.noFocus = $s.noFocus.add($s[field]);
		}
		
		$s.terms = $s.terms.children();
		$s.defs = $s.defs.children();
	})();
	
	overwriteSubmit = (function(){
		var sumbitFunc
			,	focus = false;
		
		document.onkeypress = function(e){
			switch(e.charCode){
				case 13:
					if(focus){
						sumbitFunc();
					}
					break;
			}
		}
		
		$s.allFocus.on("focus", function(){
			focus = true;
		}).on("blur", function(){
			focus = false;
		});
		
		$s.noFocus.on("focus", function(){
			focus = false;
		});
		
		$s.fillForm[0].onsubmit = function(e){
			e.preventDefault();
			
			return false;
		};
		
		return function(func){
			sumbitFunc = func;
		}
	})();
	
	(function init(){
		words = undefined;
		var dragSrcEl = null
			,	dragDropEl = null
			,	changeOrderFlag = true;
		
		$s.nextButton.on("click", function(){
			next();
		});
		
		$s.checkButton.on("click", function(){
			check();
		});
		
		$(".drag")
			.attr("draggable", true)
			.each(function(i){
				var self = this
					,	enteredMatched;

				$(self)
					.on("dragstart", function(e){
						var $this = $(this);
						dragSrcEl = this;
						dragDropEl = null;
						enteredMatched = isMatched($this);
					})
					.on("dragenter", function(e){
						var $tar = $(e.target)
							,	$src
							,	$opp;
						
						enteredMatched = isMatched($tar);
						$src = $(dragSrcEl);
						
						if(e.target.parentNode === dragSrcEl.parentNode){
							$src.swap($tar, "inner");
						}else{
							trimQueue($tar);
							trimQueue($src);
							$opp = opposite($tar);
							
							$src.swap($opp, "inner");
							
							if(!isMatched($tar)){
								if(isLeft($tar)){
									$tar.addClass("leftMatched", matchSpeed);
									$opp.addClass("rightMatched", matchSpeed);
								}else{
									$opp.addClass("leftMatched", matchSpeed);
									$tar.addClass("rightMatched", matchSpeed);
								}
							}
						}
					})
					.on("dragover", function(e){
						if(e.preventDefault){
							e.preventDefault();
						}
						return false;
					})
					.on("dragleave", function(e){
						var $tar = $(e.target)
							,	$src
							,	$opp;
						
						$src = $(dragSrcEl);	
						
						if(e.target.parentNode !== dragSrcEl.parentNode){
							$opp = opposite($tar);
							$src.swap($opp, "inner");
							if(!enteredMatched){
								trimQueue($tar);
								trimQueue($opp);
								if(isLeft($tar)){
									$tar.removeClass("leftMatched", matchSpeed);
									$opp.removeClass("rightMatched", matchSpeed);
								}else{
									$opp.removeClass("leftMatched", matchSpeed);
									$tar.removeClass("rightMatched", matchSpeed);
								}
							}
						}else{
							$src.swap($tar, "inner");
						}
					})
					.on("drop", function(e){
						if(e.stopPropagation){
							e.stopPropagation();
						}
						
						dragDropEl = $(self);
						
						return false;
					})
					.on("dragend", function(e){
						var $src
							,	$opp;
						
						if(!dragDropEl){
							$src = $(dragSrcEl);
							$opp = opposite($src);
							
							if(isLeft($src)){
								$src.removeClass("leftMatched", matchSpeed);
								$opp.removeClass("rightMatched", matchSpeed);
							}else{
								$opp.removeClass("leftMatched", matchSpeed);
								$src.removeClass("rightMatched", matchSpeed);
							}
						}
					})
					.text(i + 1 + " draggable");
			
			function trimQueue($elem){
				var q = $elem.queue("fx");
				q.splice(1, q.length - 1);
			}
					
			function isLeft($elem){
				return $elem.parent().hasClass("quizleft");
			}
			});
		overwriteBegin(startQuiz);
		overwriteSubmit(startQuiz);
		
	})();

	function opposite($elem){
		return $elem.parent()
			.siblings("ul.quiz")
			.children(".drag")
			.eq($elem.index());
	}
	
	function isMatched($elem){
		return $elem.hasClass("rightMatched") || $elem.hasClass("leftMatched");
	}

	function getWords(){
		var $node
			,	$opp
			,	i
			,	words = {};
		for($node = $s.terms.eq(0)
			,	$opp = $s.defs.eq(0)
			,	i = 0
			;	$node.size()
			;	$node = $node.next()
			,	$opp = $opp.next()
			,	++i){
			if(isMatched($node) && isMatched($opp)){
				words[$node.html()] = $opp.html();
			}
		}
		
		return words;
	}
	
	function startQuiz(){
		shuff = initShuffle(wordBank.length);
		$s.quiz.show("fold", matchSpeed);
		next();
	}
	
	function check(){
		var	matched = getWords()
			,	i
			,	len
			,	word;

		for(i = 0, len = curr.length; i < len; ++i){
			word = curr[i];
			if(parseNewLines(matched[word.word]) === parseNewLines(word.explanation)){
				word.learnt = ~~word.learnt + 1;
				word.hits = word.hits + 1 || 1;
				curr.hitThisRound = true;
				succeedTermsAnim($s.terms.eq(i));
				succeedDefsAnim($s.defs.eq(i));
			}else{
				if(curr.learnt > 0){
					curr.learnt -= 1;
				}
				curr.hitThisRound = false;
				word.hits = word.hits || 0;
				failTermsAnim($s.terms.eq(i));
				failDefsAnim($s.defs.eq(i));
			}
		}
		
		done = true;
		
		overwriteSubmit(next);
	}
	
	function next(){
		var	expls = []
			,	i;
		
		curr = getNextPack();
		
		if(!done){
			for(i = 0; i < subRoundsLimit; ++i){
				curr[i].hitThisRound = false;
				curr[i].hits = curr[i].hits || 0;
				if(curr[i].learnt > 0){
					curr[i].learnt -= 1;
				}
			}
		}
		if(curr){
			for(i = 0; i < subRoundsLimit; ++i){
				expls[i] = curr[i].explanation;
			}
			shuffle(expls);
			
			assignWords(curr, expls);
			unmatchAll();
			overwriteSubmit(check);
		}else{
			doStatistics();
			$s.quiz.hide("fold", matchSpeed);
		}
		done = false;
	}
	
	function assignWords(words, expls){
		var $node
			,	$opp
			,	i;

		for($node = $s.terms.eq(0)
			,	$opp = $s.defs.eq(0)
			,	i = 0
			;	$node.size()
			;	$node = $node.next()
			,	$opp = $opp.next()
			,	++i){

			$node.html(parseNewLines(words[i].word));
			$opp.html(parseNewLines(expls[i]));
		}
	}
	
	function parseNewLines(str){
		if(typeof str === "undefined"){
			return str;
		}
		return str.replace(/<br>|\r\n|\r|\n/g, "<br />");
	}
	/**
		returns random number between a and b inclusive
		*/
	function rand(a, b){
		var temp;
		a = a || 0;
		b = b || 0;
		if(a > b){
			temp = a;
			a = b;
			b = temp;
		}else if(a === b){
			return a;
		}
		
		b -= a - 1;
		
		return ~~(Math.random() * b) + a;
	}
	
	function shuffle(arr){
		var i
			,	r
			,	temp;
		for(i = arr.length - 1; i > 0; --i){
			r = rand(i);
			temp = arr[i];
			arr[i] = arr[r]
			arr[r] = temp;
		}
		
		return arr;
	}
	
	function initShuffle(len){
		var i
			,	r
			,	arr;
		
		if(!len){
			return [];
		}
		
		arr = [0]
		
		for(i = 1; i < len; ++i){
			r = rand(i);
			arr[i] = arr[r];
			arr[r] = i;
		}
		
		return arr;
	}
	
	function getRandomWord(i){
		return wordBank[shuff[i]];
	}
	
	function getNextPack(){
		var i
			,	j
			,	len = wordBank.length - 1
			,	r
			,	temp
			,	res = [];

		for(i = 0; i < subRoundsLimit; ++i){
			if(wordIdx >= shuff.length){
				subRounds += 1;
				if(subRounds >= subRoundsLimit){
					return null;
				}
				shuffle(shuff);
				wordIdx = 0;
			}
			for(res[i] = getRandomWord(wordIdx)
				;	isIn(res[i], res.slice(0, i))
				;	res[i] = getRandomWord(wordIdx)){

				r = rand(wordIdx, len);
				temp = shuff[wordIdx];
				shuff[wordIdx] = shuff[r];
				shuff[r] = temp;
			}
			
			wordIdx += 1;
		}
		
		return res;
	}
	
	function tellToLogIn(){
		alert("You have to be logged in to change content");
	}
	
	function overwriteBegin(func){
		$s.beginButton[0].onclick = function(){
			func();
		}
	}
	
	
	function doStatistics(){
		var learntArr = []
			,	i
			,	len;
		
		for(i = 0, len = wordBank.length; i < len; ++i){
			learntArr.push({
				word: wordBank[i].word
			,	learnt: wordBank[i].learnt
			});
		}
		
		$.ajax({
			type: "POST"
		,	url: "/test/update"
		,	data: { words: learntArr }
		,	statusCode: {
				401: tellToLogIn
			}
		}).fail(function(){
			alert("Unable to post results to the server");
		});
		
		displayStatistics();
	}
	
	function displayStatistics(){
		var i
			,	len
			,	$cell
			,	$row
			,	$word
			,	$res = $s.results
			,	$footer = $s.footer
			,	classer = false
			,	learntClass
			,	func;
		
		$res.detach()
			.empty();		
		
		for(i = 0, len = wordBank.length; i < len; ++i, classer = !classer){
			$row = $("<tr>");
			
			if(classer){
				$row.addClass("even");
			}else{
				$row.addClass("odd");
			}

			$cell = $("<td>").text(~~wordBank[i].hits);
			$row.append($cell);

			$cell = $("<td>").text(wordBank[i].learnt);
			$row.append($cell);
			if(~~wordBank[i].learnt >= 20){
				$cell.addClass("learnt");
			}else{
				$cell.addClass("notLearnt");
			}
			
			if(wordBank[i].hitThisRound){
				learntClass = "learnt";
			}else{
				learntClass = "notLearnt";
			}
			
			
			
			$word = $("<p>")
				.addClass("hidden explText")
				.html(parseNewLines(wordBank[i].explanation));
			func = togExplWrapper($word);
			
			$cell = $("<a>")
				.attr("href", "#")
				.on("click", func)
				.append($("<td>")
					.addClass([learntClass, "statsWord"].join(" "))
					.text(wordBank[i].word)
					.append($word));
			$row.prepend($cell);
			
			$row.appendTo($res);
		}
		
		$footer.detach()
			.empty()
			.append($("<td>").text(len + " word" + (len === 1 ? "" : "s")))
			.append($("<td>").text("/" + rounds * subRoundsLimit))
			.append($("<td>").text(((wordBank.reduce(function(sum, elem){
					return sum + ~~elem.learnt;
				}, 0) / len) / 20 * 100).toPrecision(3) + "%"));
		
		$s.stats.append($res).append($footer);

		showStats(len);
	}
	
	function togExplWrapper($expl){
		return function(e){
			if(e.preventPropagation){
				e.preventPropagation();
			}
			if(e.preventDefault){
				e.preventDefault();
			}
			
			toggleExplanation($expl);
			
			return false;
		}
	}

	function toggleExplanation($expl){			
		$expl.toggle(250);
	}
	
	// animations
	
	function unmatchAll(){
		$s.terms.removeClass("leftMatched notLearnt learnt", matchSpeed);
		$s.defs.removeClass("rightMatched notLearnt learnt", matchSpeed);
	}
	
	function showStats(callback){
		$s.stats.show("fold", 1000, callback);
	}
	
	function succeedTermsAnim($term){
		$term.addClass("learnt");
	}
	
	function succeedDefsAnim($def){
		$def.addClass("learnt");
	}
	
	function failTermsAnim($term){
		$term.addClass("notLearnt");
	}
	
	function failDefsAnim($def){
		$def.addClass("notLearnt");
	}
	
	function showStats(len, callback){
		if($s.stats.css("display") === "none"){
			$s.stats.show("blind", 1000 + len * 20, callback);
		}
	}
	
	function hideStats(callback){
		if($s.stats.css("display") !== "none"){
			$s.stats.hide("blind", 1000, callback);
		}
	}
});

function isIn(elem, arr){
	var i
		,	len;
	
	for(i = 0, len = arr.length; i < len; ++i){
		if(elem === arr[i]){
			return true;
		}
	}
	return null;
}

function callCallBack(func, that, args){
	if(func && typeof func === "function"){
		func.apply(that, args);
	}
}
