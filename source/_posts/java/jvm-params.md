---
title: JVM常用参数
categories:
  - Java
tags:
  - Java
  - JVM
date: 2023-05-06 13:01:17
updated: 2023-05-06 13:01:17
---
[阿里 Serverless JVM 最佳实践](https://help.aliyun.com/document_detail/148851.html?spm=a2c4g.383255.0.0.30855accl7pyIr)

```
# [阿里 Serverless JVM 最佳实践]
https://help.aliyun.com/document_detail/148851.html?spm=a2c4g.383255.0.0.30855accl7pyIr

在Java虚拟机的参数中，有3种表示方法

标准参数（-），所有的JVM实现都必须实现这些参数的功能，而且向后兼容；
非标准参数（-X），默认jvm实现这些参数的功能，但是并不保证所有jvm实现都满足，且不保证向后兼容；
非Stable参数（-XX），此类参数各个jvm实现会有所不同，将来可能会随时取消，需要慎重使用（但是，这些参数往往是非常有用的）；


# 感知容器内存限制
-XX:+UseContainerSupport
# 设置JVM最大内存为整个宿主总内存的占比，适合docker容器内存动态调整
-XX:MaxRAMPercentage=80.0  -XX:MinRAMPercentage=80.0 -XX:InitialRAMPercentage=80.0
# 固定设置堆内存大小，不能感知宿主内存大小动态调整
-Xmx/-Xms

# GC 日志打印 
-XX:+PrintGCDetails
-XX:+PrintGCDateStamps
-XX:+PrintHeapAtGC
-XX:+PrintCommandLineFlags
-XX:+PrintFlagsFinal
-Xloggc:/gc-%t.log 
-XX:+HeapDumpOnOutOfMemoryError 
-XX:HeapDumpPath=/data/logs/heapdump.hprof 

# 垃圾回收器
-XX:+UseSerialGC
# 允许使用并行清除垃圾收集器（也称为吞吐量收集器），以利用多个处理器来提高应用程序的性能。默认情况下，此选项是禁用的
-XX:+UseParallelGC
# 允许在年轻代中使用并行线程进行收集。默认情况下，此选项处于禁用状态。
-XX:+USeParNewGC
-XX:+UseG1GC
-XX:+UseZGC


jps： 跟linux的ps一样，只不过是列出java程序
jps -m  列出所有java程序，并显示传入参数 
jps -l  列出所有java程序，显示类的全限名

jstat：观察java程序运行时的相关信息，主要是堆信息
jstat -class -t pid 1000 2  查看classLoader相关信息，每隔一秒执行一次，总共收集两次
jstat -gc pid 查看gc情况
jstat -gcnew pid  查看新生代的详细信息
jstat -gcold pid  查看老年代的详细信息

jinfo：查看java应用程序的扩展参数，部分参数可支持动态修改
jinfo -flag MaxtenuringThreshold pid 查看gc升级年龄
jinfo -flag +PrintGCDetails pid  修改使用PrintGCDetails参数

jmap：导出堆到文件
jmap -histo pid > /usr/local/tmp/a.txt  java程序的对象统计信息
jmap -histo:live 
jmap -dump:format=b file=/tmp/heap.hprof PID 得到java程序的当前快照，主要用于分析线程的运行情况

jstack：查看线程堆栈
jstack -l pid > /tmp/stack.hprof 这里-l是打印锁的详细信息然后
输出到指定目录的*.hprof文件中

# 常用启动命令
nohup java -Xms2g -Xmx2g -server -verbose:gc -XX:HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=dump.hprof -XX:+PrintGCDateStamps 
-XX:+PrintGCDetails -Xloggc:log/gc-%t.log -XX:+UseGCLogFileRotation 
-XX:NumberOfGCLogFiles=2 -XX:GCLogFileSize=100M -XX:+CrashOnOutOfMemoryError 
-jar app.jar  >/dev/null 2>&1 &


# 容器docker file
ENV JAVA_OPTS="-server -XX:+UseContainerSupport -XX:+UseG1GC -XX:MaxRAMPercentage=80.0  -XX:MinRAMPercentage=80.0 -XX:InitialRAMPercentage=80.0 -Duser.timezone=GMT+8 -Ddruid.mysql.usePingMethod=false"
ENV PARAMS=""
ENTRYPOINT ["sh","-c", "java -jar $JAVA_OPTS /itsm-module-job-service.jar $PARAMS"]
```

[上一篇 ](/archives/hello-halo "Hello Halo")[下一篇](/archives/hibernate%E5%8E%9F%E7%94%9F%E6%9F%A5%E8%AF%A2%E7%BB%93%E6%9E%9C%E9%9B%86%E6%98%A0%E5%B0%84%E6%BA%90%E7%A0%81%E9%98%85%E8%AF%BB "hibernate原生查询，结果集映射源码阅读")
