---
title: XtraBackup mysql backup
categories:
  - Default
tags:
  - Default
date: 2025-03-06 16:29:54
updated: 2025-03-06 16:29:54
---
# 1. 安装 Percona XtraBackup
```shell
# Ubuntu/Debian
wget https://repo.percona.com/apt/percona-release_latest.$(lsb_release -sc)_all.deb
sudo dpkg -i percona-release_latest.$(lsb_release -sc)_all.deb
sudo apt update
sudo apt install percona-xtrabackup-80

# CentOS/RHEL
sudo yum install https://repo.percona.com/yum/percona-release-latest.noarch.rpm
sudo yum install percona-xtrabackup-80
```
# 备份需要的权限
```
Xtrabackup 备份工具，备份时用户需要有以下权限。
Reload：用于执行 FLUSH TABLES WITH REDO LOCK 和 FLUSH NO_WRITE_TO_BINLOG TABLES 是必需权限。
Replication client：用于执行 SHOW MASTER STATUS 和 SHOW SLAVE STATUS 查看位点信息，是必需权限。
BACKUP_ADMIN：用于执行 LOCK INSTANCE FOR BACKUP，是必需权限。
Process：用于执行 SHOW ENGINE INNODB STATUS 和 SHOW PROCESSLIST 是必需权限。
SYSTEM_VARIABLES_ADMIN：用于在增量备份时执行 SET GLOBAL mysqlbackup.backupid = xxx 操作，是非必需权限。
SUPER：在指定 –kill-long-queries-timeout 需要杀掉慢查询，和从库备份指定 –safe-slave-backup 需要重启复制，需要用到该权限。
SHOW VIEW：确认是否有非 INNODB 引擎表。
如果使用 Page Tracking 进行增量备份，还需要 mysql.component 表的查询权限。
如果指定 –history 还需要 performance_schema.xtraback_history 的 SELECT、INSERT、CREATE、ALTER 权限。
以下是 MySQL 8.0 以上版本的完整授权示例：
CREATE USER 'backuser'@'localhost'  IDENTIFIED WITH mysql_native_password BY 'BackUser@2025';
GRANT BACKUP_ADMIN, PROCESS, RELOAD, LOCK TABLES, REPLICATION CLIENT ON *.* TO 'backuser'@'localhost';
GRANT SELECT ON performance_schema.log_status TO 'backuser'@'localhost';
GRANT SELECT ON performance_schema.keyring_component_status TO backuser@'localhost';
GRANT SELECT ON performance_schema.replication_group_members TO backuser@'localhost';
FLUSH PRIVILEGES;
以下是 MySQL 5.7 版本的完整授权示例：
CREATE USER 'bkpuser'@'localhost' IDENTIFIED BY 's3cret';
GRANT RELOAD, LOCK TABLES, PROCESS, REPLICATION CLIENT ON *.* TO 'bkpuser'@'localhost';
FLUSH PRIVILEGES;
```
# 2. 全量备份（Full Backup）
```shell
# 创建全量备份目录
BACKUP_DIR="/backup/mysql/full/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# 执行备份（无锁表）
xtrabackup --backup \
  --user=backup_user --password=YourSecurePassword -H 127.0.0.1 -P3306 \
  --databases="xxx" \
  --exclude-tables="${TARGET_DATABASE}.${EXCLUDE_TABLE}" \
  --target-dir=$BACKUP_DIR \
  --compress \
  --slave-info \
  --compress-threads=4 | gzip - > xxx.tar.gz

# 生成校验文件（可选）
sha256sum $BACKUP_DIR/backup.xbstream | tee $BACKUP_DIR/checksum.sha256

# 上传至云存储（AWS S3示例）
aws s3 cp --sse AES256 $BACKUP_DIR s3://your-bucket/mysql/full/ --recursive

关键参数介绍：
–backup：发起全量备份。
-u, -H, -P, -p：连接 mysql 实例，用户名、主机 IP、端口、密码。
–slave-info：记录 slave 复制位点信息，一般备份从库需要指定该参数。
–target-dir：备份文件的存放路径。
–parallel：并发拷贝的线程数。
2> /tmp/xtrabackup.log：将备份过程中的日志重定向到 /tmp/xtrabackup.log 文件中。

备份出来的文件中，除了数据文件，还有以下额外的文件：
backup-my.cnf：该文件不是 MySQL 参数文件的备份，只是记录了一些 Innodb 引擎的参数，会在 Prepare 阶段用到。
xtrabackup_logfile：该文件用来保存拷贝的 redo log。
xtrabackup_binlog_info：binlog 位点信息和 GTID 信息。使用该备份恢复后，需要从该 binlog 位点进行增量恢复。
xtrabackup_slave_info：如果是对从库进行备份，指定 –slave-info 该文件会记录主节点的位点信息，取自 SHOW SLAVE STATUS 中的 Relay_Master_Log_File 和 Exec_Master_Log_Pos。如果是给主库备份，该文件为空。
xtrabackup_checkpoints：该文件记录了备份类型和 LSN 信息。
xtrabackup_info：该文件中，记录备份的详细信息。
xtrabackup_tablespaces：记录备份集中表空间的信息。
```
# 全量流式备份
```shell
xtrabackup --backup --slave-info  -u root -H 127.0.0.1 -P3306 -p'YouPassword' \
 --stream=xbstream --target-dir=/data/backup/bakup_`date +"%F_%H_%M_%S"` 2>/data/backup/xtrabackup.log  \
 | ssh root@172.16.104.7 gzip -  > /data/backup/backup.gz

 远程恢复的时候，需要先使用 xbstream 命令进行解压：
 xbstream -x --parallel=10 -C /data/backup/20231113 < ./backup.xbstream
 xbstream 中的 -x 表示解压，–parallel 表示并行度，-C 指定解压的目录，最后一级目录必须存在。
```
# 3. 增量备份（Incremental Backup）
```shell
# 假设最后一次全量备份路径：/backup/mysql/full/20231001
  # 获取上一次备份目录（全量或增量）
LAST_BACKUP=$(ls -d /backup/mysql/*/* | sort | tail -1)

# 创建增量备份目录
INC_DIR="/backup/mysql/inc/$(date +%Y%m%d)"
mkdir -p $INC_DIR

# 执行增量备份
xtrabackup --backup \
  --user=backup_user --password=YourSecurePassword \
  --target-dir=$INC_DIR \
  --incremental-basedir=$LAST_BACKUP \
  --compress \
  --compress-threads=4

# 上传至云存储
aws s3 cp --sse AES256 $INC_DIR s3://your-bucket/mysql/inc/ --recursive

```
# 3. Binlog 实时备份
```shell
# 定时任务（每5分钟同步一次）
*/5 * * * * rsync -avz /var/lib/mysql/mysql-bin.* /backup/mysql/binlog/
# 每日归档并清理旧文件
0 0 * * * find /backup/mysql/binlog/ -name "mysql-bin.*" -mtime +30 -exec rm {} \;
```

# 1. 恢复全量备份
```shell
# 停止 MySQL 服务
systemctl stop mysql

# 清空数据目录
rm -rf /var/lib/mysql/*

# 解压并准备备份
xtrabackup --decompress --target-dir=/backup/mysql/full/20231001
xtrabackup --prepare --apply-log-only --target-dir=/backup/mysql/full/20231001

# 复制数据文件
xtrabackup --copy-back --target-dir=/backup/mysql/full/20231001

# 修改权限并启动
chown -R mysql:mysql /var/lib/mysql
systemctl start mysql
```

# 2. 应用增量备份
```shell
# 解压数据
xtrabackup --decompress --target-dir=/backup/mysql/full/20231001
# 准备全量备份（必须步骤）
xtrabackup --prepare --apply-log-only --target-dir=/backup/mysql/full/20231001

# 应用第一个增量备份
xtrabackup --prepare --apply-log-only \
  --target-dir=/backup/mysql/full/20231001 \
  --incremental-dir=/backup/mysql/inc/20231002

# 应用后续增量备份（按时间顺序）
xtrabackup --prepare --apply-log-only \
  --target-dir=/backup/mysql/full/20231001 \
  --incremental-dir=/backup/mysql/inc/20231003

# 最后准备（确保一致性）
xtrabackup --prepare --target-dir=/backup/mysql/full/20231001

# 复制数据并启动 MySQL（同上）
# 复制数据文件
xtrabackup --copy-back --target-dir=/backup/mysql/full/20231001

# 修改权限并启动
chown -R mysql:mysql /var/lib/mysql
systemctl start mysql
```

# 3. 通过 Binlog 恢复至最新状态
```shell
# 解析增量备份后的 Binlog 位置
cat /backup/mysql/full/20231001/xtrabackup_binlog_info
# 输出示例：mysql-bin.000007 154

# 使用 mysqlbinlog 导出 SQL（从指定位置到故障时间点）
mysqlbinlog --start-position=154 /var/lib/mysql/mysql-bin.000007 ... | mysql -u root -p
```
# 1. 备份脚本示例（mysql_backup.sh）
```shell
#!/bin/bash
# 全量备份（每周日执行）
if [ $(date +%u) -eq 7 ]; then
  BACKUP_DIR="/backup/mysql/full/$(date +%Y%m%d)"
  mkdir -p $BACKUP_DIR
  xtrabackup --backup --user=root --password=YourPassword --target-dir=$BACKUP_DIR
  tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR
  aws s3 cp $BACKUP_DIR.tar.gz s3://your-bucket/mysql-backup/full/
# 增量备份（其他日期）
else
  LAST_FULL=$(ls -d /backup/mysql/full/* | sort | tail -1)
  BACKUP_DIR="/backup/mysql/inc/$(date +%Y%m%d)"
  mkdir -p $BACKUP_DIR
  xtrabackup --backup --user=root --password=YourPassword --target-dir=$BACKUP_DIR --incremental-basedir=$LAST_FULL
  tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR
  aws s3 cp $BACKUP_DIR.tar.gz s3://your-bucket/mysql-backup/inc/
fi


# 清理旧备份（每日 4:00 AM）
0 4 * * * find /backup/mysql/full/ -mtime +30 -exec rm -rf {} \;
0 4 * * * find /backup/mysql/inc/ -mtime +7 -exec rm -rf {} \;

# 查看全部定时任务
sudo crontab -l
# 编辑 crontab
crontab -e
# 全量备份（每周日 2:00 AM）
0 2 * * 7 /scripts/full_backup.sh
# 增量备份（每日 3:00 AM）
0 3 * * 1-6 /scripts/inc_backup.sh

0 23 * * * /home/syscook/xtrabackup_backup.sh full
0 13 * * * /home/syscook/xtrabackup_backup.sh inc
```

```
[生产MySQL] → [XtraBackup 全量/增量] → [本地SSD] → [加密上传至S3]
                          ↓
                  [Binlog 实时同步] → [独立存储]
                          ↓
                   [监控告警] → [运维团队]
```

# 命令参数
```shell

--backup 模式，用于在目标目录中进行备份
--prepare 模式，用于从备份中恢复数据（在--backup模式下创建）
--copy-back 模式，用于从备份中复制数据到原始数据所在的位置；若要移动数据而不是复制，请使用替代的--move-back模式。
--stats 模式，用于扫描指定的数据文件并打印出索引统计信息。

xtrabackup [--defaults-file=#] --backup|--prepare|--copy-back|--stats [OPTIONS]
xtrabackup --prepare --target-dir=/data/backup/mysql/


参数值                                参数用途
–print-defaults             输出mysql实例的参数配置信息
–no-defaults                不从任何配置文件中读取参数信息，除了登录文件
–defaults-file=#            仅从指定的配置文件读取参数
–defaults-extra-file=#      读取额外的配置信息文件
–defaults-group-suffix=#    Also read groups with concat(group, suffix)
–login-path=#               读取登录文件的路径
-v, --version               打印 xtrabackup版本信息
–target-dir=name            备份文件的目录，默认为当前目录xtrabackup_backupfiles/
–backup                     备份操作,备份到target-dir指定的目录
–stats                      计算datadir的统计信息(推荐mysqld离线) calc statistic of datadir (offline mysqld is recommended)
–prepare                    指定备份的准备阶段 （准备一个在备份上启动mysql服务器的备份。）
–export                     当在prepare阶段创建文件到另外的一个数据库 create files to import to another database when prepare.
–apply-log-only             一般情况下,在备份完成后，数据尚且不能用于恢复操作，因为备份的数据中可能会包含尚未提交的事务或已经提交但尚未同步至数据文件中的事务。
                            因此，此时数据 文件仍处理不一致状态。
–apply-log                  它的作用是通过回滚未提交的事务及同步已经提交的事务至数据文件使数据文件处于一致性状态。
–print-param                输出mysqld copyback必须的参数  print parameter of mysqld needed for copyback.
–use-memory=                备份的时候指定的内存，该选项表示和–apply-log选项一起使用，
                            prepare 备份的时候，xtrabackup做crash recovery分配的内存大小，单位字节。也可(1MB,1M,1G,1GB)，推荐1G。用于替代buffer_pool_size
–throttle=#                 和–backup一起使用，指定每秒操作读写对的数量。
–log[=name]                 忽略MySQL选项兼容性的选项
–log-copy-interval=#        日志复制线程完成的检查之间的时间间隔（以毫秒为单位,默认为1秒）。
–extra-lsndir=name          和–backup一起使用,在当前目录保存一份额外的xtrabackup_checkpoints文件
–to-archived-lsn=#          指定prepare备份时apply事务日志的LSN，只能和xtarbackup --prepare选项一起用。
–tables=name                通过正则表达式过滤表
–tables-file=name           按文件中的精确的database.table名称列表进行筛选。
–databases=name             按照数据库进行过滤
–databases-file=name        按照文件中的数据进行过滤
–tables-exclude=name        操作方式和–tables一样，但是匹配的表名将不备份，此参数的优先级高于–tables.
–databases-exclude=name     操作方式和–databases一样，但是匹配的库名将不被备份，优先级高于–databases.
–create-ib-logfile          此参数当前不生效，无效参数
–stream=name                该选项表示流式备份的格式，backup完成之后以指定格式到STDOUT，目前只支持tar(8.0版本仅支持)和xbstream
–decompress                 该选项表示解压–compress选项压缩的文件，解压.qp扩展文件。
–compress[=name]            压缩所有输出数据，包括事务日志文件和元数据文件，通过指定的压缩算法，
                            目前唯一支持的算法是quicklz.结果文件是qpress归档格式，
                            每个xtrabackup创建的*.qp文件都可以通过qpress程序提取或者解压缩
–compress-threads=          # 备份压缩的并行线程，默认为1.并行压缩（‘compress-threads’）可以和并行文件拷贝(‘parallel’)一起使用。
                            例如:’–parallel=4 --compress --compress-threads=2’会创建4个IO线程读取数据并通过管道传送给2个压缩线程。
–compress-chunk-size=#      压缩线程工作buffer的字节大小，默认是64K
–encrypt=name               该选项表示通过ENCRYPTION_ALGORITHM的算法加密innodb数据文件的备份，
                            目前支持的算法有ASE128,AES192,AES256。
–encrypt-key=name           该选项使用合适长度加密key，因为会记录到命令行，所以不推荐使用。
–encrypt-key-file=name      该选项表示文件必须是一个简单二进制或者文本文件，加密key可通过以下命令行命令生成：openssl rand -base64 24。
–encrypt-threads=#          该选项表示并行加密的worker线程数量，默认为1.
–encrypt-chunk-size=#       该选项表示每个加密线程worker buffer的大小，单位是字节，默认是64K。
–decrypt=name               该选项表示解密通过–encrypt选项加密的.xbcrypt文件。
–remove-original            当删除解密和解压完后删除 .qp and .xbcrypt 文件
–rebuild_indexes            在apply事务日志之后重建innodb辅助索引，只有和–prepare一起才生效。
–rebuild_threads=#          在紧凑备份重建辅助索引的线程数，只有和–prepare和rebuild-index一起才生效。
–close-files                该选项表示关闭不再访问的文件句柄，当xtrabackup打开表空间通常并不关闭文件句柄目的是正确的处理DDL操作。
                            如果表空间数量巨大，这是一种可以关闭不再访问的文件句柄的方法。使用该选项有风险，会有产生不一致备份的可能。
–core-file                  Write core on fatal signals
–copy-back                  做数据恢复时将备份数据文件拷贝到MySQL服务器的datadir。
–move-back                  这个选项与–copy-back相似，唯一的区别是它不拷贝文件，而是移动文件到目的地。
                            这个选项移除backup文件，用时候必须小心。使用场景：没有足够的磁盘空间同事保留数据文件和Backup副本
                            注意：
                            1.datadir目录必须为空。除非指定innobackupex --force-non-empty-directorires选项指定，否则–copy-backup选项不会覆盖
                            2.在restore之前,必须shutdown MySQL实例，你不能将一个运行中的实例restore到datadir目录中
                            3.由于文件属性会被保留，大部分情况下你需要在启动实例之前将文件的属主改为mysql，这些文件将属于创建备份的用户

–galera-info                该选项表示生成了包含创建备份时候本地节点状态的文件xtrabackup_galera_info文件，该选项只适用于备份PXC。
–slave-info                 该选项表示对slave进行备份的时候使用，打印出master的名字和binlog pos，
                            同样将这些信息以change master的命令写入xtrabackup_slave_info文件。可以通过基于这份备份启动一个从库。
–no-lock                    该选项表示关闭FTWRL的表锁，只有在所有表都是Innodb表并且不关心backup的binlog pos点，
                            如果有任何DDL语句正在执行或者非InnoDB正在更新时（包括mysql库下的表），都不应该使用这个选项，
                            后果是导致备份数据不一致，如果考虑备份因为获得锁失败，可以考虑–safe-slave-backup立刻停止复制线程。
–lock-ddl                   若mysql serve支持在备份支持发出LOCK TABLES FOR BACKUP指令阻止所有的DDL操作。
–lock-ddl-timeout=          #若在指定时间内未返回值则终止备份。
–lock-ddl-per-table         在xtrabackup开始复制之前锁定每个表的DDL直到备份完成
–safe-slave-backup          该选项表示为保证一致性复制状态，这个选项停止SQL线程并且等到show status中的slave_open_temp_tables为0的时候开始备份，
                            如果没有打开临时表，bakcup会立刻开始，否则SQL线程启动或者关闭知道没有打开的临时表。
–safe-slave-backup-timeout  如果slave_open_temp_tables在–safe-slave-backup-timeount（默认300秒）秒之后不为0，从库sql线程会在备份完成的时候重启。
–rsync                      该选项表示通过rsync工具优化本地传输，当指定这个选项，innobackupex使用rsync拷贝非Innodb文件而替换cp，当有很多DB和表的时候会快很多，不能–stream一起使用。
–force-non-empty-directories指定该参数时候，使得 --copy-back或–move-back选项转移文件到非空目录，已存在的文件不会被覆盖。如果–copy-back和–move-back文件需要从备份目录拷贝一个在datadir已经存在的文件，会报错失败。
–no-version-check           该选项关闭版本检查，当–version-check选项开启的时候。
–tables-compatibility-check 此选项开启表存储引擎兼容性告警，默认开启。可使用–skip-tables-compatibility-check关闭。
–no-backup-locks            该选项在backup阶段控制锁，替换FLUSH TABLES WITH READ LOCK命令。默认开启，关闭需使用参数–no-backup-locks。
                            当mysql服务器不支持backup locks时候此参数无效。
-u, --user=name             备份的用户名
-H, --host=name             备份的IP地址
-P, --port=#                备份的端口
-p, --password[=name]       备份时用户的密码
-S, --socket=name           备份时连接的unix操作系统的socket文件
-h, --datadir=name          数据恢复时候的数据目录.从my.cnf中读取，或者命令行指定。
-t, --tmpdir=name           当使用–print-param指定的时候打印出正确的tmpdir参数。用于存储临时文件的路径，在轮训模式下可以指定多个路径，使用英文的:分隔
–parallel=                  指定备份时拷贝多个数据文件并发的进程数，默认值为1。
–log-bin[=name]             binlog的日志序列
–incremental-lsn=name       和–backup一起使用。
–incremental-basedir=name   和–backup一起使用，仅拷贝.ibd中新增的数据到指定路径，增量备份.
–incremental-dir=name       和–prepare一起使用，将.delta文件和logfile保存在指定的路径.
–incremental-force-scan     该选项表示创建一份增量备份时，强制扫描所有增量备份中的数据页
–incremental-history-name   该选项表示存储在PERCONA_SCHEMA.xtrabackup_history基于增量备份的历史记录的名字。
                            Percona Xtrabackup搜索历史表查找最近（innodb_to_lsn）成功备份并且将to_lsn值作为增量备份启动出事lsn.
                            与innobackupex–incremental-history-uuid、–incremental-basedir、–incremental-lsn互斥。
                            如果没有检测到有效的lsn，xtrabackup会返回error。
                            和选项–incremental一起使用。
                            –incremental-history-uuid   该选项表示存储在percona_schema.xtrabackup_history基于增量备份的特定历史记录的UUID。
                            和选项–incremental一起使用。
innobackupex遗留参数
​
参数值                                        参数用途
–ftwrl-wait-query-type  该选项表示获得全局锁之前允许那种查询完成，默认是ALL，可选update。
–ftwrl-wait-threshold   该选项表示检测到长查询，单位是秒，表示长查询的阈值。
                        若–ftwrl-wait-timeout=0此参数无效，默认值为60s。
–ftwrl-wait-timeout=#   此选项指定innobackupex在运行之前应等待阻止FTWRL的查询的时间（以秒为单位）。
                        如果超时到期时仍有此类查询，则innobackupex将终止并显示错误。
                        默认值为0，在这种情况下，innobackupex不会等待查询完成并立即启动FTWRL。
–kill-long-queries-timeout  该选项表示从开始执行FLUSH TABLES WITH READ LOCK到kill掉阻塞它的这些查询之间等待的秒数。默认值为0，不会kill任何查询，使用这个选项xtrabackup需要有Process和super权限。
–kill-long-query-type       该选项表示kill的类型，默认是all，可选select。
–history                    该选项表示percona server 的备份历史记录在percona_schema.xtrabackup_history表。
–debug-sleep-before-unlock  仅用于xtrabackup测试套件的debug信息
–check-privileges           在执行查询之前检查数据库用户的权限。

安全备份的参数
​
参数值                               参数用途
–server-public-key-path=name    File path to the server public RSA key in PEM format.
–server-public-key-path=name    File path to the server public RSA key in PEM format.
–get-server-public-key  Get server public key
–ssl-mode=name  SSL connection mode.
–ssl-ca=name    CA file in PEM format.
–ssl-capath=name    CA directory.
–ssl-cert=name  X509 cert in PEM format.
–ssl-cipher=name    SSL cipher to use.
–ssl-key=name   X509 key in PEM format
–ssl-crl=name   Certificate revocation list.
–ssl-crlpath=name   Certificate revocation list path.
–tls-version=name   TLS version to use, permitted values are: TLSv1, TLSv1.1,TLSv1.2
–ssl-fips-mode=name SL FIPS mode to use, permitted values are: OFF, ON,STRICT
```