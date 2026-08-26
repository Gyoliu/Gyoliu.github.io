---
title: jdk tools jvm jmap jstat jstack
categories:
  - Java
tags:
  - Java
date: 2021-07-02 11:43:31
updated: 2021-07-02 11:43:31
---
### jmap输出内存快照
```shell
jmap -dump:format=b,file=/data/jmap.hprof PID

增加GC日志
-XX:+HeapDumpOnOutOfMemoryError 
-Xloggc:/data/tomcat/logs/gc.log 
-XX:+PrintGCDateStamps 
-XX:+PrintGCDetails 
-XX:+PrintGCApplicationStoppedTime
```
### jstat 查看GC信息
```shell
3000 是指定的频率
jstat -gcutil PID 3000

使用jstat -gccause：额外输出上次GC原因
```
### jstack 死锁问题

```shell
jstack主要的用途是打印出Thread dump
jstack pid  > ./stack.log
选项	作用
-F	当正常输出请求不被响应时，强制输出线程堆栈
-l	除堆栈外，显示关于锁的附加信息
```

### sz 下载大文件问题
```shell
# 把iso切分成500M大小的文件
cat xxx文件 | split -b 500M - xxx_1

# 切分后都是以 .aa   .ab  .ac .... 类似这样的结构

# sz 下载
sz xxx_1a*

# 合并文件
cat xxx* > xxx_1

# windows 文件合并
copy /b ＜filename1＞+＜filename2＞+…+＜filenameN＞ ＜新filename＞
```