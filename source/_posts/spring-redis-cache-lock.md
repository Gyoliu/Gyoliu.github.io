---
title: springboot redis 死锁问题
categories:
  - Java
tags:
  - Java
date: 2021-09-29 11:53:21
updated: 2021-09-29 11:53:21
---
# 现象
* 调用某个使用了 @Cacheable 的接口，一直没有响应，但是业务代码都执行完成。 如果使用的是 lockingRedisCacheWriter 实例化的缓存，那么在开发阶段不断重启应用强制杀掉进程，会导致锁没有释放问题。
# 缓存注解
@Cacheable、@CacheEvict、@CachePut、@Caching
# spring redis 的实现
RedisCacheManager、RedisCache 核心类
其中 RedisCache 实现了 redis 具体的缓存方式和执行的redis命令

创建缓存时的 cacheNames
其中定义了 RedisCacheMetadata.class 会生成一个 cacheLockName = cacheName + “~lock” 的缓存锁的 key

在 get 缓存时，判断 redis 有没有缓存这个 key，没有则创建这个缓存，调用的是new RedisCache.RedisWriteThroughCallback().doInRedis()，其中第一步就是 lock() ，使用的就是上面的那个缓存锁的 key ，并且没有设置超时时间，代码如下，当这个缓存锁的 key 早已在 redis 中存在，那下的代码就是死循环，直到redis连接耗尽服务不可用。

# 解决方法就是删除这个key

线程 BLOCKED 分析：
执行代码 xxx 时使用了缓存注解 @Cacheable ，该注解实现最终是通过 org.springframework.data.redis.cache.DefaultRedisCacheWriter.get() 获取redis 是否存在缓存，源码如下：（spring-data-redis 2.3.4 Release 版本）
```java
public byte[] get(String name, byte[] key) {
  Assert.*notNull*(name, “Name must not be null!”);
  Assert.*notNull*(key, “Key must not be null!”);
  return (byte[])this.execute(name, (connection) -> {
  return connection.get(key);
  });
}

// 执行 execute

private T execute(String name, Function<RedisConnection, T> callback) {
    RedisConnection connection = this.connectionFactory.getConnection(); Object var4;
    try { 
      this.checkAndPotentiallyWaitUntilUnlocked(name, connection); var4 = callback.apply(connection); 
    } finally {
      connection.close(); 
    } return var4; }

    // 执行加锁逻辑 checkAndPotentiallyWaitUntilUnlocked

    private void checkAndPotentiallyWaitUntilUnlocked(String name, RedisConnection connection) { 
      if (this.isLockingCacheWriter()) { 
        try { while(this.doCheckLock(name, connection)) {
          Thread.*sleep*(this.sleepTime.toMillis()); 
        }
      } catch (InterruptedException var4) {
        Thread.*currentThread*().interrupt();
        throw new PessimisticLockingFailureException(String.*format*(“Interrupted while waiting to unlock cache %s”, name), var4); 
      }
    }
}

// 获取锁 判断这个锁 key 是否存在，如果存在就一直循环等待锁资源,但是通过在 redis 服务器又没有找到相关的 ～lock

boolean doCheckLock(String name, RedisConnection connection) { 
  return connection.exists(*createCacheLockKey*(name)); 
}

// 创建锁 key

private static byte[] createCacheLockKey(String name) { 
  return (name + “~lock”).getBytes(StandardCharsets.*UTF_8*); 
}

代码和注释得知加锁逻辑导致一直在等待中的状态，导致线程阻塞。
```
# 解决方案：

经源码跟踪发现有两种实现： nonLockingRedisCacheWriter 和 lockingRedisCacheWriter ，默认是通过 nonLockingRedisCacheWriter 实例化的，源码如下
```java
public interface RedisCacheWriter { 
  static RedisCacheWriter nonLockingRedisCacheWriter(RedisConnectionFactory connectionFactory) {
    Assert.*notNull*(connectionFactory, “ConnectionFactory must not be null!”);
    return new DefaultRedisCacheWriter(connectionFactory); 
  } 
  static RedisCacheWriter lockingRedisCacheWriter(RedisConnectionFactory connectionFactory) {
    Assert.*notNull*(connectionFactory, “ConnectionFactory must not be null!”);
    return new DefaultRedisCacheWriter(connectionFactory, Duration.*ofMillis*(50L)); 
  } 

  void put(String var1, byte[] var2, byte[] var3, @Nullable Duration var4); 
  @Nullable byte[] get(String var1, byte[] var2); 
  @Nullable byte[] putIfAbsent(String var1, byte[] var2, byte[] var3, @Nullable Duration var4);
  void remove(String var1, byte[] var2);
  void clean(String var1, byte[] var2); 
}
```
在实例化缓存管理组件时指定无锁缓存，可以避免获取缓存加锁问题。
