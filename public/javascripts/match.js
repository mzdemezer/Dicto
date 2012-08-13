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
		__render();

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
		
		__render();
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
		overwriteSubmit(check);
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
				succeedTermsAnim($s.terms.eq(i));
				succeedDefsAnim($s.defs.eq(i));
			}else{
				word.learnt -= 1;
				word.hits = word.hits || 0;
				failTermsAnim($s.terms.eq(i));
				failDefsAnim($s.defs.eq(i));
			}
		}

		overwriteSubmit(next);
	}
	
	function next(){
		var	expls = []
			,	i;
		
		curr = getNextPack();
		
		if(curr){
			for(i = 0; i < subRoundsLimit; ++i){
				expls[i] = curr[i].explanation;
			}
			shuffle(expls);
			
			assignWords(curr, expls);
			unmatchAll();
			overwriteSubmit(check);
		}else{
			alert("finish");
		}
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
