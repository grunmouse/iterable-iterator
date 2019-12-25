/**
 * 
 */
function Iterator(next){
	var me = this;
	me._donext = next;
	me.next = function(arg){
		var result;
		if(this._repeat){
			result = this.last;
			if('value' in result) me.pub('data', {value:result.value, repeat:true});
			this._repeat = false;
		}
		else{
			result = me._donext(arg);
			if('value' in result) me.pub('data', result);
			if(result.done) me.pub('end', result);
		}
		return this.last = result;
	};
	me[Symbol.iterator] = function(){return me;};
	me._subscribe = {data:new Map(), end:new Map()};
}

Iterator.prototype = {
	constructor:Iterator,
	_repeat:false,
	
	/**
	 * Применяет к итератору функцию through, которая должна возвращать новый итератор
	 */
	pipe:function(through){
		return through(this);
	},
	
	concat:function(){
		var arg = Array.from(arguments);
		arg.unshift(this);
		return recursiveIterator(getOfIterable(arg));
	},
	map:function(callback){
		var me = this;
		return new Iterator(function(){
			var pair = me.next();
			if(!pair.done){
				pair.value = callback(pair.value);
			}
			return pair;
		});
	},
	//Похоже на map, но пропускает значения === undefined
	transform:function(callback){
		var me = this;
		if(Array.isArray(callback)){
			callback = combine1(callback);
		}
		return new Iterator(function(){
			var pair;
			do{
				pair = me.next();
				if(!pair.done && pair.value!==undefined){
					pair.value = callback(pair.value);
				}
			}
			while(!pair.done && pair.value===undefined);
			return pair;
		});
	},
	pipeWhile:function(callback){
		var me = this;
		return new Iterator(function(){
			var pair = me.next();
			if(!callback(pair.value)){
				me.repeat();
				return {done:true};
			}
			return pair;
		});
	},
	
	
	filter:function(callback){
		var me = this;
		return new Iterator(function(){
			var pair = me.next();
			while(!pair.done && !callback(pair.value)){
				pair = me.next();
			}
			return pair;
		});
	},
	
	dountil:function(callback){
		return this.dowhile((val)=>(!callback));
	},
	
	/**
	 * Читает значения до тех пор, пока они соответствуют callback, а потом возвращает массив
	 * Включает _repeat, чтобы значение, неудовлетворившее callback могло быть считано снова.
	 */
	dowhile:function(callback){
		var arr = [], i=0, f, pair, me = this;
		do{
			pair = me.next();
			f = callback(pair.value);
			if(f) arr.push(pair.value);
		}while(!pair.done && f);
		me._repeat = !f;
		return arr;	
	},
	
	/**
	 * Пропускает значения, удовлетворяющие callback
	 */
	skip:function(callback){
		this.dowhile(callback);
		return this;
	},
	
	/**
	 * Принудительно включает _repeat
	 */
	repeat:function(){
		this._repeat = true;
	},
	

	recursive:function(){
		return recursiveIterator(this);
	},
	
	reduce:function(callback, akk){
		var me = this;
		return new Iterator(function(){
			var pair = me.next();
			if(!pair.done){
				akk = pair.value = callback(pair.value, akk);
			}
			return pair;
		});
	},
	
	/**
	 * Применяет вызывает callback поочереди с каждым значением до конца итератора
	 */
	forEach:function(callback){
		return this.map(callback).end();
	},
	/**
	 *	Пролистывает итератор до конца и возвращает последнее значение
	 */
	end:function(){
		var value;
		for(var pair of this){
			value = pair;
		}
		return value;
	},
	
	/**
	 * Читает несколько значений и возвращает их в виде массива
	 */
	getMany:function(count){
		var arr = [], i=0, done, pair, me = this;
		for(;!done && i<count;++i){
			pair = me.next();
			done = pair.done;
			if(!done) arr[i] = pair.value;
		}
		return arr;
	},
	
	toArray:function(){
		return Array.from(this);
	},
	toSet:function(){
		return new Set(this);
	},
	
	/**
	 * Подписка на событие
	 */
	sub:function(event, fun){
		var key = Symbol(), me = this;
		me._subscribe[event].set(key, fun);
		return function unbinder(){
			me._subscribe[event].delete(key);
		}
	},
	
	/**
	 * Публикация события
	 */
	pub:function(event, data){
		this._subscribe[event].forEach((fun)=>(fun(data)));
	}
};

function combine1(funcs) {
	return function(arg) {
		var i=0, len = funcs.length;
		for(; i < len; ++i){
			arg = funcs[i](arg);
			if(arg === undefined) {
				break;
			}
		}
		return arg;
	}
}


function makeOfFunction(func){
	var n;
	return new Iterator(function(){
		n = func(n);
		return {
			value: n,
			done: n==undefined
		};
	});
}

/**
 * Возвращает итератор, который обходит вложенные итерируемые объекты
 */
function recursiveIterator(sourceIterator){
	var cur, curIterator;
	return new Iterator(function(){
		var done, n, ndone, value;
		while(true){
			if(cur){
				n = curIterator.next();
				if(n.done){
					ndone = true;
				}
				else{
					return n;
				}
			}
			if(!cur || ndone){
				cur = sourceIterator.next(cur);
				if(cur.done){
					return {done:true};
				}
				else{
					cur = cur.value;
					curIterator = cur[Symbol.iterator]();
				}
			}
		}

	});
}

/**
 * Получает итератор из итерируемого объекта
 */
function getOfIterable(iterable){
	var curIterator = iterable[Symbol.iterator]();
	return new Iterator(function(){
		return curIterator.next();
	});
}

/**
 * Создаёт итератор, обходящий свойства плоского объекта, представляющий их в виде пар [ключ, значение]
 * Возвращаемый итератор имеет нестандартный метод toMap
 */
function makeOfObject(obj, sort){
	var keys = Object.keys(obj);
	if(sort){
		if(sort.call) keys.sort(sort);
		else keys.sort();
	}
	var iter = getOfIterable(keys).map((key)=>([key, obj[key]]));
	iter.toMap = function(){
		return new Map(this);
	};
	return iter;
}

/**
 * Создаёт итератор, обходящий односвязный список
 * @param start - объект, с которого начинаем обход
 * @param nextProp - имя свойства, содержащего 
 */
 
function makeOfList(start, nextProp, isMethod){
	var current, next = isMethod ? ()=>(current[nextProp]()) : ()=>(current[nextProp]);
	return makeOfFunction(function(){
		if(!current){
			current = start;
		}
		else{
			current = next();
		}
		return current;
	});
}

function makeOfNumeric(start, finis, step){
	var value = start,
		cond = start < finis,
		step = step || -!cond || 1;
	return new Iterator(function(prev){
		if(!isNaN(prev)){
			value = prev;
		}
		var result = {
			value: value,
			done:(value<finis) != cond
		}
		value+=step;
		return result;
	});
}

function makeFibonacci(first, two){
	return makeOfFunction(function(){
		var result = first;
		first = two;
		two +=result;
		return result;
	});
}

function wrapOneValue(value){
	var done = false;
	return new Iterator(function(){
		if(done) return {done:true};
		done = true;
		return {value:value};
	});
}

function emptyIterator(){
	return new Iterator(()=>({done:true}));
}

function collectIterator(sourceIterator, callback){
	var question = [];
	if(sourceIterator.call && ! sourceIterator.next){
		sourceIterator = makeIteratorOf(sourceIterator);
	}
	return new Iterator(function(){
		if(question.length){
			return {
				value:question.shift(),
				done:false
			};
		}
		var item = sourceIterator.next(), status;
		if(item.done) return {done:true};
		status = callback(item.value);
		if(status=='add'){
			return {value:item.value, done:false};
		}
		if(status=='quest'){
			while(status=='quest'){
				question.push(item.value);
				item = sourceIterator.next();
				if(item.done) return {done:true};
				status = callback(item.value);
			}
			if(status=='add'){
				question.push(item.value);
				return {value:question.shift(),	done:false};
			}
		}
		if(status=='end'){
			return {done:true};
		}
		throw new Error('status is ' + status);
		
	});
}

collectIterator.through = throungh2;


function throungh2(callback){
	var me = this;
	return function(source){
		return me(source, callback);
	}
}

module.exports = {
	Iterator:Iterator,
	recursive:recursiveIterator,
	makeOfFunction:makeOfFunction,
	getOfIterable:getOfIterable,
	makeOfObject:makeOfObject,
	makeOfNumeric:makeOfNumeric,
	makeOfList:makeOfList,
	makeFibonacci:makeFibonacci,
	wrapOneValue:wrapOneValue,
	emptyIterator:emptyIterator,
	collectIterator:collectIterator,
	throughCollect:throungh2.bind(collectIterator),
	throungh2:throungh2
	
};