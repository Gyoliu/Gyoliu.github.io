---
title: 浏览器 SameSite 属性设置
top: 2
categories:
  - Default
tags:
  - Default
date: 2020-09-08 16:58:59
updated: 2020-09-08 16:58:59
---
### 1. 起因
Chrome 51 开始，浏览器的 Cookie 新增加了一个SameSite属性，用来防止 CSRF 攻击和用户追踪。\
Chrome 浏览器版本从 80 版后 默认是将 Cookie 设置成 Lax
### 2. SameSite 属性值
* Strict
* Lax
* None
> Strict最为严格，完全禁止第三方 Cookie，跨站点时，任何情况下都不会发送 Cookie。换言之，只有当前网页的 URL 与请求目标一致，才会带上 Cookie。Lax规则稍稍放宽，大多数情况也是不发送第三方 Cookie，但是导航到目标网址的 Get 请求除外。

| 请求类型    | 示例                                 | 正常情况      | Lax       |
| ------- | ---------------------------------- | --------- | --------- |
| 链接      | 《a href="...">                     | 发送 Cookie | 发送 Cookie |
| 预加载     | 《link rel="prerender" href="..."/> |  发送 Cookie         | 发送 Cookie |
| GET 表单  | 《form method="GET" action="...">   | 发送Cookie  | 发送 Cookie |
| POST 表单 | 《form method="POST" action="...">  | 发送 Cookie | 不发送       |
| iframe  | 《iframe src="...">                 | 发送 Cookie | 不发送       |
| AJAX    | $.get("...")                       | 发送 Cookie | 不发送       |
| Image   | 《img src="..."》                    | 发送 Cookie | 不发送       |

Chrome 计划将Lax变为默认设置。这时，网站可以选择显式关闭SameSite属性，**将其设为None。不过，前提是必须同时设置Secure属性（Cookie 只能通过 HTTPS 协议发送），否则无效。**

```language
下面的设置无效。
Set-Cookie: widget_session=abc123; SameSite=None
下面的设置有效。
Set-Cookie: widget_session=abc123; SameSite=None; Secure
```
### 3. 该用哪种模式？
假如你的网站有用 iframe 形式嵌在别的网站里的需求，那么连 Lax 你也不能用，因为 iframe 请求也是一种异步请求。或者假如别的网站有使用你的网站的 JSONP 接口，那么同样 Lax 你也不能用，比如天猫就是通过淘宝的 JSONP 接口来判断用户是否登录的。

有时安全性和灵活性就是矛盾的，需要取舍。具体判断参照上面表格设置。

### 4. 解决方案
#### 4.1 方案1
1. 在chrome浏览器地址栏输入<chrome://flags并回车>
2. 在搜索栏中输入SameSite by default cookies搜索，并禁用如图中的两项设置，改为Disabled即可
3. 重启浏览器
#### 4.2 方案2
如果使用的是 iframe 方式最好设置\
X-Frame-OptionsHTTP 响应报头可以被用来指示一个浏览器是否应该被允许在一个以呈现页面《frame》，《iframe》或《object》标签。通过确保其内容未嵌入其他网站，网站可以使用此功能来避免 点击劫持 攻击。
```language
apache 配置
Header always append X-Frame-Options DENY
Header set X-Frame-Options "ALLOW-FROM https://example.com/"

Header always edit Set-Cookie "path=/" "path=/;  Secure; HttpOnly; SameSite=None;" 

#apache2.4 官方文档
#http://httpd.apache.org/docs/2.4/mod/mod_session_cookie.html
#http://httpd.apache.org/docs/2.4/mod/mod_usertrack.html


Nginx 配置
add_header X-Frame-Options ALLOWALL; #允许所有域名iframe
add_header X-Frame-Options DENY; #不允许任何域名iframe,包括相同的域名
add_header X-Frame-Options SANEORIGIN; #允许相同域名iframe,如a.test.com允许b.test.com
add_header X-Frame-Options ALLOW-FROM uri; #允许指定域名iframe 多个用逗号分隔
# 只支持 proxy 模式下设置
proxy_cookie_path / "/; httponly; secure; SameSite=None";

#http://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_cookie_path
```