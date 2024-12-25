---
title: Linux 删除大文件内容
categories:
  - Linux
tags:
  - Linux
date: 2021-01-28 09:49:12
updated: 2021-01-28 09:49:12
---
### 查看当前目录下一级子文件和子目录占用的磁盘容量
```shell
du -lh --max-depth=1 | sort -nr
du -m –max-depth=1 |sort -gr
```

### 查看根目录下前10大的文件夹
```shell
du / | sort -nr | head -10
```
### 删除文件内容
```shell
删除文件到指定的大小 ， 0 是指定的大小
truncate -s 0 my_file
删除文件内容
echo "" > my_file

删除my_file前面第1行到10000行 (这个比较耗时)
sed -i '1,10000d' my_file

用lsof检查后才发现原因是,有文件被删除,而进程还活着,因而造成还占用空间的现象

[root@/]# lsof |grep delete

根据lsof列出的进程号,kill这些进程后,空间就释放出来了
```