'use strict'

function deepClone (arr)
{
	return JSON.parse(JSON.stringify(arr));
}

function parse (str)
{
	let json;
	try
	{
		json = JSON.parse(str);
	}
	catch (ex)
	{
		console.error(ex);
		json = str;
	}

	return json;
}

function _keyFix (s, prefix)
{
	if (!s || typeof(s) !== 'string' || s.length === 0)
		return s;

	let fx = x => (x ? ':' : '');

	return fx(prefix) + s + fx(!prefix);
}

function keySuffix (s)
{
	return _keyFix(s, false); // return "s:"
}

function keyPrefix (s)
{
	return _keyFix(s, true); // return ":s"
}


module.exports = {};
module.exports.deepClone = deepClone;
module.exports.parse = parse;
module.exports.keySuffix = keySuffix;
module.exports.keyPrefix = keyPrefix;