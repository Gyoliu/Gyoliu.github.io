---
title: java17jvm-params
categories:
  - Default
tags:
  - Default
date: 2025-04-10 09:08:04
updated: 2025-04-10 09:08:04
---


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