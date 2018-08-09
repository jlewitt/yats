'use strict';

const expect = require('chai').expect;
const Q = require('q');

const YATS = require('../index');
const yats = new YATS({keyspace: 't-yats', runTimeout: 250});

let now = Math.round(Date.now() / 1000);
let later = now + 10;

describe('scheduleTaskAsync', () =>
{
	before( () =>
	{
		return yats.destroyAsync();
	});

	it('schedules a task', () =>
	{
		let task = {stuff: 'here', scheduled: later, type: 'cool-event' };

		return yats.scheduleTaskAsync(task)
		.then( taskId =>
		{
			expect(taskId).to.be.a('number');
			expect(taskId).to.equal(1);
			task.id = taskId;
		});
	});


	it('schedules a task and wait for the event to be emitted', () =>
	{
		let task = {stuff: 'here', scheduled: now, type: 'cooler-event' };

		return yats.scheduleTaskAsync(task)
		.then( taskId =>
		{
			expect(taskId).to.be.a('number');
			expect(taskId).to.equal(2);
			task.id = taskId;

			let deferred = Q.defer();
			yats.on('cooler-event', emittedTask =>
			{
				expect(emittedTask).to.be.an('object');
				expect(emittedTask.id).to.equal(task.id);
				expect(emittedTask.type).to.equal(task.type);

				return deferred.resolve(true);
			})
			return deferred.promise;
		});
	});
});



describe('getTasksAsync', () =>
{
	it('gets scheduled tasks by id', () =>
	{
		let ids = [1, 1000];

		return yats.getTasksAsync({ids})
		.then( tasks =>
		{
			expect(tasks).to.be.an('array');
			expect(tasks.length).to.equal(2);
			expect(tasks[0]).to.be.a('object');
			expect(tasks[1]).to.equal(null);
		});
	});

	it('gets scheduled tasks by time', () =>
	{
		let times = [later-1, later+1];

		return yats.getTasksAsync({times})
		.then( tasks =>
		{
			// console.log('Date.now():', Math.round(Date.now()/1000), now); process.exit();
			console.log('tasks:', tasks);
			expect(tasks).to.be.an('array');
			expect(tasks.length).to.equal(1);
			expect(tasks[0]).to.be.a('object');
		});
	});
});


describe('getTaskByIdAsync', () =>
{
	it('gets scheduled task by id', () =>
	{
		let id = 1;

		return yats.getTaskByIdAsync(id)
		.then( task =>
		{
			expect(task).to.be.a('object');
			expect(task.id).to.equal(id);
		});
	});
});

describe('deleteTaskAsync', () =>
{
	it('deletes a task', () =>
	{
		let id = 1;

		return yats.deleteTaskAsync(id)
		.then( res =>
		{
			expect(res).to.be.an('array');
			expect(res.length).to.equal(2);
			expect(res[0]).to.equal(1);
			expect(res[1]).to.equal(1);
		});
	});
});

describe('housekeeping', () =>
{
	it('destroyAsync', () =>
	{
		return yats.destroyAsync();
	});
});

describe('internal tests', () =>
{
	let task = {stuff: 'here', scheduled: now };

	it('creates a task', () =>
	{
		
		return yats.scheduleTaskAsync(task)
		.then( taskId =>
		{
			expect(taskId).to.be.a('number');
			task.id = taskId;
		});
	});

	it('errors task', () =>
	{
		return yats._errorTaskAsync(task, 'timeout')
		.then( res =>
		{
			expect(res).to.be.an('array');
			expect(res.length).to.equal(2);
			expect(res[0]).to.equal(1);
			expect(res[1]).to.equal(0);
		});
	});
});

describe('housekeeping', () =>
{
	it('destroyAsync', () =>
	{
		return yats.destroyAsync();
	});
});