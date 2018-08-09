'use strict'

function deepClone (arr)
{
	return JSON.parse(JSON.stringify(arr));
}

module.exports = {};
module.exports.deepClone = deepClone;