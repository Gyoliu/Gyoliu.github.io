---
title: 在 Web 程序中使用多线程处理任务，RequestContextHolder notifyAttributeAssigned NullPointerException 异常
categories:
  - Java
tags:
  - Java
date: 2020-11-10 17:10:26
updated: 2020-11-10 17:10:26
---
## 起因
在 web 程序中使用多线程处理任务报如下错误
```java
Caused by: java.lang.NullPointerException: null
	at org.apache.catalina.connector.Request.notifyAttributeAssigned(Request.java:1528)
	at org.apache.catalina.connector.Request.setAttribute(Request.java:1514)
	at org.apache.catalina.connector.RequestFacade.setAttribute(RequestFacade.java:540)
	at javax.servlet.ServletRequestWrapper.setAttribute(ServletRequestWrapper.java:252)
	at org.springframework.session.web.http.SessionRepositoryFilter$SessionRepositoryRequestWrapper.setCurrentSession(SessionRepositoryFilter.java:264)
	at org.springframework.session.web.http.SessionRepositoryFilter$SessionRepositoryRequestWrapper.getSession(SessionRepositoryFilter.java:375)
	at org.springframework.session.web.http.SessionRepositoryFilter$SessionRepositoryRequestWrapper.getSession(SessionRepositoryFilter.java:390)
	at org.springframework.session.web.http.SessionRepositoryFilter$SessionRepositoryRequestWrapper.getSession(SessionRepositoryFilter.java:217)
	at javax.servlet.http.HttpServletRequestWrapper.getSession(HttpServletRequestWrapper.java:240)
	at hk.com.cre.process.util.SessionUtil.getSession(SessionUtil.java:127)
	at hk.com.cre.process.util.SessionUtil.getSessionId(SessionUtil.java:131)
	at hk.com.cre.process.interceptor.FeignRequestInterceptor.lambda$headerInterceptor$80(FeignRequestInterceptor.java:28)
	at feign.SynchronousMethodHandler.targetRequest(SynchronousMethodHandler.java:158)
	at feign.SynchronousMethodHandler.executeAndDecode(SynchronousMethodHandler.java:88)
	at feign.SynchronousMethodHandler.invoke(SynchronousMethodHandler.java:76)
	at feign.hystrix.HystrixInvocationHandler$1.run(HystrixInvocationHandler.java:108)
	at com.netflix.hystrix.HystrixCommand$2.call(HystrixCommand.java:301)
	at com.netflix.hystrix.HystrixCommand$2.call(HystrixCommand.java:297)
	at rx.internal.operators.OnSubscribeDefer.call(OnSubscribeDefer.java:46
```

```java
关键类导致：
RequestAttributes requestAttributes = RequestContextHolder.getRequestAttributes();
// SessionRepositoryFilter<S>.SessionRepositoryRequestWrapper
new Thread(() ->{
RequestContextHolder.setRequestAttributes(requestAttributes);

// 之后在想通过这个获取 request 里面的东西已经是获取不到了
((ServletRequestAttributes) RequestContextHolder.getRequestAttributes()).getRequest()
}).start();

public SessionRepositoryFilter<S>.SessionRepositoryRequestWrapper.HttpSessionWrapper getSession() {
// 获取时每次都新创建 session
   return this.getSession(true);
}

// 之后会调用
this.setCurrentSession(currentSession);

// 最终会调用 notifyAttributeAssigned()
// 在这个请求里面 context 为空 导致上面的异常
Context context = this.getContext();

第二种写法
RequestAttributes requestAttributes = RequestContextHolder.getRequestAttributes();
// true 设置子线程共享
RequestContextHolder.setRequestAttributes(requestAttributes,true);
```

## 事故测试的方法：

```
@RequestMapping(value = "/help/demo", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_UTF8_VALUE)
    public Object demo() {
        RequestAttributes requestAttributes = RequestContextHolder.getRequestAttributes();
        RequestContextHolder.setRequestAttributes(requestAttributes,true);
        new Thread(() -> {
            try {
// 这里故意让主线程结束，下面就会获取不到值
                Thread.sleep(10000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
            // RequestContextHolder.setRequestAttributes(requestAttributes);
            HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.getRequestAttributes()).getRequest();
// 获取参数或者 session 都需要主线程不结束的前提下才能获取到
// 当主请求结束，子线程里面的 request 对象也都会清除数据 .
// 当主请求结束 ，那么 Context context = this.getContext(); 也就是 null 了。
            request.getParameter("test")
        }).start();
        try {
            Thread.sleep(20000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
// try {
 //               Thread.sleep(20000);
 //           } catch (InterruptedException e) {
 //               e.printStackTrace();
 //           }
        return "demo";
    }
```

## 源码解读：

```java
// 在 DispatcherServlet extends FrameworkServlet 父类中的源码
protected final void processRequest(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        long startTime = System.currentTimeMillis();
        Throwable failureCause = null;
        LocaleContext previousLocaleContext = LocaleContextHolder.getLocaleContext();
        LocaleContext localeContext = this.buildLocaleContext(request);
        RequestAttributes previousAttributes = RequestContextHolder.getRequestAttributes();
        ServletRequestAttributes requestAttributes = this.buildRequestAttributes(request, response, previousAttributes);
        WebAsyncManager asyncManager = WebAsyncUtils.getAsyncManager(request);
        asyncManager.registerCallableInterceptor(FrameworkServlet.class.getName(), new FrameworkServlet.RequestBindingInterceptor());
        this.initContextHolders(request, localeContext, requestAttributes);

        try {
            this.doService(request, response);
        } catch (ServletException var17) {
            failureCause = var17;
            throw var17;
        } catch (IOException var18) {
            failureCause = var18;
            throw var18;
        } catch (Throwable var19) {
            failureCause = var19;
            throw new NestedServletException("Request processing failed", var19);
        } finally {
	 // 重置 previousAttributes
            this.resetContextHolders(request, previousLocaleContext, previousAttributes);
            if (requestAttributes != null) {
                requestAttributes.requestCompleted();
            }

            if (this.logger.isDebugEnabled()) {
                if (failureCause != null) {
                    this.logger.debug("Could not complete request", (Throwable)failureCause);
                } else if (asyncManager.isConcurrentHandlingStarted()) {
                    this.logger.debug("Leaving response open for concurrent processing");
                } else {
                    this.logger.debug("Successfully completed request");
                }
            }

            this.publishRequestHandledEvent(request, response, startTime, (Throwable)failureCause);
        }

    }
```

### 引发的问题：这样的话必须等待子线程处理完成，主线程才能结束，这样又变成同步执行了，异步失去了意义。
## 多线程如何传递 request 参数或者 session ？
1. 在主线程中获取到需要的信息，使用参数传递到子线程中
2. 包装 request 将数据复制一份在内存中，使用 ThreadLocal
