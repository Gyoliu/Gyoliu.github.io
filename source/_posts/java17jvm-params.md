---
title: java17jvm-params
categories:
  - Default
tags:
  - Default
date: 2025-04-10 09:08:04
updated: 2025-04-10 09:08:04
---

```bash
--add-opens=java.base/java.lang=ALL-UNNAMED \
    -Xms1500m -Xmx1500m \
    -XX:ReservedCodeCacheSize=256m \
    -XX:InitialCodeCacheSize=256m \ 
    -XX:+UnlockExperimentalVMOptions \
    -XX:+UseZGC \
    -XX:ConcGCThreads=1 -XX:ParallelGCThreads=2 \
    -XX:ZCollectionInterval=30 -XX:ZAllocationSpikeTolerance=5 \
    -XX:+UnlockDiagnosticVMOptions -XX:-ZProactive \
    -Xlog:safepoint,classhisto*=trace,age*,gc*=info:file=/opt/gc-%t.log:time,tid,tags:filecount=5,filesize=50m \
    -XX:+HeapDumpOnOutOfMemoryError \
    -XX:HeapDumpPath=/opt/errorDump.hprof


-Xmx18g -Xms18g 堆大小
-XX:MaxDirectMemorySize=2G 直接内存
-XX:+HeapDumpOnOutOfMemoryError 当JVM发生OOM时，自动生成DUMP文件。
-XX:ReservedCodeCacheSize=256m -XX:InitialCodeCacheSize=256m 设置codecache大小 默认128m
-XX:+UseZGC 使用ZGC
-XX:ZAllocationSpikeTolerance=2 ZGC触发自适应算法的修正系数，默认2，数值越大，越早的触发ZGC
-XX:ZCollectionInterval=0 ZGC的周期。默认值为0，表示不需要触发垃圾回收。固定周期垃圾回收。ZGC发生的最小时间间隔，单位秒
-XX:ConcGCThreads=4 并发阶段的GC线程数，默认是总核数的12.5%
-XX:ZStatisticsInterval=10 控制统计信息输出的间隔，默认10s
-XX:ParallelGCThreads=16 并行工作线程数据，STW阶段使用线程数，默认是总核数的60%
-Xlog:safepoint,classhisto=trace,age,gc*=info:file=/opt/logs/logs/gc-%t.log:time,tid,tags:filecount=5,filesize=50m’ 设置GC日志中的内容、格式、位置以及每个日志的大小
```
