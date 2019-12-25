const Iterator = require('./proto.js');

const {
	combine1
} = require('./functional.js');




/**
 * Создаёт итератор, выбирающий из исходного итератора
 * элементы до тех пор, пока функция нечёткой логики callback не вернёт end
 * При этом, последним возвращённым элементом будет такой, для которого она вернула add.
 *
 * @param sourceIterator:{Iterator}
 * @param callback:{Function<(any)=>(Enum<"add"|"quest"|"end">)}
 * 
 */
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
	recursive:(sourceIterator)=>(sourceIterator.recursive()),
	collectIterator:collectIterator,
	...require('./factory.js'),
	throughCollect:throungh2.bind(collectIterator),
	throungh2:throungh2
	
};