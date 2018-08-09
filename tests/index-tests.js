'use strict';

const expect = require('chai').expect;

const YATS = require('../index');
const yats = new YATS();

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
			console.log('taskId:', taskId);
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
			console.log('tasks:', tasks);
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
			console.log('tasks:', tasks);
			expect(tasks).to.be.an('array');
			expect(tasks.length).to.equal(1);
			expect(tasks[0]).to.be.a('string');
		});
	});
});