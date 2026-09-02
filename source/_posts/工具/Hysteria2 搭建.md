---
title: Hysteria2 搭建
date: 2026-09-02 18:24:21
updated: 2026-09-02 18:24:21
categories:
  - Default
  - SSR
tags:
  - Default
  - SSR
keywords:
  - SSR
  - Hysteria2
description: ssr Hysteria2
comments: true
toc: true
top: 0
hide: false
mathjax: false
katex: false
aplayer: false
copyright: true
layout: post
mermaid: false
---
# Oracle Cloud Ubantu Hysteria2

#1. 准备
```js
1.服务器准备 1c1g 即可
2.域名准备 cloudflare 解析到服务器的外网IP
cloudflare 代理状态： 仅DNS
```

#2.安装
```shell
bash <(curl -fsSL https://get.hy2.sh/)
sudo systemctl status hysteria-server
sudo systemctl restart hysteria-server

服务器开放防火墙：
# 查看现有规则
sudo iptables -L INPUT -n --line-numbers

# 删除指定编号（例如删除第 5 条）
sudo iptables -D INPUT 5

# 插入到第 1 行（优先匹配）
sudo iptables -I INPUT 1 -p udp --dport 443 -j ACCEPT
sudo iptables -I INPUT 1 -p tcp --dport 443 -j ACCEPT

# 保存规则（防止重启丢失）
sudo netfilter-persistent save

#注意，必须检查 oracle cloud 是否开放了防火墙
```

#3.配置文件
sudo vim /etc/hysteria/config.yaml
```yml
listen: :443

acme:
  domains:
    - hy2.example.com
  email: your-email@example.com
  ca: letsencrypt
  type: http

auth:
  type: password
  password: "AUTH_PASSWORD"

obfs:
  type: salamander
  salamander:
    password: "OBFS_PASSWORD"

disableUDP: false
speedTest: false
```

#4.查看 Hysteria 日志
```js
sudo journalctl -u hysteria-server.service -e --no-pager

实时查看：sudo journalctl -u hysteria-server.service -f
```

# 导入到shadowrocket
```js
hysteria2://authpassword@域名:443/?obfs=salamander&obfs-password=obfspassword#Oracle-HY2
```

---

**本文使用 Obsidian 写作，发布于 Hexo。**