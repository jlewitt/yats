'use strict';

const Redis = require('redis');
const bluebird = require('bluebird');
bluebird.promisifyAll(Redis.RedisClient.prototype);
bluebird.promisifyAll(Redis.Multi.prototype);

const Q = require('q');

class YATS
{
	constructor (options)
	{
		this.options = options;

		if (!options) this.options = {};
		

		this.options.prefix = this.options.prefix || 'yats';

		this.redis = Redis.createClient(this.options.db);
	}

	/* rough api (to work via node.js + REST)
			- schedule task
			- get schedule tasks
				+ w/ filter
			- cancel/delete tasks
				+ filter by active/inactive
			- run task (internal)
	*/

	scheduleTasksAsync (tasks)
	{

	}

	scheduleTaskAsync (task)
	{
		// naive approach using multiple redis calls vs using a redis script
		return this.incrIdAsync()
		.then( id =>
		{
			task.id = id;
			return this.redis
			.multi()
			.hset(this.getTaskKey(), id, JSON.stringify(task))
			.zadd(this.getZTaskKey(), task.scheduled, id)
			.execAsync()
			.then( res =>
			{
				console.log('res:', res);
				return Q.resolve(id);
			});
		})
	}

	getTasksAsync (criteria)
	{
		if (!criteria || !!criteria.ids && !!criteria.times) return Q.reject(new Error('empty criteria'));

		if (criteria.ids && criteria.times) return Q.reject(new Error('only ids or times can be used'));

		if (criteria.ids)
		{
			let multis = criteria.ids.map(id => ['hget', this.getTaskKey(), id]);

			return this.redis
			.multi(multis)
			.execAsync();
		}

		if (criteria.times) 
		{
			// let multis = _.map(criteria.ids, id => ['zrange', this.getZTaskKey(), id]);
			let sortedTimes = JSON.parse(JSON.stringify(criteria.times)).sort();
			let min = sortedTimes[0];
			let max = sortedTimes[sortedTimes.length-1];

			return this.redis.zrangebyscoreAsync(this.getZTaskKey(), min, max)
			.then( res =>
			{
				return this.getTasksAsync({ids: res});
			});
		}		
	}

	deleteTasksAsync (criteria)
	{

	}

	_runAsync ()
	{
		return getTasks({where: {state: 'active'}, limit: 1})
		.then( tasks =>
		{
			if (!tasks || tasks.length === 0)
				return Q.resolve();

			return _runOneAsync(tasks.shift());
		});
	}

	_runOneAsync (task)
	{
		task.execute()
		.then( () =>
		{
			return _updateTaskAsync({id: task.id, state: 'completed'});
		})
		.catch( err =>
		{
			return _updateTaskAsync(task, {state: 'error', errMsg: err});
		});
	}

	_updateTaskAsync (task)
	{
		return this.redis.hget(this.getTaskKey(), task.id)
		.then( newTask =>
		{
			if (!newTask) return Q.reject(new Error('unable to find task'));

			let newTaskObj = this.parse(newtask);
			newTaskObj = _.defaults(newTaskObj, task);

			return this.redis.hset('', task.id, JSON.stringify(newTaskObj));
		})
	}

	getTaskKey ()
	{
		return this.getPrefix() + 'tasks';
	}

	getZTaskKey ()
	{
		return this.getPrefix() + 'ztasks';
	}

	getIdKey ()
	{
		return this.getPrefix() + 'id';
	}

	getPrefix ()
	{
		if (!this.prefix || this.prefix.length === 0) return '';
	}

	parse (str)
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

	incrIdAsync ()
	{
		return this.redis.incrAsync(this.getIdKey());
	}

	destroyAsync ()
	{
		return this.redis
		.multi()
		.del( this.getTaskKey() )
		.del( this.getZTaskKey() )
		.del( this.getIdKey() )
		.execAsync();
	}
}


module.exports = YATS;