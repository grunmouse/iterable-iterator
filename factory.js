const Iterator = require('./iterator.js');

const {
	combine1
} = require('./functional.js');


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
 * @param nextProp : String - имя свойства или метода, содержащего или возвращающего ссылку на следующий объект
 * @param isMethod : Boolean - признак того, что это не свойство, а метод.
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

module.exports = {
	makeOfFunction,
	getOfIterable,
	makeOfObject,
	makeOfNumeric,
	makeOfList,
	makeFibonacci,
	wrapOneValue,
	emptyIterator,
	recursiveIterator
};