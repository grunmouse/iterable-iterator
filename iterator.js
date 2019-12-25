
const {
	combine1
} = require('./functional.js');

/**
 * Итератор, который является итерируемым объектом и итератором сам для себя.
 * Базируется на функции next, которая должна возвращать IteratorResult
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


module.exports = Iterator;