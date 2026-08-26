---
title: mysql主从搭建
categories:
  - Default
  - mysql
tags:
  - Default
  - mysql
date: 2025-03-11 09:16:40
updated: 2025-03-11 09:16:40
---
# 主服务器配置
```shell
#服务器 id，随意，但要唯一
server-id = 1  
#二进制文件存放路径
log-bin = mysql-bin 
#参数用于排除自带的数据库。  
binlog-ignore-db = mysql 
binlog-ignore-db = information_schema
binlog-ignore-db = performance_schema
#二进制日志格式，建议使用ROW格式以获得更好的兼容性和可靠性。
binlog-format = ROW 


#创建用户
CREATE USER 'db_sync'@'%' IDENTIFIED BY 'xxx';
#授权账号复制权限
GRANT REPLICATION SLAVE ON *.* TO 'db_sync'@'%';
#刷新配置
FLUSH PRIVILEGES;

CREATE USER 'repl'@'从库IP' IDENTIFIED BY '密码';
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'从库IP';
FLUSH PRIVILEGES;


#记下输出中的 File 和 Position 值，后续在从服务器上使用。
SHOW MASTER STATUS \G;
```
# 从服务器配置
```shell
server-id = 2
#中继日志文件的名称，用于从主服务器接收二进制日志事件。
relay-log = mysql-relay-bin 
#从服务器的二进制日志文件的名称。
log_bin = mysql-bin 
# 从库只读‌
read_only = 1                   
#不同步相关的库
replicate-ignore-db = mysql 
replicate-ignore-db = information_schema
replicate-ignore-db = performance_schema

为了保障较高的数据安全性，master配置sync_binlog=1，innodb_flush_log_at_trx_commit=1等设置。
而Slave可以关闭binlog，innodb_flush_log_at_trx_commit也可以设置为0来提高sql的执行效率

# sync_binlog的工作原理
- 当sync_binlog设置为0时，MySQL在事务提交后不会立即执行磁盘同步操作，而是依赖文件系统来决定何时同步。这种设置可以提高性能，但在系统崩溃的情况下可能会丢失数据。
- 设置为1时，MySQL会在每次事务提交后立即将binlog缓存中的数据同步到磁盘，这提供了最高的数据安全性，但会增加磁盘I/O的负担，从而影响性能。
- 设置为大于1的值时，MySQL会在多次事务提交后执行一次磁盘同步，这是一种折中的策略，既保证了一定程度的数据安全性，又提高了性能。

# innodb_flush_log_at_trx_commit
该参数是MySQL InnoDB存储引擎独有的参数，用于控制InnoDB的Redo log日志记录方式。取值范围为0、1、2：
0：每秒将日志缓冲区（Log Buffer）中的数据写入磁盘，事务提交时不主动刷盘。
优点：性能最高。
风险：实例崩溃时可能丢失最多1秒的事务数据。
1（默认值）：每次事务提交时，立即将日志缓冲区的数据写入磁盘并刷盘。
优点：完全遵守ACID特性，数据安全性最高。
缺点：性能开销较大，尤其在高并发场景下。
2：每次事务提交时将日志缓冲区的数据写入文件系统缓存，每秒由操作系统调度刷盘一次。
优点：性能优于1，数据安全性高于0。
风险：实例崩溃时可能丢失最近1秒内的事务数据。

调优原则
高安全性场景：建议将innodb_flush_log_at_trx_commit和sync_binlog均设置为1，确保数据实时落盘。
高性能场景：可以将innodb_flush_log_at_trx_commit设置为 2，sync_binlog设置为1000，以提升性能，但需接受一定的数据丢失风险。
不推荐的配置：
将innodb_flush_log_at_trx_commit设置为0：可能导致实例重启时丢失大量数据。
将sync_binlog设置为0：可能导致Binlog Rotate阻塞时间过长，影响性能稳定性。

#启动从库
systemctl restart mysqld

#在从服务器指定主库并开启同步
#暂停同步
STOP SLAVE;

CHANGE MASTER TO
 MASTER_HOST = '10.10.104.51',
 MASTER_USER = 'db_sync',
 MASTER_PASSWORD = 'xxx',
 #主服务器数据库上的file值(不能有空格)
 #这里的填写主服务器，上面2.4部分的File 值
 MASTER_LOG_FILE = 'mysql-bin.000001',   
 #这里的填写主服务器，上面2.4部分的Position值 SHOW MASTER STATUS \G; 获取
 MASTER_LOG_POS = 157,
 get_master_public_key=1;


 # gtid模式

CHANGE MASTER TO
MASTER_HOST='主库IP',
MASTER_USER='repl',
MASTER_PASSWORD='密码',
MASTER_AUTO_POSITION=1;



```

# sync_binlog innodb_flush_log_at_trx_commit 参数设置示例 下文通过几个典型的场景对上述两个参数的配置进行说明：
# 场景一：只读实例延迟
RDS MySQL提供只读实例功能，用于分担主实例的读压力。如果只读实例使用默认参数模板（sync_binlog=1，innodb_flush_log_at_trx_commit=1），在主实例写压力较大时，可能导致只读实例的Binlog应用延迟。
优化建议：
将只读实例的sync_binlog设置为1000，innodb_flush_log_at_trx_commit设置为2，提升Binlog应用效率。
注意：此配置不能完全消除延迟，需根据具体情况进行分析。
# 场景二：DTS数据迁移速度慢
在使用 DTS 进行数据迁移时，目标实例可能因频繁的Binlog和Redo Log落盘操作导致写入性能瓶颈。
优化建议：
将目标实例的sync_binlog设置为1000，innodb_flush_log_at_trx_commit设置为 2，加速数据写入。
数据迁移完成后，可根据需求恢复默认配置。
# 场景三：热点更新性能差
在大促或秒杀场景中，若sync_binlog和innodb_flush_log_at_trx_commit均设置为 1，可能导致大量并发写入时性能下降。
优化建议：
临时将sync_binlog设置为1000，innodb_flush_log_at_trx_commit设置为 2，提升并发能力。
活动结束后恢复默认配置，确保数据安全性。


# 如果主从不同步需要全量初始化从库
```shell
#停止异常的同步
stop slave;
#重置slave，会重置从库相关设置。
reset slave all;
#清除已同步数据库 请重视备份
drop database `***`;

#重置主库同步设置
RESET MASTER;

#锁定主库，只能读
FLUSH TABLES WITH READ LOCK;
# 导出数据库
mysqldump –h(ip***) –P(port***) –u(user***) –p(pwd***) --all-databases > /master-dump.sql
#解锁主库
UNLOCK TABLES;
```

### mysql 设置root密码
```shell
# 初始化
sudo mysql_secure_installation

sudo vim /etc/mysql/mysql.conf.d/mysqld.cnf
skip-grant-tables

sudo systemctl restart mysql
mysql -uroot

flush privileges;
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'xx';
flush privileges;

sudo mkdir -p /var/run/mysqld
sudo chown -R mysql:mysql /var/run/mysqld
sudo chmod -R 750 /var/run/mysqld


# 如果要改msyql 的socket 等文件位置 必须修改 AppArmor 策略文件
sudo vim /etc/apparmor.d/usr.sbin.mysqld
/var/lib/mysqld/** rwkl,
/var/lib/mysqld/ rw,
sudo apparmor_parser -r /etc/apparmor.d/usr.sbin.mysqld
sudo systemctl restart mysql


# 解决主从同步错误的临时方案
STOP SLAVE;
SET GLOBAL SQL_SLAVE_SKIP_COUNTER=1;
START SLAVE;

```


### 查看表碎片情况
```sql
SELECT table_name AS `Table`, 
       ROUND(((data_length + index_length) / 1024 / 1024), 2) AS `Size (MB)`,
       ROUND(data_free / 1024 / 1024, 2) AS `Free Space (MB)`
FROM information_schema.tables 
WHERE table_schema = 'your_database_name'
ORDER BY data_free DESC;
```

### 碎片优化语句
```sql
OPTIMIZE TABLE table_name;
```
#### 批量优化整个数据库

```sql
SET @tables = NULL;
SELECT GROUP_CONCAT(table_name) INTO @tables 
FROM information_schema.tables 
WHERE table_schema = 'your_database_name' AND table_type = 'BASE TABLE';
SET @tables = CONCAT('OPTIMIZE TABLE ', @tables);
PREPARE stmt FROM @tables;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```
#### 分析表结构‌

```sql
 ANALYZE TABLE table_name;
```
### 

### 注意事项

‌锁表问题‌：OPTIMIZE TABLE操作会锁定表，在高负载时段应谨慎使用‌78
‌存储引擎差异‌：
MyISAM表：OPTIMIZE会完全重建表，效果显著‌
InnoDB表：会重建表并重新组织数据和索引页‌

‌替代方案‌：对于InnoDB表，可以考虑使用ALTER TABLE table_name ENGINE=InnoDB来重建表‌
‌定期执行‌：建议在业务低峰期定期执行碎片整理，特别是频繁增删改的表‌
‌空间回收‌：OPTIMIZE TABLE可以回收删除数据后未释放的空间‌

### mysql 慢查询
```
mysqldumpslow -s r -t 10 /data/mysql/debian-kjlog-db1-slow.log > slow1.sql
```


### 主库配置
```conf
[mysqld]
server-id = 1  # 必须唯一，主库通常设为1
log-bin = mysql-bin  # 启用二进制日志
binlog-format = ROW  # 推荐生产环境使用ROW格式
binlog_expire_logs_seconds = 2592000  # 设置binlog保留30天(可选)
sync_binlog = 1  # 每次事务提交都同步binlog到磁盘
gtid_mode = ON  # 启用GTID模式‌:ml-citation{ref="6,8" data="citationList"}
enforce_gtid_consistency = ON  # 强制GTID一致性
binlog_group_commit_sync_delay = 100  # 组提交优化参数(可选)
binlog_group_commit_sync_no_delay_count = 10  # 组提交优化参数(可选)
```

### 从库配置
```conf
[mysqld]
server-id = 2  # 必须唯一且不同于主库 
log-bin = mysql-bin  # 推荐从库也开启binlog‌ 
log_slave_updates = ON  # 启用级联复制时需要
read_only = ON  # 设置从库为只读模式
super_read_only = ON  # 防止特权用户写入(8.0+)
skip_slave_start = ON  # 防止自动启动复制(生产安全)
gtid_mode = ON 
enforce_gtid_consistency = ON
```
SHOW BINARY LOG STATUS \G;
SHOW REPLICA STATUS \G;
START REPLICA;

mysql> show binary log status \G;
*************************** 1. row ***************************
             File: binlog.000008
         Position: 12543683
     Binlog_Do_DB: tai_hua
 Binlog_Ignore_DB: 
Executed_Gtid_Set: 2170bdc8-093b-11f0-b82d-005056b87daf:1-57547,
f6f51b80-d477-11ef-bc3e-005056b87daf:1-52662


CHANGE REPLICATION SOURCE TO
SOURCE_HOST='主库IP',
SOURCE_USER='repl',
SOURCE_PASSWORD='password',
SOURCE_PORT=3306,
SOURCE_AUTO_POSITION=1;