---
title: Linux服务器Java进程突然消失
categories:
  - Linux
tags:
  - Linux
date: 2021-02-18 09:55:53
updated: 2021-02-18 09:55:53
---
### 检查应用日志是否有异常日志
```
 -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=${目录}。
参数说明：
（1）-XX:+HeapDumpOnOutOfMemoryError参数表示当JVM发生OOM时，自动生成DUMP文件。
（2）-XX:HeapDumpPath=${目录}参数表示生成DUMP文件的路径，也可以指定文件名称。
例如：-XX:HeapDumpPath=${目录}/java_heapdump.hprof。如果不指定文件名，默认为：java_<pid>_<date>_<time>_heapDump.hprof。
**之后可以通过一些分析工具查看应用问题**
```
### 检查 JVM 是否异常
```
启动应用时最好指：XX:ErrorFile=/var/log/hs_err_pid<pid>.log，没有指定是生成在工作目录下
```
### 被操作系统OOM-Killer
```
Linux 内核有个机制叫OOM killer（Out-Of-Memory killer），该机制会监控那些占用内存过大，尤其是瞬间很快消耗大量内存的进程，为了防止内存耗尽而内核会把该进程杀掉。
因此，你发现java进程突然没了，首先要怀疑是不是被linux的OOM killer给干掉了！
系统报错日志:/var/log/messages

grep -i 'killed process' /var/log/messages  
-i 是忽略大小写
或者
grep 'Out of memory' /var/log/messages

dmesg -T| grep java
#或者
dmesg -T | grep 'Out of memory'
# -T 是显示时间戳
```

> 　检查了下监控，发现外网大量的流程导致操作系统 kill 了进程。 ![微信图片20210218115721.png](/img/微信图片20210218115721.png)

### 解决方案 -> Linux Swap , 针对小内存服务器

> SWAP 概述 当系统的物理内存不够用的时候，就需要将物理内存中的一部分空间释放出来，以供当前运行的程序使用。那些被释放的空间可能来自一些很长时间没有什么操作的程序，这些被释放的空间被临时保存到Swap空间中，等到那些程序要运行时，再从Swap中恢复保存的数据到内存中。这样，系统总是在物理内存不够时，才进行Swap交换。

> swap 的大小设置一般是和内存大小一样或者设置为内存大小的2倍
实际上，并不是等所有的物理内存都消耗完毕之后，才去使用swap的空间，什么时候使用是由swappiness 参数值控制。 cat /proc/sys/vm/swappiness 60 该值默认值是60. swappiness=0的时候表示最大限度使用物理内存，然后才是 swap空间，
swappiness＝100的时候表示积极的使用swap分区，并且把内存上的数据及时的搬运到swap空间里面。
永久修改： 在/etc/sysctl.conf 文件里添加如下参数： vm.swappiness=10
sysctl -p 生效

### 开启 Swap
<https://blog.csdn.net/ygm_linux/article/details/24532809>
<https://www.cnblogs.com/williamjie/p/10271347.html>

