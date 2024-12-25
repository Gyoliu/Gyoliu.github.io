---
title: https 证书自动续期，永久免费
categories:
  - Default
tags:
  - Default
  - 证书
  - nginx
date: 2024-07-08 13:15:44
updated: 2024-07-08 13:15:44
---

# https 证书自动续期，永久免费
> 开源组织的免费证书：https://letsencrypt.org/zh-cn/
Let’s Encrypt 和 [ACME 协议](https://tools.ietf.org/html/rfc8555)的目标是实现可信数字证书的自动获取，从而简化 HTTPS 服务器部署中的人工操作。 这一目标是由 Web 服务器上的证书管理软件完成的。

# 入门指南
> 为了在您的网站上启用 HTTPS，您需要从证书颁发机构（CA）获取证书（一种文件）。 Let’s Encrypt 正是其中一家证书颁发机构。 要从 Let’s Encrypt 获取您网站域名的证书，您必须证明您对域名的实际控制权。 这一过程通常由 Web 主机上运行的 [ACME 协议](https://tools.ietf.org/html/rfc8555)客户端完成。

> 申请证书的最佳方式取决于您是否具备服务器的[命令行访问权限](https://en.wikipedia.org/wiki/Shell_account)（也称为 SSH 权限）。 如果您仅使用控制面板（例如 [cPanel](https://cpanel.net/)、[Plesk](https://www.plesk.com/) 或 [WordPress](https://wordpress.org/)）管理您的网站，您很有可能没有命令行访问权限。 您可以联系您的托管服务提供商确认。

# 拥有命令行访问权限

> 我们建议大多数具有命令行访问权限的人使用 [Certbot](https://certbot.eff.org/) ACME 客户端。 它可以在不下线您的服务器的前提下自动执行证书颁发和安装。 对于不需要自动配置的用户，Certbot 还提供专家模式。 它易于使用，适用于许多操作系统，并且具有出色的（注：英文）文档。 前往 [Certbot 官网](https://certbot.eff.org/)即可获取针对各类操作系统与服务器软件的使用说明。

> 如果 [Certbot](https://certbot.eff.org/) 不能满足您的需求，或者您想尝试别的客户端，还有[更多 ACME 客户端](https://letsencrypt.org/zh-cn/docs/client-options/)可供选择。 选定 ACME 客户端软件后，请参阅该客户端的文档。

> 如果您正在尝试不同的 ACME 客户端，请使用我们的[临时环境](https://letsencrypt.org/zh-cn/docs/staging-environment/)以避免遭到[速率限制](https://letsencrypt.org/zh-cn/docs/rate-limits/)。

# 实现了 ACME 协议的客户端，官方推荐如下：
```
https://certbot.eff.org/instructions?ws=nginx&os=centosrhel7&tab=wildcard
```

# 阿里云 Centos 7 实现如下：

```shell
必备条件：
1. 安装阿里云 CLI 命令行工具，参考如下：
https://help.aliyun.com/zh/cli/install-cli-on-linux?spm=a2c4g.11186623.0.0.5fd7606ftkgvZH
2. 安装证书生成 ACME 客户端 
yum install epel-release -y
yum install certbot -y
3. certbot 文档
https://eff-certbot.readthedocs.io/en/latest/using.html#nginx
4. 阿里云自动续期脚本
https://github.com/justjavac/certbot-dns-aliyun?tab=readme-ov-file
5. 成功后如下输出证书保存的路径，之后将 nginx 的证书配置指向该证书
6. 重要命令 - 申请证书
certbot certonly -d *.example.com --manual --preferred-challenges dns --manual-auth-hook "alidns" --manual-cleanup-hook "alidns clean"
7. 重要命令 - 续期
certbot renew --manual --preferred-challenges dns --manual-auth-hook "alidns" --manual-cleanup-hook "alidns clean"
8. 重要命令 - 自动续期
crontab -e
1 1 */1 * * root certbot renew --manual --preferred-challenges dns --manual-auth-hook "alidns" --manual-cleanup-hook "alidns clean" --deploy-hook "nginx -s reload"
```
# alidns**脚本如下，作用动态添加阿里云 DNS 解析用来验证：**

```bash
#!/bin/bash
FLAG="(\.com\.cn|\.gov\.cn|\.net\.cn|\.org\.cn|\.ac\.cn|\.gd\.cn)$"

if ! command -v aliyun >/dev/null; then
	echo "错误: 你需要先安装 aliyun 命令行工具 https://help.aliyun.com/document_detail/121541.html。" 1>&2
	exit 1
fi

DOMAIN=$(expr match "$CERTBOT_DOMAIN" '.*\.\(.*\..*\)')
SUB_DOMAIN=$(expr match "$CERTBOT_DOMAIN" '\(.*\)\..*\..*')

if echo $CERTBOT_DOMAIN |grep -E -q "$FLAG"; then

  DOMAIN=`echo $CERTBOT_DOMAIN |grep -oP '(?<=)[^.]+('$FLAG')'`
  SUB_DOMAIN=`echo $CERTBOT_DOMAIN |grep -oP '.*(?=\.[^.]+('$FLAG'))'`

fi

if [ -z $DOMAIN ]; then
    DOMAIN=$CERTBOT_DOMAIN
fi
if [ ! -z $SUB_DOMAIN ]; then
    SUB_DOMAIN=.$SUB_DOMAIN
fi

if [ $# -eq 0 ]; then
	aliyun alidns AddDomainRecord \
		--DomainName $DOMAIN \
		--RR "_acme-challenge"$SUB_DOMAIN \
		--Type "TXT" \
		--Value $CERTBOT_VALIDATION
	/bin/sleep 20
else
	RecordId=$(aliyun alidns DescribeDomainRecords \
		--DomainName $DOMAIN \
		--RRKeyWord "_acme-challenge"$SUB_DOMAIN \
		--Type "TXT" \
		--ValueKeyWord $CERTBOT_VALIDATION \
		| grep "RecordId" \
		| grep -Eo "[0-9]+")

	aliyun alidns DeleteDomainRecord \
		--RecordId $RecordId
fi
```
