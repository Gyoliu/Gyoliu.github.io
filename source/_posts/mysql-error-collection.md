---
title: mysql 遇到的一些错误
categories:
  - Java
tags:
  - Java
  - mysql
date: 2022-09-16 12:50:56
updated: 2022-09-16 12:50:56
---
## 1. 3100 - Error on observer while running replication hook ‘before_commit’.

```sql
show global variables like '%group_replication_transaction_size_limit%';
set global group_replication_transaction_size_limit=1500000000;
```

## 2. [Err] 9001 - Max connect timeout reached while reaching hostgroup 10 after 1

```sql
show global variables like '%connect%';
set GLOBAL max_connections = 2000;
```

## 3. Caused by: java.sql.SQLException: Illegal mix of collations (utf8mb4_general_ci,COERCIBLE) and (utf8mb4_0900_ai_ci,COERCIBLE) for operation ‘=’

``` java
Caused by: org.hibernate.exception.GenericJDBCException: could not extract ResultSet
	at org.hibernate.exception.internal.StandardSQLExceptionConverter.convert(StandardSQLExceptionConverter.java:47)
	at org.hibernate.engine.jdbc.spi.SqlExceptionHelper.convert(SqlExceptionHelper.java:113)
	at org.hibernate.engine.jdbc.spi.SqlExceptionHelper.convert(SqlExceptionHelper.java:99)
	at org.hibernate.engine.jdbc.internal.ResultSetReturnImpl.extract(ResultSetReturnImpl.java:69)
	at org.hibernate.loader.Loader.getResultSet(Loader.java:2167)
	at org.hibernate.loader.Loader.executeQueryStatement(Loader.java:1930)
	at org.hibernate.loader.Loader.executeQueryStatement(Loader.java:1892)
	at org.hibernate.loader.Loader.doQuery(Loader.java:937)
	at org.hibernate.loader.Loader.doQueryAndInitializeNonLazyCollections(Loader.java:340)
	at org.hibernate.loader.Loader.doList(Loader.java:2689)
	at org.hibernate.loader.Loader.doList(Loader.java:2672)
	at org.hibernate.loader.Loader.listIgnoreQueryCache(Loader.java:2506)
	at org.hibernate.loader.Loader.list(Loader.java:2501)
	at org.hibernate.loader.custom.CustomLoader.list(CustomLoader.java:338)
	at org.hibernate.internal.SessionImpl.listCustomQuery(SessionImpl.java:2223)
	at org.hibernate.internal.AbstractSharedSessionContract.list(AbstractSharedSessionContract.java:1053)
	at org.hibernate.query.internal.NativeQueryImpl.doList(NativeQueryImpl.java:170)
	at org.hibernate.query.internal.AbstractProducedQuery.list(AbstractProducedQuery.java:1505)
	... 100 common frames omitted
Caused by: java.sql.SQLException: Illegal mix of collations (utf8mb4_general_ci,COERCIBLE) and (utf8mb4_0900_ai_ci,COERCIBLE) for operation '='
	at com.mysql.cj.jdbc.exceptions.SQLError.createSQLException(SQLError.java:129)
	at com.mysql.cj.jdbc.exceptions.SQLExceptionsMapping.translateException(SQLExceptionsMapping.java:122)
	at com.mysql.cj.jdbc.ClientPreparedStatement.executeInternal(ClientPreparedStatement.java:953)
	at com.mysql.cj.jdbc.ClientPreparedStatement.executeQuery(ClientPreparedStatement.java:1009)
	at com.alibaba.druid.filter.FilterChainImpl.preparedStatement_executeQuery(FilterChainImpl.java:3240)
	at com.alibaba.druid.wall.WallFilter.preparedStatement_executeQuery(WallFilter.java:684)
	at com.alibaba.druid.filter.FilterChainImpl.preparedStatement_executeQuery(FilterChainImpl.java:3237)
	at com.alibaba.druid.filter.FilterEventAdapter.preparedStatement_executeQuery(FilterEventAdapter.java:465)
	at com.alibaba.druid.filter.FilterChainImpl.preparedStatement_executeQuery(FilterChainImpl.java:3237)
	at com.alibaba.druid.proxy.jdbc.PreparedStatementProxyImpl.executeQuery(PreparedStatementProxyImpl.java:181)
	at com.alibaba.druid.pool.DruidPooledPreparedStatement.executeQuery(DruidPooledPreparedStatement.java:227)
	at org.hibernate.engine.jdbc.internal.ResultSetReturnImpl.extract(ResultSetReturnImpl.java:60)
	... 114 common frames omitted
    
```

### 解决方案：

* 修改数据库编码：
  ALTER DATABSE database_name DEFAULT CHARACTER SET utf8mb4;
* 修改表编码
  ALTER TABLE table_name DEFAULT CHARACTER SET utf8mb4;
* 查询编码是否一致
  select * from information_schema.COLUMNS where table_schema = ‘数据库’ and TABLE_NAME = ‘表名’;
* 使用 cast 类型转换函数
  例：select cast(字段a as char) from 表;
  例：select * from 表 where cast(字段a as char) = ‘’;

## 4. java.lang.StringIndexOutOfBoundsException: String index out of range: 0

```java
java.lang.StringIndexOutOfBoundsException: String index out of range: 0
	at java.lang.String.charAt(String.java:658)
	at org.hibernate.type.descriptor.java.CharacterTypeDescriptor.wrap(CharacterTypeDescriptor.java:61)
	at org.hibernate.type.descriptor.java.CharacterTypeDescriptor.wrap(CharacterTypeDescriptor.java:16)
	at org.hibernate.type.descriptor.sql.VarcharTypeDescriptor$2.doExtract(VarcharTypeDescriptor.java:62)
	at org.hibernate.type.descriptor.sql.BasicExtractor.extract(BasicExtractor.java:47)
	at org.hibernate.type.AbstractStandardBasicType.nullSafeGet(AbstractStandardBasicType.java:261)
	at org.hibernate.type.AbstractStandardBasicType.nullSafeGet(AbstractStandardBasicType.java:257)
	at org.hibernate.type.AbstractStandardBasicType.nullSafeGet(AbstractStandardBasicType.java:253)
	at org.hibernate.loader.custom.ScalarResultColumnProcessor.extract(ScalarResultColumnProcessor.java:54)
	at org.hibernate.loader.custom.ResultRowProcessor.buildResultRow(ResultRowProcessor.java:83)
	at org.hibernate.loader.custom.ResultRowProcessor.buildResultRow(ResultRowProcessor.java:60)
	at org.hibernate.loader.custom.CustomLoader.getResultColumnOrRow(CustomLoader.java:412)
	at org.hibernate.loader.Loader.getRowFromResultSet(Loader.java:760)
	at org.hibernate.loader.Loader.processResultSet(Loader.java:990)
	at org.hibernate.loader.Loader.doQuery(Loader.java:948)
	at org.hibernate.loader.Loader.doQueryAndInitializeNonLazyCollections(Loader.java:340)
	at org.hibernate.loader.Loader.doList(Loader.java:2689)
	at org.hibernate.loader.Loader.doList(Loader.java:2672)
	at org.hibernate.loader.Loader.listIgnoreQueryCache(Loader.java:2506)
	at org.hibernate.loader.Loader.list(Loader.java:2501)
	at org.hibernate.loader.custom.CustomLoader.list(CustomLoader.java:338)
	at org.hibernate.internal.SessionImpl.listCustomQuery(SessionImpl.java:2223)
	at org.hibernate.internal.AbstractSharedSessionContract.list(AbstractSharedSessionContract.java:1053)
	at org.hibernate.query.internal.NativeQueryImpl.doList(NativeQueryImpl.java:170)
	at org.hibernate.query.internal.AbstractProducedQuery.list(AbstractProducedQuery.java:1505)
	at org.hibernate.query.Query.getResultList(Query.java:135)
	at hk.com.cre.process.workorder.service.impl.MeterServiceImpl.getResultList(MeterServiceImpl.java:51)
	at hk.com.cre.process.workorder.service.impl.MeterServiceImpl.getSuperTrend(MeterServiceImpl.java:331)
	at hk.com.cre.process.workorder.rest.MeterController.getSuperTrend(MeterController.java:326)
	at hk.com.cre.process.workorder.rest.MeterController$$FastClassBySpringCGLIB$$e7d8818b.invoke(<generated>)
	at org.springframework.cglib.proxy.MethodProxy.invoke(MethodProxy.java:204)
	at org.springframework.aop.framework.CglibAopProxy$CglibMethodInvocation.invokeJoinpoint(CglibAopProxy.java:737)
	at org.springframework.aop.framework.ReflectiveMethodInvocation.proceed(ReflectiveMethodInvocation.java:157)
	at org.springframework.aop.aspectj.MethodInvocationProceedingJoinPoint.proceed(MethodInvocationProceedingJoinPoint.java:84)
	at hk.com.cre.process.comn.exception.AopDoAround.doAround(AopDoAround.java:37)
	at hk.com.cre.process.workorder.aop.ControllerAop.doAround(ControllerAop.java:41)
	at sun.reflect.GeneratedMethodAccessor159.invoke(Unknown Source)
	at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.lang.reflect.Method.invoke(Method.java:497)
	at org.springframework.aop.aspectj.AbstractAspectJAdvice.invokeAdviceMethodWithGivenArgs(AbstractAspectJAdvice.java:627)
	at org.springframework.aop.aspectj.AbstractAspectJAdvice.invokeAdviceMethod(AbstractAspectJAdvice.java:616)
	at org.springframework.aop.aspectj.AspectJAroundAdvice.invoke(AspectJAroundAdvice.java:70)
	at org.springframework.aop.framework.ReflectiveMethodInvocation.proceed(ReflectiveMethodInvocation.java:168)
	at org.springframework.aop.interceptor.ExposeInvocationInterceptor.invoke(ExposeInvocationInterceptor.java:92)
	at org.springframework.aop.framework.ReflectiveMethodInvocation.proceed(ReflectiveMethodInvocation.java:179)
	at org.springframework.aop.framework.CglibAopProxy$DynamicAdvisedInterceptor.intercept(CglibAopProxy.java:672)
	at hk.com.cre.process.workorder.rest.MeterController$$EnhancerBySpringCGLIB$$5c8114a3.getSuperTrend(<generated>)
	at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
	at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
	at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.lang.reflect.Method.invoke(Method.java:497)
	at org.springframework.web.method.support.InvocableHandlerMethod.doInvoke(InvocableHandlerMethod.java:205)
	at org.springframework.web.method.support.InvocableHandlerMethod.invokeForRequest(InvocableHandlerMethod.java:133)
	at org.springframework.web.servlet.mvc.method.annotation.ServletInvocableHandlerMethod.invokeAndHandle(ServletInvocableHandlerMethod.java:97)
	at org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.invokeHandlerMethod(RequestMappingHandlerAdapter.java:854)
	at org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.handleInternal(RequestMappingHandlerAdapter.java:765)
	at org.springframework.web.servlet.mvc.method.AbstractHandlerMethodAdapter.handle(AbstractHandlerMethodAdapter.java:85)
	at org.springframework.web.servlet.DispatcherServlet.doDispatch(DispatcherServlet.java:967)
	at org.springframework.web.servlet.DispatcherServlet.doService(DispatcherServlet.java:901)
	at org.springframework.web.servlet.FrameworkServlet.processRequest(FrameworkServlet.java:970)
	at org.springframework.web.servlet.FrameworkServlet.doPost(FrameworkServlet.java:872)
	at javax.servlet.http.HttpServlet.service(HttpServlet.java:648)
	at org.springframework.web.servlet.FrameworkServlet.service(FrameworkServlet.java:846)
	at javax.servlet.http.HttpServlet.service(HttpServlet.java:729)
	at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:230)
	at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:165)
	at org.apache.tomcat.websocket.server.WsFilter.doFilter(WsFilter.java:52)
	at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:192)
	at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:165)
	at org.springframework.boot.web.filter.ApplicationContextHeaderFilter.doFilterInternal(ApplicationContextHeaderFilter.java:55)
	at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:107)
	at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:192)
	at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:165)
	at hk.com.cre.process.comn.interceptor.CustomizeRequestFilter.doFilterInternal(CustomizeRequestFilter.java:23)
	at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:107)
	at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:192)
	at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:165)
	at net.bull.javamelody.MonitoringFilter.doFilter(MonitoringFilter.java:239)
	at net.bull.javamelody.MonitoringFilter.doFilter(MonitoringFilter.java:215)
	at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:192)
	at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:165)
	at org.springframework.boot.actuate.trace.WebRequestTraceFilter.doFilterInternal(WebRequestTraceFilter.java:108)
	at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:107)
	at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:192)
	at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:165)
	at org.springframework.web.filter.RequestContextFilter.doFilterInternal(RequestContextFilter.java:99)
	at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:107)
	at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:192)
	at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:165)
	at org.springframework.web.filter.HttpPutFormContentFilter.doFilterInternal(HttpPutFormContentFilter.java:109)
	at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:107)
	at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:192)
	at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:165)
	at org.springframework.web.filter.HiddenHttpMethodFilter.doFilterInternal(HiddenHttpMethodFilter.java:93)
	at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:107)
	at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:192)
	at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:165)
	at org.springframework.session.web.http.SessionRepositoryFilter.doFilterInternal(SessionRepositoryFilter.java:167)
	at org.springframework.session.web.http.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:80)
	at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:192)
	at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:165)
	at org.springframework.web.filter.CharacterEncodingFilter.doFilterInternal(CharacterEncodingFilter.java:197)
	at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:107)
	at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:192)
	at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:165)
	at org.springframework.boot.actuate.autoconfigure.MetricsFilter.doFilterInternal(MetricsFilter.java:106)
	at org.springframework.web.filter.OncePerRequestFilter.doFilter(OncePerRequestFilter.java:107)
	at org.apache.catalina.core.ApplicationFilterChain.internalDoFilter(ApplicationFilterChain.java:192)
	at org.apache.catalina.core.ApplicationFilterChain.doFilter(ApplicationFilterChain.java:165)
	at org.apache.catalina.core.StandardWrapperValve.invoke(StandardWrapperValve.java:198)
	at org.apache.catalina.core.StandardContextValve.invoke(StandardContextValve.java:96)
	at org.apache.catalina.authenticator.AuthenticatorBase.invoke(AuthenticatorBase.java:474)
	at org.apache.catalina.core.StandardHostValve.invoke(StandardHostValve.java:140)
	at org.apache.catalina.valves.ErrorReportValve.invoke(ErrorReportValve.java:79)
	at org.apache.catalina.core.StandardEngineValve.invoke(StandardEngineValve.java:87)
	at org.apache.catalina.connector.CoyoteAdapter.service(CoyoteAdapter.java:349)
	at org.apache.coyote.http11.Http11Processor.service(Http11Processor.java:783)
	at org.apache.coyote.AbstractProcessorLight.process(AbstractProcessorLight.java:66)
	at org.apache.coyote.AbstractProtocol$ConnectionHandler.process(AbstractProtocol.java:798)
	at org.apache.tomcat.util.net.NioEndpoint$SocketProcessor.doRun(NioEndpoint.java:1434)
	at org.apache.tomcat.util.net.SocketProcessorBase.run(SocketProcessorBase.java:49)
	at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1142)
	at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:617)
	at org.apache.tomcat.util.threads.TaskThread$WrappingRunnable.run(TaskThread.java:61)
	at java.lang.Thread.run(Thread.java:745)
```

### 解决方法：

* 修改char(1)为 varchar() 或 给定一个默认值
* 修改数据库方言： MySQL8Dialect
  registerColumnType(Types.NULL, “string”);
  registerHibernateType(Types.NULL,“string”);
