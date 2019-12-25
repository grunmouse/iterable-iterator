/**
 * Комбинирует массив унарных функций, таким образом, что на вход каждой следующей поступает результат предыдущей
 * @param funcs:{Array<Function<(
 */
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

module.exports = {
	combine1
}