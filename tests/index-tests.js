'use strict';

const expect = require('chai').expect;

const YATS = require('../index');
const yats = new YATS({keyspace: 't-yats'});

let time1 = Math.round(Date.now() / 1000);

describe('scheduleTaskAsync', () =>
{
	before( () =>
	{
		return yats.destroyAsync();
	});

	it('schedules a task', () =>
	{
		let task = {stuff: 'here', scheduled: time1 };

		return yats.scheduleTaskAsync(task)
		.then( taskId =>
		{
			expect(taskId).to.be.a('number');
			expect(taskId).to.equal(1);
		});
	});
});

describe('getTasksAsync', () =>
{
	it('gets scheduled tasks by id', () =>
	{
		let ids = [1, 2];

		return yats.getTasksAsync({ids})
		.then( tasks =>
		{
			expect(tasks).to.be.an('array');
			expect(tasks.length).to.equal(2);
			expect(tasks[0]).to.be.a('string');
			expect(tasks[1]).to.equal(null);
		});
	});

	it('gets scheduled tasks by time', () =>
	{
		let times = [time1];

		return yats.getTasksAsync({times})
		.then( tasks =>
		{
			expect(tasks).to.be.an('array');
			expect(tasks.length).to.equal(1);
			expect(tasks[0]).to.be.a('string');
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
			expect(task).to.be.a('string');
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
	let task = {stuff: 'here', scheduled: time1 };

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