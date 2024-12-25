---
title: Linux 大文件查找
categories:
  - Linux
tags:
  - Linux
date: 2020-11-20 00:34:14
updated: 2020-11-20 00:34:14
---
### du 命令用于显示目录或文件的大小
* -b 显示目录或文件大小时，以byte为单位。
* -h 以K，M，G为单位，提高信息的可读性。 **使用这个会导致排序问题**
```shell
##返回前十的大目录
du / | sort -nr | head -10
##查找大文件
find / -type f -size +800M  -print0 | xargs -0 ls -l
ls -lh
```
