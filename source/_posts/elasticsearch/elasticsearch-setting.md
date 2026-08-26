---
title: elasticsearch重要的设置
categories:
  - Java
tags:
  - Java
  - elasticsearch
date: 2022-06-27 12:44:51
updated: 2022-06-27 12:44:51
---
# 1. 堆大小检查
> 如果 JVM 以不相等的初始堆大小和最大堆大小启动，则在系统使用期间调整 JVM 堆的大小时，它很容易出现暂停。为避免这些调整大小暂停，最好在初始堆大小等于最大堆大小的情况下启动 JVM。此外，如果 bootstrap.memory_lock启用，JVM 将在启动时锁定堆的初始大小。如果初始堆大小不等于最大堆大小，则在调整大小后，所有 JVM 堆都不会锁定在内存中。要通过堆大小检查，您必须配置堆大小。
-xms: 1g // 最小堆内存
-xmx: 1g // 最大堆内存
# 2. 文件描述符
> Elasticsearch 需要大量文件描述符（例如，每个分片由多个段和其他文件组成，加上与其他节点的连接等）。此引导检查在 OS X 和 Linux 上强制执行。要通过文件描述符检查，您可能必须配置文件描述符。
<https://blog.csdn.net/qq_32348883/article/details/124265412>
ulimit -n 65535

# 3. 内存锁定检查

> 当 JVM 进行主要的垃圾回收时，它会触及堆的每一页。如果这些页面中的任何一个被换出到磁盘，则必须将它们换回内存。这会导致大量磁盘抖动，而 Elasticsearch 更愿意使用它来服务请求。有几种方法可以配置系统以禁止交换。一种方法是请求 JVM 通过mlockall(Unix) 或虚拟锁 (Windows) 将堆锁定在内存中。这是通过 Elasticsearch 设置完成的 bootstrap.memory_lock。但是，在某些情况下，可以将此设置传递给 Elasticsearch，但 Elasticsearch 无法锁定堆（例如，如果elasticsearch 用户没有memlock unlimited. 内存锁检查验证是否bootstrap.memory_lock设置已启用，JVM 已成功锁定堆。要通过内存锁定检查，您可能必须配置
bootstrap.memory_lock

# 4. 最大线程数设置
> Elasticsearch 通过将请求分解为多个阶段并将这些阶段交给不同的线程池执行器来执行请求。Elasticsearch 中的各种任务都有不同的线程池执行器。因此，Elasticsearch 需要能够创建大量线程。最大线程数检查确保 Elasticsearch 进程在正常使用情况下有权创建足够多的线程。此检查仅在 Linux 上强制执行。如果您在 Linux 上，要通过最大线程数检查，您必须配置您的系统以允许 Elasticsearch 进程能够创建至少 **4096** 个线程。这可以通过/etc/security/limits.conf 使用nproc设置来完成
ulimit -u 4096

# 5. 文件大小设置
> 作为单个分片组件的段文件和作为 translog 组件的 translog 生成可能会变得很大（超过数 GB）。在 Elasticsearch 进程可以创建的最大文件大小受到限制的系统上，这可能会导致写入失败。因此，这里最安全的选择是最大文件大小是无限的，这就是最大文件大小引导检查所强制执行的。要通过最大文件检查，您必须将系统配置为允许 Elasticsearch 进程写入无限大小的文件。这可以通过 /etc/security/limits.conf使用fsize设置来完成unlimited

# 6. 最大大小虚拟内存检查

> Elasticsearch 和 Lucene 用于mmap将索引的一部分映射到 Elasticsearch 地址空间，效果非常好。这使某些索引数据远离 JVM 堆，但在内存中以实现极快的访问。为使其有效，Elasticsearch 应具有无限的地址空间。最大大小虚拟内存检查强制 Elasticsearch 进程具有无限的地址空间，并且仅在 Linux 上强制执行。要通过最大大小虚拟内存检查，您必须将系统配置为允许 Elasticsearch 进程拥有无限地址空间的能力。这可以通过/etc/security/limits.conf使用as设置来完成unlimited

# 7. max_map_count文件包含限制一个进程可以拥有的VMA(虚拟内存区域)的数量

> Elasticsearch 还需要能够创建许多内存映射区域。最大映射计数检查检查内核是否允许进程具有至少 262,144 个内存映射区域，并且仅在 Linux 上强制执行。要通过最大地图计数检查，您必须将vm.max_map_count 配置 sysctl 为至少262144.

# 8. 系统调用过滤检查

> Elasticsearch 会根据操作系统（例如，Linux 上的 seccomp）安装各种风格的系统调用过滤器。安装这些系统调用过滤器是为了防止执行与分叉相关的系统调用，以此作为防御机制来抵御对 Elasticsearch 的任意代码执行攻击。系统调用过滤器检查确保如果启用了系统调用过滤器，则它们已成功安装。要通过系统调用过滤器检查，您必须修复系统上阻止系统调用过滤器安装的任何配置错误（检查您的日志），或者通过设置为来自行承担禁用系统调用过滤器的风险。bootstrap.system_call_filter: false

# 9. elasticsearch.yml

| 配置key                                | 配置value                                         | 说明                                                                      | example                |
| ------------------------------------ | ----------------------------------------------- | ----------------------------------------------------------------------- | ---------------------- |
| path.logs                            | /var/log/elasticsearch                          | 日志保存的文件路径                                                               |                        |
| path.data                            | /var/data/elasticsearch                         | 数据保存的文件路径                                                               |                        |
| [cluster.name](http://cluster.name)  | myes                                            | 集群名称                                                                    |                        |
| [node.name](http://node.name)        | node1                                           | 节点名称                                                                    | node.name=${} HOSTNAME |
| network.host                         | 192.168.1.1                                     | 网络IP设置                                                                  |                        |
| discovery.zen.ping.unicast.hosts     | [“192.168.1.11”,“192.168.1.12”,“192.168.1.13”] | 集群发现其他节点机器配置                                                            |                        |
| discovery.zen.minimum_master_nodes | 2                                               | 避免脑裂设置，设置形成集群最少需要的票数。计算公式：(master_eligible_nodes / 2) + 1 必须超过所有机器的一半 |                        |

# 10. jvm.options

```
设置Xms和Xmx不超过物理 RAM 的 50%，以确保有足够的物理 RAM 留给内核文件系统缓存。
- Xms2g 
- Xmx2g

请注意，Elasticsearch 附带的默认 JVM 配置将 Elasticsearch 配置为使用 CMS 收集器。
-XX:+UseSerialGC
```

