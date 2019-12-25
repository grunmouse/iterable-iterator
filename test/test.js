var iterable = require('../index.js');

var arr = [[0,1],[5],[2,3]];
var iter = iterable.getOfIterable(arr);
var recursive = iter.pipe(iterable.recursive);

var res = recursive.toArray();

console.log(res);

var obj={a:1,b:2};

iter = iterable.getOfIterable(Object.keys(obj)).map((key)=>([key, obj[key]]));

console.log(iter.toArray());

console.log(iterable.makeOfObject(obj).toMap());

console.log(iterable.makeOfNumeric(0,10).map((a)=>(a*a)).toArray());
console.log(iterable.makeOfNumeric(10,0).toArray());

console.log(iterable.makeFibonacci(0,1).getMany(10));

var fib = iterable.makeFibonacci(0,1);
console.log(fib.dowhile((a)=>(a<10)));
console.log(fib.dowhile((a)=>(a<100)));

var lfib = iterable.makeFibonacci(0,1).pipeWhile((a)=>(a<100));
console.log(lfib.toArray());

var val = iterable.wrapOneValue('value');
console.log(val.toArray());

var con = iterable.makeFibonacci(0,1).pipeWhile((a)=>(a<10)).concat(iterable.wrapOneValue('value'));
console.log(con.toArray());