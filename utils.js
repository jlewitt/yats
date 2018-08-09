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

module.exports = {};
module.exports.deepClone = deepClone;
module.exports.parse = parse;