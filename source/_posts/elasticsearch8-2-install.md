---
title: elasticsearch8.2集群安装部署
categories:
  - Java
tags:
  - Java
  - elasticsearch
date: 2022-05-18 12:41:39
updated: 2022-05-18 12:41:39
---
# - 1. 下载

```
[elasticsearch下载地址](https://www.elastic.co/start)
[elasticsearch下载地址](https://www.elastic.co/downloads/elasticsearch)
[elasticsearch版本支持](https://www.elastic.co/support/matrix)

[elastic8.2 文档](https://www.elastic.co/guide/en/elasticsearch/reference/8.2/index.html)
[中文文档（有些东西可能过时）](https://www.elastic.co/guide/cn/elasticsearch/guide/current/index.html)
[elasticsearch概念介绍](http://t.zoukankan.com/kevingrace-p-10682264.html)
[运维指南](https://cloud.tencent.com/developer/article/1836799)
[客户端](https://www.elastic.co/guide/en/elasticsearch/client/index.html)
```
# - 2. 集群配置文件

```yml
cluster.name: myes
node.name: node-1
network.host: 127.0.0.1
#transport.tcp.port: 9300
http.port: 9200
http.cors.enabled: true
http.cors.allow-origin: "*"
discovery.seed_hosts: ["127.0.0.1:9300", "127.0.0.1:9301","127.0.0.1:9302"]
cluster.initial_master_nodes: ["127.0.0.1:9300", "127.0.0.1:9301","127.0.0.1:9302"]
path.data: ./data
path.logs: ./logs
# 不需要认证设置成 false 
xpack.security.enabled: true
xpack.security.transport.ssl.enabled: true
xpack.security.transport.ssl.verification_mode: certificate
# 证书的位置
xpack.security.transport.ssl.keystore.path: certs/elastic-certificates.p12
xpack.security.transport.ssl.truststore.path: certs/elastic-certificates.p12
注意 ：在一台机器上生成 elastic-certificates.p12 后，将文件复制到其他机器上不能重新生成
```

# - 3. 集群认证设置

```yml
1. 配置文件需设置
xpack.security.enabled: true
xpack.security.transport.ssl.enabled: true
xpack.security.transport.ssl.verification_mode: certificate
xpack.security.transport.ssl.keystore.path: certs/elastic-certificates.p12
xpack.security.transport.ssl.truststore.path: certs/elastic-certificates.p12
2. 生成通讯证书
./bin/elasticsearch-certutil ca
./bin/elasticsearch-certutil cert --ca elastic-stack-ca.p12
mkdir config/certs
mv *.p12 config/certs
3. 所有节点设置节点通信密码（因每个节点使用相同的证书文件）
必须设置所有集群的证书密码
./bin/elasticsearch-keystore add xpack.security.transport.ssl.keystore.secure_password
./bin/elasticsearch-keystore add xpack.security.transport.ssl.truststore.secure_password
4. 设置账号密码，elastic 集群内置的一些账号密码
./bin/elasticsearch-setup-passwords interactive
```

# - 4. java.lang.RuntimeException: can not run elasticsearch as root

```base
groupadd elastic
useradd elastic -g elastic
passwd elastic
chown -R elastic:elastic elasticsearch-8.2.0
su elastic
./bin/elasticsearch
```

# - 5. org.elasticsearch.ElasticsearchException: Failure running machine learning native code. This could be due to running on an unsupported OS or distribution, missing OS libraries, or a problem with the temp directory. To bypass this problem by running Elasticsearch without machine learning functionality set \[xpack.ml.enabled: false].

```
编辑：config\elasticsearch.yml
增加配置：xpack.ml.enabled: false
```

# - 6. bootstrap check failure \[1] of \[2]: max virtual memory areas vm.max\_map\_count \[65530] is too low, increase to at least \[262144]

```
修改：sysctl -w vm.max_map_count=262144
查看：sysctl -a | grep vm.max_map_count
```

# - 7. bootstrap check failure \[1] of \[1]: system call filters failed to install; check the logs and fix your configuration

```
修改： config\elasticsearch.yml
bootstrap.memory_lock: false
bootstrap.system_call_filter: false
```

# - 8. 查询 ES 集群状态

<https://www.cnblogs.com/aping-blog/p/16066928.html>

[上一篇 ](/archives/elasticsearch-zhong-yao-de-she-zhi "elasticsearch重要的设置")[下一篇](/archives/oauth2jwt "oauth2 jwt")
