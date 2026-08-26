---
title: nginx 正向代理配置 https 支持
categories:
  - Default
tags:
  - Default
  - nginx
date: 2024-08-29 13:23:54
updated: 2024-08-29 13:23:54
---
# nginx 正向代理配置 https 支持
```bash
 -- 遇到很多需要的包安装下来就好

yum -y install perl perl-ExtUtils-Embed gperftools geoip-devel

wget https://github.com/chobits/ngx_http_proxy_connect_module/archive/refs/heads/master.zip
unzip master.zip
wget https://nginx.org/download/nginx-1.20.2.tar.gz
tar xzvf nginx-1.20.2.tar.gz

cd nginx-1.20.2

patch -p1 < ../ngx_http_proxy_connect_module_master/patch/proxy_connect_rewrite_1018.patch

./configure --prefix=/usr/share/nginx --sbin-path=/usr/sbin/nginx --modules-path=/usr/lib64/nginx/modules --conf-path=/etc/nginx/nginx.conf --error-log-path=/var/log/nginx/error.log --http-log-path=/var/log/nginx/access.log --http-client-body-temp-path=/var/lib/nginx/tmp/client_body --http-proxy-temp-path=/var/lib/nginx/tmp/proxy --http-fastcgi-temp-path=/var/lib/nginx/tmp/fastcgi --http-uwsgi-temp-path=/var/lib/nginx/tmp/uwsgi --http-scgi-temp-path=/var/lib/nginx/tmp/scgi --pid-path=/run/nginx.pid --lock-path=/run/lock/subsys/nginx --user=nginx --group=nginx --with-compat --with-debug --with-file-aio --with-google_perftools_module --with-http_addition_module --with-http_auth_request_module --with-http_dav_module --with-http_degradation_module --with-http_flv_module --with-http_gunzip_module --with-http_gzip_static_module --with-http_image_filter_module=dynamic --with-http_mp4_module --with-http_perl_module=dynamic --with-http_random_index_module --with-http_realip_module --with-http_secure_link_module --with-http_slice_module --add-module=../ngx_http_proxy_connect_module-master --with-http_ssl_module --with-http_stub_status_module --with-http_sub_module --with-http_v2_module --with-http_xslt_module=dynamic --with-mail=dynamic --with-mail_ssl_module --with-pcre --with-pcre-jit --with-stream=dynamic --with-stream_ssl_module --with-stream_ssl_preread_module --with-threads

make && make install

systemctl restart nginx

-- 测试代理
curl -x 117.72.44.94:81 https://www.qq.com --proxy-insecure -v
```

# nginx 配置
```
server {
        listen                         81;

        # dns resolver used by forward proxying
        resolver                       8.8.8.8;

        # forward proxy for CONNECT requests
        proxy_connect;
        proxy_connect_allow            all;
        proxy_connect_connect_timeout  100s;
        proxy_connect_data_timeout     100s;

        # defined by yourself for non-CONNECT requests
        # Example: reverse proxy for non-CONNECT requests

        location / {
            proxy_pass http://$http_host$request_uri;
            proxy_set_header Host $http_host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

    }

server {
        listen 443 default;
        # self signed certificate generated via openssl command
        ssl_certificate_key            /root/ssl/server.key;
        ssl_certificate                /root/ssl/server.crt;
        ssl_session_cache              shared:SSL:1m;

        # dns resolver used by forward proxying
        resolver                       8.8.8.8 8.8.4.4;

        # forward proxy for CONNECT request
        proxy_connect;
        proxy_connect_allow            all;
        proxy_connect_connect_timeout  100s;
        proxy_connect_data_timeout     100s;

        # defined by yourself for non-CONNECT request
        # Example: reverse proxy for non-CONNECT requests
        location / {
            proxy_pass http://$http_host$request_uri;
            proxy_set_header Host $http_host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
}
```
