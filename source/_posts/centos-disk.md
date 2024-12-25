---
title: centos 磁盘挂载
categories:
  - Linux
tags:
  - Linux
date: 2024-01-29 13:10:53
updated: 2024-01-29 13:10:53
---
### 查看磁盘： 
> lsblk

### 格式化磁盘： 
> fdisk /dev/sdb
n->p->1->回车->回车->w

### 创建磁盘：
```shell
mkfs.xfs /dev/sdb1
mkdir /app
echo "/dev/sdb1 /app xfs defaults 0 0" >> /etc/fstab
mount -a
df -h
```yml