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
		
		this.keyspace = utils.keySuffix(this.options.keyspace || 'yats');

		this.redis = Redis.createClient(this.options.db);
	}

	/* rough api (to work via node.js + REST)
			- schedule task
			- get scheduled tasks
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
			.hset(this._getHTaskKey(), id, JSON.stringify(task))
			.zadd(this._getZTaskKey(), task.scheduled, id)
			.execAsync()
			.then( () =>
			{
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
			let multis = criteria.ids.map(id => ['hget', this._getHTaskKey(), id]);

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
			this.redis.hdelAsync(this._getHTaskKey(), id)
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

		task.execute(_runOneNF(task, deferred.resolve)) // intentionally pass deferred.resolve
		.then( () =>
		{
			return deferred.resolve(this._completeTaskAsync(task));
		})
		.catch( err =>
		{
			return deferred.resolve();
		}).done();

		return deferred.promise;
	}

	_runOneNF (task, deferred)
	{
		return (err) =>
		{
			if (err) return deferred.resolve(this._errorTaskAsync(task, err));

			return deferred.resolve(this._completeTaskAsync(task));
		}
	}

	_updateTaskAsync (task)
	{
		// console.log('this._getHTaskKey(), task:', this._getHTaskKey(), task); process.exit();
		return this.redis.hgetAsync(this._getHTaskKey(), task.id)
		.then( newTask =>
		{
			if (!newTask) return Q.reject(new Error('unable to find task'));

			let newTaskObj = utils.parse(newTask);
			newTaskObj = Object.assign(newTaskObj, task);

			return this.redis.hsetAsync(this._getHTaskKey(), task.id, JSON.stringify(newTaskObj));
		})
	}

	_completeTaskAsync (task)
	{
		return this._updateTaskAsync({id: task.id, state: 'completed'})
		.then( () =>
		{
			// move from active list to inactive
			return this._moveTaskToInactiveAsync(task);
		});
	}

	_errorTaskAsync (task, err)
	{
		return this._updateTaskAsync({id: task.id, state: 'error', errMsg: err})
		.then( () =>
		{
			// move from active list to inactive
			return this._moveTaskToInactiveAsync(task);
		});
	}

	_moveTaskAsync (task, state)
	{
		return this.redis
		.multi()
		.zrem(this._getZTaskKey(), task.id)
		.zadd(this._getZTaskKey(state), task.scheduled, task.id)
		.execAsync();
	}

	_moveTaskToInactiveAsync (task)
	{
		return this._moveTaskAsync(task, 'inactive');
	}

	_moveTaskToErrorAsync (task)
	{
		return this._moveTaskAsync(task, 'error');
	}

	_getHTaskKey ()
	{
		return this.keyspace + 'htasks';
	}

	_getZTaskKey (state = '')
	{
		return this.keyspace + 'ztasks' + utils.keyPrefix(state);
	}

	_getIdKey ()
	{
		return this.keyspace + 'id';
	}

	_incrIdAsync ()
	{
		return this.redis.incrAsync(this._getIdKey());
	}

	destroyAsync ()
	{
		return this.redis
		.multi()
		.del( this._getHTaskKey() )
		.del( this._getZTaskKey() )
		.del( this._getIdKey() )
		.execAsync();
	}
}


module.exports = YATS;