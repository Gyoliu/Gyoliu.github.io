---
title: openssl 编译安装
categories:
  - Linux
tags:
  - Linux
  - openssl
date: 2022-09-20 12:53:56
updated: 2022-09-20 12:53:56
---
## 1. 官方下载地址
<https://www.openssl.org/source/>
## 2. 依赖安装
```shell
yum install gcc libffi-devel zlib* openssl-devel
```

## 3. 编译

```shell
./config --prefix=/usr/local/openssl shared zlib
其中 --prefix=/usr/local/openssl  指定编译到那个目录下
make && make install
```

## 4. 备份

```shell
which openssl  或  find / -name openssl
 mv /usr/bin/openssl /usr/bin/openssl.1.0.1e
 
```

## 5. 建立软连接

```shell
ln -s /usr/local/openssl/bin/openssl /usr/bin/openssl
ln -s /usr/local/openssl/include/openssl /usr/include/openssl
```

## 6. 设定动态链接库

```shell
echo "/usr/local/openssl/lib" >> /etc/ld.so.conf
ldconfig -v
```

## 7. 验证

```shell
openssl version -a
```
