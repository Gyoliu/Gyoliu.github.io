---
title: quartz启动执行流程
categories:
  - Java
tags:
  - Java
date: 2022-03-04 12:38:04
updated: 2022-03-04 12:38:04
---
spring 整合 quartz 初始化执行流程, 写的不是一般乱
> SchedulerFactoryBean.afterPropertiesSet() 
> -> prepareSchedulerFactory() 
> -> initSchedulerFactory() 初始化StdSchedulerFactory 
> -> prepareScheduler(SchedulerFactory schedulerFactory) 
> -> createScheduler() 创建调度器
-> StdSchedulerFactory.getScheduler() 
-> instantiate()

1. 初始化 读取 quartz.properties 中的配置
2. 实例化 QuartzSchedulerResources ->
   a. 初始化 JobStore （JobStoreSupport）
   b. 初始化 SimpleThreadPool -> initialize()
   ... 等等其他信息
3. 实例化 QuartzScheduler
   a. 实例化 QuartzSchedulerThread
   b. QuartzSchedulerResources.getThreadExecutor().execute(QuartzSchedulerThread)
   b1. QuartzSchedulerThread.run() -> getJobStore().acquireNextTriggers() 获取可以执行的触发器 -> 根据触发器获取job的详细信息 getJobStore().triggersFired(triggers) 封装成对象 TriggerFiredResult -> TriggerFiredBundle
   b2. 根据 TriggerFiredBundle 创建任务执行脚本 -> getJobRunShellFactory().createJobRunShell(TriggerFiredBundle); -> shell.initialize(this.qs);
   b3. 将任务添加进WorkerThread： getThreadPool().runInThread(shell)
   b4. 执行具体任务：JobRunShell.run() -> 获取 JobDetail

-> SchedulerFactoryBean.start() 什么时机触发start： SchedulerFactoryBean 实现了 SmartLifecycle 接口, 在 spring 容器初始化完成后，会调用 AbstractApplicationContext.finishRefresh()
-> ClusterManager.initialize() -> this.manage() -> run()

### 问题1. 前面初始化是就已经提交另一个线程 QuartzSchedulerResources.getThreadExecutor().execute(QuartzSchedulerThread) 执行了去数据库扫描任务但是其实还有很多东西没有初始化完，这个是怎么处理的？

> 答： QuartzSchedulerThread 中有个变量 paused 初始化时为 true ，则该线程一直处于轮询死循环状态，在调用 QuartzScheduler.start() 方法里面 this.schedThread.togglePause(false); 设置成 false ,则 QuartzSchedulerThread 才能去执行数据库任务扫描加载

### 问题2. 如何感知集群中其他机器？

> 答： 在 QuartzScheduler.start() 启动时会调用 QuartzSchedulerResources.getJobStore().schedulerStarted() 启动一个集群管理线程来感知 new JobStoreSupport.ClusterManager() -> this.manage() -> doCheckin()
每个机器启动时都会执行签入动作，如果是第一次签入则新增记录到表qrtz_scheduler_state中并设置签入时间，如果不是第一次则更新签入时间，感知同一集群根据 SCHED_NAME 来判断是否有集群机器离线
protected long calcFailedIfAfter(SchedulerStateRecord rec) {
return rec.getCheckinTimestamp() + Math.max(rec.getCheckinInterval(), System.currentTimeMillis() - this.lastCheckin) + 7500L > 当前时间;
}
如果扫描到有机器离线，则锁定 STATE_ACCESS 并再次检查是否有离线的机器，如果还是检查到，则锁定 TRIGGER_ACCESS 扫描表 qrtz_fired_triggers 判断触发器的状态，释放 blocked triggers -> STATE_WAITING 和 acquired triggers -> STATE_PAUSED 。如果 job 设置了失效转移 isJobRequestsRecovery ，则更新表 qrtz_triggers 触发器为等待执行状态（WAITING），最后删除 deleteFiredTriggers 表的数据

### 根据上面的描述，有个问题：什么时候新增 qrtz_fired_triggers 表的数据呢？

> 答： QuartzSchedulerThread -> acquireNextTrigger() 会新增那个机器执行了triggers 的记录激活了所有的触发器，则其他的机器根据抢占锁来获得执行触发器的权利， 执行acquireNextTrigger()方法时会抢占锁， quart 不支持任务分片，只能在一个机器上执行
