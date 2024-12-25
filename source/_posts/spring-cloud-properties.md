---
title: spring cloud 性能优化
categories:
  - Java
tags:
  - Java
  - Spring Cloud
date: 2023-08-17 13:09:02
updated: 2023-08-17 13:09:02
---
```yml
# undertow 服务器优化
server.undertow.threads.io=8
server.undertow.threads.worker=256
server.undertow.buffer-size=2048
server.undertow.direct-buffers=true

# 开启HTTP GZIP压缩
server.compression.enabled=true
server.compression.min-response-size=1KB

#开启Feign请求压缩 FeignContentGzipEncodingAutoConfiguration
feign.compression.request.enabled=true
feign.compression.request.mime-types=text/xml,application/xml,application/json
feign.compression.request.min-request-size=2048
# 开启响应压缩 FeignAcceptGzipEncodingAutoConfiguration DefaultGzipDecoderConfiguration DefaultGzipDecoder
feign.compression.response.enabled=true
feign.compression.response.useGzipDecoder=true
```
