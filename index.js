'use strict';

const Redis = require('redis');
const bluebird = require('bluebird');
bluebird.promisifyAll(Redis.RedisClient.prototype);
bluebird.promisifyAll(Redis.Multi.prototype);

const Q = require('q');
const utils = require('./utils');

class YATS
{
	constructor (options)
	{
		this.options = options;

		if (!this.options) this.options = {};
		

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
		return Q.all(tasks.map(task => this.scheduleTaskAsync(task)));
	}

	scheduleTaskAsync (task)
	{
		// naive approach using multiple redis calls vs using a redis script
		return this._incrIdAsync()
		.then( id =>
		{
			task.id = id;
			return this.redis
			.multi()
			.hset(this._getTaskKey(), id, JSON.stringify(task))
			.zadd(this._getZTaskKey(), task.scheduled, id)
			.execAsync()
			.then( res =>
			{
				console.log('res:', res);
				return Q.resolve(id);
			});
		})
	}

	// convenince function
	getTaskByIdAsync (id)
	{
		return this.getTasksAsync({ids: [id]})
		.then( tasks =>
		{
			if (!tasks || tasks.length === 0) return Q.resolve(null);

			return Q.resolve(tasks[0]);
		});
	}

	getTasksAsync (criteria)
	{
		if (!criteria || !!criteria.ids && !!criteria.times) return Q.reject(new Error('empty criteria'));

		if (criteria.ids && criteria.times) return Q.reject(new Error('only ids or times can be used'));

		if (criteria.ids)
		{
			let multis = criteria.ids.map(id => ['hget', this._getTaskKey(), id]);

			return this.redis
			.multi(multis)
			.execAsync();
		}

		if (criteria.times) 
		{
			// let multis = _.map(criteria.ids, id => ['zrange', this._getZTaskKey(), id]);
			let sortedTimes = utils.deepClone(criteria.times).sort();
			let min = sortedTimes[0];
			let max = sortedTimes[sortedTimes.length-1];

			return this.redis.zrangebyscoreAsync(this._getZTaskKey(), min, max)
			.then( res =>
			{
				return this.getTasksAsync({ids: res});
			});
		}		
	}

	deleteTasksAsync (ids)
	{
		return Q.all(ids.map(id => deleteTaskAsync(id)));
	}

	deleteTaskAsync (id)
	{
		return Q.all([
			this.redis.zremAsync(this._getZTaskKey(), id),
			this.redis.hdelAsync(this._getTaskKey(), id)
		]);
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

	// weird structure to handle both promise-based tasks and callback-based tasks
	_runOneAsync (task)
	{
		let deferred = Q.defer();

		task.execute(_runOneNF(task, deferred.resolve))
		.then( () =>
		{
			return deferred.resolve(this._updateTaskAsync({id: task.id, state: 'completed'}));
		})
		.catch( err =>
		{
			return deferred.resolve(this._updateTaskAsync(task, {state: 'error', errMsg: err}));
		}).done();

		return deferred.promise;
	}

	_runOneNF (task, deferred)
	{
		return (err) =>
		{
			if (err) return deferred.resolve(this._updateTaskAsync(task, {state: 'error', errMsg: err}));

			return deferred.resolve(this._updateTaskAsync({id: task.id, state: 'completed'}));
		}
	}

	_updateTaskAsync (task)
	{
		return this.redis.hget(this._getTaskKey(), task.id)
		.then( newTask =>
		{
			if (!newTask) return Q.reject(new Error('unable to find task'));

			let newTaskObj = utils.parse(newtask);
			newTaskObj = _.defaults(newTaskObj, task);

			return this.redis.hset('', task.id, JSON.stringify(newTaskObj));
		})
	}

	_getTaskKey ()
	{
		return this._getPrefix() + 'tasks';
	}

	_getZTaskKey ()
	{
		return this._getPrefix() + 'ztasks';
	}

	_getIdKey ()
	{
		return this._getPrefix() + 'id';
	}

	_getPrefix ()
	{
		if (!this.prefix || this.prefix.length === 0) return '';
	}

	_incrIdAsync ()
	{
		return this.redis.incrAsync(this._getIdKey());
	}

	destroyAsync ()
	{
		return this.redis
		.multi()
		.del( this._getTaskKey() )
		.del( this._getZTaskKey() )
		.del( this._getIdKey() )
		.execAsync();
	}
}


module.exports = YATS;