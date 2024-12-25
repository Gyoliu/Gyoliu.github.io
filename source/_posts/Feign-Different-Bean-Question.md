---
title: Feign不同服务的bean 如何不重复
categories:
  - Java
tags:
  - Java
date: 2020-12-07 00:43:54
updated: 2020-12-07 00:43:54
---
### 背景
项目中使用了 Feign 组件，指定 Fallback 时需要这个类是在spring bean ,使用 @Component 标记，类名为 ATest.class ，使用 @Component 注解生成的bean name 是类名第一个字母小写的，也就是 aTest。这时同事使用了 @Bean 注解 标注下面的方法生成bean , public xxx aTest(){}。@Bean 生成 bean 的规则是使用的方法名称，也是 aTest 。
### 问题
有趣的问题就来了，这时生成的都是 aTest ，spring是怎么处理的？在同一个项目中，bean name 是不允许重复的，启动会报错。但是使用的 Feign 组件，涉及到各个微服务的相互调用，Feign 是怎么隔离不同服务之间的 bean 的呢？不同微服务 bean name 相同会导致什么问题？
### 方案
Feign 其中有 FeignContext extends NamedContextFactory ，其中使用了 map 结构来存储不同的 applicationContext ，每个服务都有一个子容器，首先通过服务名获取子容器，再根据Class获取到这个容器内的bean
> Map<String, AnnotationConfigApplicationContext> contexts = new ConcurrentHashMap();
### 源码
```java
protected AnnotationConfigApplicationContext getContext(String name) {
        if (!this.contexts.containsKey(name)) {
            synchronized(this.contexts) {
                if (!this.contexts.containsKey(name)) {
		// 没有则先创建 context
                    this.contexts.put(name, this.createContext(name));
                }
            }
        }

        return (AnnotationConfigApplicationContext)this.contexts.get(name);
    }
```

```java
HystrixTargeter  中获取 fallback 实例
private <T> T getFromContext(String fallbackMechanism, String feignClientName, FeignContext context, Class<?> beanType, Class<T> targetType) {
// 根据 feignClientName 获取不同的 bean 
        Object fallbackInstance = context.getInstance(feignClientName, beanType);
        if (fallbackInstance == null) {
            throw new IllegalStateException(String.format("No " + fallbackMechanism + " instance of type %s found for feign client %s", beanType, feignClientName));
        } else if (!targetType.isAssignableFrom(beanType)) {
            throw new IllegalStateException(String.format("Incompatible " + fallbackMechanism + " instance. Fallback/fallbackFactory of type %s is not assignable to %s for feign client %s", beanType, targetType, feignClientName));
        } else {
            return fallbackInstance;
        }
    }
```
