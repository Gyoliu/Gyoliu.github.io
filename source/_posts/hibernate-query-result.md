---
title: hibernate原生查询，结果集映射源码阅读
categories:
  - Java
tags:
  - Java
  - hibernate
date: 2022-09-23 12:56:46
updated: 2022-09-23 12:56:46
---
# 1.hibernate 版本 5.4.21.Final

```java
 SQLQuery nativeQuery = entityManager.createNativeQuery(sql).unwrap(SQLQuery.class);
 nativeQuery.setResultTransformer(new BeanResultTransformer(cls));
```

# 2.代码执行栈

![hibernate-query-result.png](/img/hibernate-query-result.png)

# 3.org.hibernate.loader.Loader

```java
private List listIgnoreQueryCache(SharedSessionContractImplementor session, QueryParameters queryParameters) {
        return this.getResultList(this.doList(session, queryParameters), queryParameters.getResultTransformer());
    }
# 其中 this 指向的是 org.hibernate.hql.internal.classic.QueryTranslatorImpl

/**
ResultTransformer resultTransformer 是在查询时指定的
核心：Object result = holderInstantiator.instantiate(row);
*/
protected List getResultList(List results, ResultTransformer resultTransformer) throws QueryException {
        HolderInstantiator holderInstantiator = HolderInstantiator.getHolderInstantiator((ResultTransformer)null, resultTransformer, this.getReturnAliasesForTransformer());
        if (!holderInstantiator.isRequired()) {
            return results;
        } else {
            for(int i = 0; i < results.size(); ++i) {
                Object[] row = (Object[])((Object[])results.get(i));
                Object result = holderInstantiator.instantiate(row);
                results.set(i, result);
            }

            return resultTransformer.transformList(results);
        }
    }
```

# 4.调用指定的 ResultTransformer

```java
org.hibernate.hql.internal.HolderInstantiator

// 调用 ResultTransformer 的 transformTuple方法
public Object instantiate(Object[] row) {
    return this.transformer == null ? row : this.transformer.transformTuple(row, this.getQueryReturnAliases());
}
```

# 5.最后

除了可以自定义 ResultTransformer 外，还有个小技巧
设置数据库方言：
spring.jpa.properties.hibernate.dialect=xxx.MySQL8027Dialect
自定义方言时指定数据类型映射：
// 将 bitint 映射成 long
registerColumnType(Types.BIGINT, StandardBasicTypes.LONG.getName());
registerHibernateType(Types.BIGINT,StandardBasicTypes.LONG.getName());

# hibernate 配置项
> org.hibernate.jpa.AvailableSettings
org.hibernate.cfg.AvailableSettings
org.hibernate.cfg.Environment

