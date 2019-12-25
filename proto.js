const {
	makeOfFunction,
	getOfIterable,
	makeOfObject,
	makeOfNumeric,
	makeOfList,
	makeFibonacci,
	wrapOneValue,
	emptyIterator,
	recursiveIterator
} = require('./factory.js');

const Iterator = require('./iterator.js');

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
		return getOfIterable(arg).recursive();
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

module.exports = Iterator;