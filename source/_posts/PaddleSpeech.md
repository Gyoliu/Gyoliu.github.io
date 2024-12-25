---
title: 基于百度飞浆平台语音识别PaddleSpeech
top: 3
categories:
  - Default
tags:
  - Default
  - PaddleSpeech
date: 2024-07-29 13:20:51
updated: 2024-07-29 13:20:51
---
# **PaddleSpeech** 是基于飞桨 [PaddlePaddle](https://gitee.com/link?target=https%3A%2F%2Fgithub.com%2FPaddlePaddle%2FPaddle) 的语音方向的开源模型库

<https://github.com/PaddlePaddle/PaddleSpeech>

## 文本介绍 Docker 部署方式
依赖环境介绍,docker 环境就不用担心这些：
* gcc >= 4.8.5
* paddlepaddle <= 2.5.1 桨桨 <= 2.5.1
* python >= 3.8 
自 2024 年 6 月以来 Docker Hub 访问不了，国内开源厂商镜像如清华等都宣布下架。

```bash
// 设置 docker mirrors
sudo vim  /etc/docker/daemon.json
{
    "registry-mirrors": [
        "https://registry.docker-cn.com",
        "https://docker.mirrors.ustc.edu.cn",
        "https://hub-mirror.c.163.com",
        "https://mirror.baidubce.com",
        "https://ccr.ccs.tencentyun.com",
        "https://dockerhub.icu/"
    ]
}
# GPU版本
docker pull paddlecloud/paddlespeech:develop-gpu-cuda10.2-cudnn7-latest
# CPU版本
docker pull paddlecloud/paddlespeech:develop-cpu-latest
# 或者使用 docker search paddlespeech 搜索相关的镜像版本
# 启动服务
docker run --name dev -v $PWD:/mnt -p 8888:8888 -p 8090:8090 -it paddlecloud/paddlespeech:develop-cpu-latest  /bin/bash

# 自然语言处理工具库NLTK安装
docker 镜像内的目录是 /root/nltk_data/
可以将下载好的传输到服务器上复制到这个目录下如：cp -r /mnt/nltk_data-gh-pages/packages/ /root/nltk_data/
NLTK 数据下载： https://github.com/nltk/nltk_data/archive/refs/heads/gh-pages.zip
```

```bash
// 设置 python pip 
pip install xxx -i https://mirror.baidu.com/pypi/simple
or 
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
```

测试数据下载：

```bash
wget -c https://paddlespeech.bj.bcebos.com/PaddleAudio/zh.wav
wget -c https://paddlespeech.bj.bcebos.com/PaddleAudio/en.wav
```

启动 WEB 服务

```bash
paddlespeech_server start --config_file ./demos/speech_server/conf/application.yaml
```

识别语音命令：

```bash
paddlespeech asr --lang zh --input zh.wav
```

文字转语音命令：

```bash
paddlespeech tts --input "你好，欢迎使用百度飞桨深度学习框架！" --output output.wav
```
其他命令请参考开源：
<https://github.com/PaddlePaddle/PaddleSpeech>

docker 命令回顾
```bash
# 查看正在运行的 docker hub
docker ps -a
# 进入一个正在运行的 docker hub
docker attach 36e3553f6bb3
or 
docker run -it xxx /bin/bash
```
