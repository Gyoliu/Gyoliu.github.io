---
title: nginx-install-error-collect
categories:
  - Default
  - Linux
tags:
  - Default
  - nginx
  - SELinux
date: 2025-06-25 11:51:44
updated: 2025-06-25 11:51:44
---
## 1. 无法读取 ssl 密钥
> 2025/06/25 11:41:21 [emerg] 8982#8982: cannot load certificate "/etc/nginx/ssl/star_crclogistics_com.pem": BIO_new_file() failed (SSL: error:0200100D:system library:fopen:Permission denied:fopen('/etc/nginx/ssl/star_crclogistics_com.pem','r') error:2006D002:BIO routines:BIO_new_file:system lib)
## 解决方案
```bash
问题1：SELinux 阻止了正常操作

sudo grep "avc:.*denied" /var/log/audit/audit.log

解决方案：
    查看状态： sestatus -v
    首先确认是否是 SELinux 导致的问题：
    grep "avc:" /var/log/audit/audit.log
    如果是，可以临时设置为 permissive 模式测试：
    sudo setenforce 0
    永久解决方案是调整 SELinux 策略或修改文件上下文

[root@scdp-ng-pro-01 nginx]# ls -lrtZ /etc/nginx/ssl/
-rwxrwxrwx. root root unconfined_u:object_r:user_home_t:s0 star_crclogistics_com.key
-rwxrwxrwx. root root unconfined_u:object_r:user_home_t:s0 star_crclogistics_com.pem

# 修复文件权限
[root@scdp-ng-pro-01 nginx]# restorecon -v -R /etc/nginx/ssl
restorecon reset /etc/nginx/ssl context unconfined_u:object_r:user_home_t:s0->unconfined_u:object_r:httpd_config_t:s0
restorecon reset /etc/nginx/ssl/star_crclogistics_com.key context unconfined_u:object_r:user_home_t:s0->unconfined_u:object_r:httpd_config_t:s0
restorecon reset /etc/nginx/ssl/star_crclogistics_com.pem context unconfined_u:object_r:user_home_t:s0->unconfined_u:object_r:httpd_config_t:s0
[root@scdp-ng-pro-01 nginx]# 
[root@scdp-ng-pro-01 nginx]# ls -lrtZ /etc/nginx/ssl/
-rwxrwxrwx. root root unconfined_u:object_r:httpd_config_t:s0 star_crclogistics_com.key
-rwxrwxrwx. root root unconfined_u:object_r:httpd_config_t:s0 star_crclogistics_com.pem


#添加一个mysql数据目录
semanage fcontext -a -t mysqld_db_t “/disk1/data(/.*)?”
# 加载这个目录 restorecon，这个命令的作用就是把文件的安全上下文恢复成默认的安全上下文
restorecon -Rv /data


sudo semanage port -a -t http_port_t -p tcp 8400
使用`semanage port -a -t mysql_port_t -p tcp 3306`命令添加MySQL默认端口到SELinux策略，同时确保数据目录正确标注，执行
# 安全上下文的修改
`chcon -R -t mysqld_db_t /var/lib/mysql`
```