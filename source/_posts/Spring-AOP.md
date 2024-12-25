---
title: Spring AOP
categories:
  - Java
tags:
  - Java
date: 2021-02-23 10:06:35
updated: 2021-02-23 10:06:35
---
### AOP 概念
- Aspect：
  - Aspect 声明类似于 Java 中的类声明，在 Aspect 中会包含着一些 Pointcut 以及相应的 Advice。
- Joint point：
  - 表示在程序中明确定义的点，典型的包括方法调用，对类成员的访问以及异常处理程序块的执行等等，它自身还可以嵌套其它 joint point。
- Pointcut：
  - 表示一组 joint point，这些 joint point 或是通过逻辑关系组合起来，或是通过通配、正则表达式等方式集中起来，它定义了相应的 Advice 将要发生的地方。
- Advice：
  - Advice 定义了在 pointcut 里面定义的程序点具体要做的操作，它通过 before、after 和 around 来区别是在每个 joint point 之前、之后还是代替执行的代码。
- Advice 的类型
  - before advice, 在 join point 前被执行的 advice. 虽然 before advice 是在 join point 前被执行, 但是它并不能够阻止 join point 的执行, 除非发生了异常(即我们在 before advice 代码中, 不能人为地决定是否继续执行 join point 中的代码)
  - after return advice, 在一个 join point 正常返回后执行的 advice
  - after throwing advice, 当一个 join point 抛出异常后执行的 advice
  - after(final) advice, 无论一个 join point 是正常退出还是发生了异常, 都会被执行的 advice.
  - around advice, 在 join point 前和 joint point 退出后都执行的 advice. 这个是最常用的 advice.
  - introduction，introduction可以为原有的对象增加新的属性和方法。

### Spring AOP 源码
```java
[源码解读](https://zhuanlan.zhihu.com/p/44094896)

1. AbstractAutowireCapableBeanFactory.createBean(Class<T> beanClass) -> 
2. doCreateBean(final String beanName, final RootBeanDefinition mbd, final @Nullable Object[] args) -> 
3. getEarlyBeanReference(String beanName, RootBeanDefinition mbd, Object bean) -> 
4. AbstractAutoProxyCreator.getEarlyBeanReference(Object bean, String beanName)  -> 
5. wrapIfNecessary(Object bean, String beanName, Object cacheKey) -> 
6. shouldSkip(bean.getClass(), beanName) -> findCandidateAdvisors()
7. this.beanFactory.getBean(name, Advisor.class)

@Aspect // 表示的是切面
@Component
public class OrderImageAop {
// 在切面中定义的切点 （Pointcut）
// 其中 ButtonBusinessService.process 表示的是连接点 （Joint point）
    @Pointcut("execution(* hk.com.cre.process.workflow.button.ButtonBusinessService.process(..))")
    public void pointcut() {}

// 增强（Advice） 这些代码会植入到 ButtonBusinessService 的代理类中
@Around("pointcut()")
    public Object doAround(ProceedingJoinPoint proceedingJoinPoint) throws Throwable {}

}

ButtonBusinessServicePoxy 类
其中有个 invoke 方法执行的就是 具体类的 process() 方法
@Before 就是先执行 在调用 具体的 invoke   源码类：MethodBeforeAdviceAdapter

如果是 @Around proceedingJoinPoint.proceed() 这个就是具体类的方法

// 源码查看 org.springframework.aop 下面的类

```
