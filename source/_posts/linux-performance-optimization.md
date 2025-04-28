---
title: linux performance optimization
categories:
  - Default
tags:
  - Default
date: 2025-04-16 23:06:58
updated: 2025-04-16 23:06:58
---
### 模拟一个 CPU 使用率 100% 的场景：
```shell
  stress --cpu 1 --timeout 600
  # 间隔 5 秒后输出一组数据
  pidstat -u 5 1
```
### 模拟 I/O 压力，即不停地执行 sync：
```shell
  stress -i 1 --timeout 600
  # 间隔 5 秒后输出一组数据
  mpstat -P ALL 5 1

  # 间隔 5 秒后输出一组数据，-u 表示 CPU 指标
  pidstat -u 5 1
```
### 模拟的是 8 个进程：
```shell
  stress -c 8 --timeout 600
  # 间隔 5 秒后输出一组数据，-u 表示 CPU 指标
  pidstat -u 5 1
```

### 查询系统的上下文切换情况
```shell
# 每隔 5 秒输出 1 组数据
$ vmstat 5
procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
 0  0      0 7005360  91564 818900    0    0     0     0   25   33  0  0 100  0 

cs（context switch）是每秒上下文切换的次数。
in（interrupt）则是每秒中断的次数。
r（Running or Runnable）是就绪队列的长度，也就是正在运行和等待 CPU 的进程数。
b（Blocked）则是处于不可中断睡眠状态的进程数。

vmstat 只给出了系统总体的上下文切换情况，要想查看每个进程的详细情况，就需要使用我们前面提到过的 pidstat 了。给它加上 -w 选项，你就可以查看每个进程上下文切换的情况了。
# 每隔 5 秒输出 1 组数据
$ pidstat -w 5

Linux 4.15.0 (ubuntu)  09/23/18  _x86_64_  (2 CPU) 
08:18:26      UID       PID   cswch/s nvcswch/s  Command
08:18:31        0         1      0.20      0.00  systemd
08:18:31        0         8      5.40      0.00  rcu_sched

这个结果中有两列内容是我们的重点关注对象。
一个是 cswch ，表示每秒自愿上下文切换（voluntary context switches）的次数，
另一个则是 nvcswch ，表示每秒非自愿上下文切换（non voluntary context switches）的次数。

所谓自愿上下文切换，是指进程无法获取所需资源，导致的上下文切换。比如说， I/O、内存等系统资源不足时，就会发生自愿上下文切换。
而非自愿上下文切换，则是指进程由于时间片已到等原因，被系统强制调度，进而发生的上下文切换。比如说，大量进程都在争抢 CPU 时，就容易发生非自愿上下文切换。
```

### apt install sysbench sysstat 

```shell
apt install docker.io sysstat linux-tools-common apache2-utils
# 以 10 个线程运行 5 分钟的基准测试，模拟多线程切换的问题
$ sysbench --threads=10 --max-time=300 threads run

接着，在第二个终端运行 vmstat ，观察上下文切换情况：

# 每隔 1 秒输出 1 组数据（需要 Ctrl+C 才结束）
$ vmstat 1
procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
 6  0      0 6487428 118240 1292772    0    0     0     0 9019 1398830 16 84  0  0  0
 8  0      0 6487428 118240 1292772    0    0     0     0 10191 1392312 16 84  0  0  0

r 列：就绪队列的长度已经到了 8，远远超过了系统 CPU 的个数 2，所以肯定会有大量的 CPU 竞争。
us（user）和 sy（system）列：这两列的 CPU 使用率加起来上升到了 100%，其中系统 CPU 使用率，也就是 sy 列高达 84%，说明 CPU 主要是被内核占用了。
in 列：中断次数也上升到了 1 万左右，说明中断处理也是个潜在的问题。

# 每隔 1 秒输出 1 组数据（需要 Ctrl+C 才结束）
# -w 参数表示输出进程切换指标，而 -u 参数则表示输出 CPU 使用指标
$ pidstat -wt -u 1
08:06:33      UID       PID    %usr %system  %guest   %wait    %CPU   CPU  Command
08:06:34        0     10488   30.00  100.00    0.00    0.00  100.00     0  sysbench
08:06:34        0     26326    0.00    1.00    0.00    0.00    1.00     0  kworker/u4:2 
08:06:33      UID       PID   cswch/s nvcswch/s  Command
08:06:34        0         8     11.00      0.00  rcu_sched
08:06:34        0        16      1.00      0.00  ksoftirqd/1
08:06:34        0       471      1.00      0.00  hv_balloon
08:06:34        0      1230      1.00      0.00  iscsid
08:06:34        0      4089      1.00      0.00  kworker/1:5
08:06:34        0      4333      1.00      0.00  kworker/0:3
08:06:34        0     10499      1.00    224.00  pidstat
08:06:34        0     26326    236.00      0.00  kworker/u4:2
08:06:34     1000     26784    223.00      0.00  sshd

# -d 参数表示高亮显示变化的区域
$ watch -d cat /proc/interrupts
           CPU0       CPU1
...
RES:    2450431    5279697   Rescheduling interrupts

碰到上下文切换次数过多的问题时，我们可以借助 vmstat 、 pidstat 和 /proc/interrupts 等工具，来辅助排查性能问题的根源。


```

### CPU 使用率过高分析
```shell
预先安装 docker、sysstat、perf、ab 等工具

$ perf top
Samples: 833  of event 'cpu-clock', Event count (approx.): 97742399
Overhead  Shared Object       Symbol
   7.28%  perf                [.] 0x00000000001f78a4
   4.72%  [kernel]            [k] vsnprintf
   4.32%  [kernel]            [k] module_get_kallsym
   3.65%  [kernel]            [k] _raw_spin_unlock_irqrestore
第一列 Overhead ，是该符号的性能事件在所有采样中的比例，用百分比来表示。
第二列 Shared ，是该函数或指令所在的动态共享对象（Dynamic Shared Object），如内核、进程名、动态链接库名、内核模块名等。
第三列 Object ，是动态共享对象的类型。比如 [.] 表示用户空间的可执行程序、或者动态链接库，而 [k] 则表示内核空间。
最后一列 Symbol 是符号名，也就是函数名。当函数名未知时，用十六进制的地址来表示。
$ perf record
$ perf report


# 并发 10 个请求测试 Nginx 性能，总共测试 100 个请求
$ ab -c 10 -n 100 http://192.168.0.10:10000/
This is ApacheBench, Version 2.3 <$Revision: 1706008 $>
Copyright 1996 Adam Twiss, Zeus Technology Ltd, 
...
Requests per second:    11.63 [#/sec] (mean)
Time per request:       859.942 [ms] (mean)
...


$ ab -c 10 -n 10000 http://10.240.0.5:10000/
1. 运行 top 命令，并按下数字 1 ，切换到每个 CPU 的使用率,查看那个进程 CPU 高记录 PID
2. # -g 开启调用关系分析，-p 指定 php-fpm 的进程号 21515
$ perf top -g -p 21515

# 高CPU调用时找不到进程的场景
第一个原因，进程在不停地崩溃重启，比如因为段错误、配置错误等等，这时，进程在退出后可能又被监控系统自动重启了。
第二个原因，这些进程都是短时进程，也就是在其他应用内部通过 exec 调用的外面命令。这些命令一般都只运行很短的时间就会结束，你很难用 top 这种间隔时间比较长的工具发现（上面的案例，我们碰巧发现了）。

方案如下：
# 记录性能事件，等待大约 15 秒后按 Ctrl+C 退出
$ perf record -g 
# 查看报告
$ perf report


碰到常规问题无法解释的 CPU 使用率情况时，首先要想到有可能是短时应用导致的问题，比如有可能是下面这两种情况。

第一，应用里直接调用了其他二进制程序，这些程序通常运行时间比较短，通过 top 等工具也不容易发现。
第二，应用本身在不停地崩溃重启，而启动过程的资源初始化，很可能会占用相当多的 CPU。
对于这类进程，我们可以用 pstree 或者 execsnoop 找到它们的父进程，再从父进程所在的应用入手，排查问题的根源。


```
![](/img/linux-cmd-lists.png)
![](/img/linux-cmd-lists1.png)


```shell

```

```shell

```


```shell

```