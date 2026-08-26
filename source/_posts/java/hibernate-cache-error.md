---
title: 记一个hibernate和redis缓存引起的错误
categories:
  - Java
tags:
  - Java
date: 2020-12-18 00:50:55
updated: 2020-12-18 00:50:55
---
### 错误现象
```java
Caused by: org.hibernate.LazyInitializationException: failed to lazily initialize a collection, could not initialize proxy - no Session
	at org.hibernate.collection.internal.AbstractPersistentCollection.throwLazyInitializationException(AbstractPersistentCollection.java:587)
	at org.hibernate.collection.internal.AbstractPersistentCollection.withTemporarySessionIfNeeded(AbstractPersistentCollection.java:204)
	at org.hibernate.collection.internal.AbstractPersistentCollection.readSize(AbstractPersistentCollection.java:148)
	at org.hibernate.collection.internal.PersistentBag.size(PersistentBag.java:261)
	at com.fasterxml.jackson.databind.ser.std.CollectionSerializer.serialize(CollectionSerializer.java:102)
	at com.fasterxml.jackson.databind.ser.std.CollectionSerializer.serialize(CollectionSerializer.java:25)
	at com.fasterxml.jackson.databind.ser.BeanPropertyWriter.serializeAsField(BeanPropertyWriter.java:704)
	at com.fasterxml.jackson.databind.ser.std.BeanSerializerBase.serializeFields(BeanSerializerBase.java:690)
	... 76 common frames omitted
```
### 原因分析
导致这个的原因是因为redis中缓存了查询的数据：
使用@Cacheable 注解，Redis数据存储如下：
> {"@class":"hk.com.cre.process.basic.dto.SrmcfgProcessDto","serviceItemRels":\["org.hibernate.collection.internal.PersistentBag",\[]],"cChrDataSource":null}

> 这里有意思的是 org.hibernate.collection.internal.PersistentBag 当redis反序列这个类时，是没有当前hibernate session的，在readSize()中会调用 withTemporarySessionIfNeeded，这个方法是其中的关键点是 allowLoadOutsideTransaction，如果这个为 true 是会开启一个 readOnly 的事物去查询数据的，但是redis实例化 PersistentBag 只会调用无参构造函数来实例化，就导致这个 allowLoadOutsideTransaction 一直是false

