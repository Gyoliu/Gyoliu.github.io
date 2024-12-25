---
title: spring bean 扩展点记录
categories:
  - Java
tags:
  - Java
  - spring
date: 2023-07-20 13:03:23
updated: 2023-07-20 13:03:23
---
![spring bean实例化流程-mjrg.png](/img/spring%20bean实例化流程-mjrg.png) 
![springbean实例化流程图.png](/img/springbean实例化流程图.png) 
![spring扩展接口点.png](/img/spring扩展接口点.png)

```java
// spring 核心代码
// BeanFactoryPostProcessor 接口 ，this.postProcessBeanFactory(beanFactory);
// 
public void refresh() throws BeansException, IllegalStateException {
    synchronized(this.startupShutdownMonitor) {
        this.prepareRefresh();
        ConfigurableListableBeanFactory beanFactory = this.obtainFreshBeanFactory();
        this.prepareBeanFactory(beanFactory);

        try {
            this.postProcessBeanFactory(beanFactory);
            this.invokeBeanFactoryPostProcessors(beanFactory);
            this.registerBeanPostProcessors(beanFactory);
            this.initMessageSource();
            this.initApplicationEventMulticaster();
            this.onRefresh();
            this.registerListeners();
            this.finishBeanFactoryInitialization(beanFactory);
            this.finishRefresh();
        } catch (BeansException var9) {
            if (this.logger.isWarnEnabled()) {
                this.logger.warn("Exception encountered during context initialization - cancelling refresh attempt: " + var9);
            }

            this.destroyBeans();
            this.cancelRefresh(var9);
            throw var9;
        } finally {
            this.resetCommonCaches();
        }

    }
}
```
# 1. BeanFactoryPostProcessor接口
> 在容器启动阶段，允许我们在容器实例化 Bean 之前对注册到该容器的 BeanDefinition 做出修改，Spring 为我们提供了几个常用的BeanFactoryPostProcessor，他们是PropertyPlaceholderConfigurer 和 PropertyOverrideConfigurer。在AbstractApplicationContext类的refresh()方法中调用

# 2. **BeanDefinitionRegistryPostProcessor**

BeanDefinitionRegistryPostProcessor是BeanFactoryPostProcessor的子接口，**可以动态注册BeanDefinition到Spring容器**，Spring的注解驱动实现就向容器注入了ConfigurationClassPostProcessor类，ConfigurationClassPostProcessor处理Config的相关注解

```java
public class ListenerScannerProcessor implements ApplicationContextAware,BeanDefinitionRegistryPostProcessor {

    private ApplicationContext applicationContext;
    private Map<String, BeanDefinition> beans = new LinkedHashMap<>();
    private Map<String, BeanDefinition> definitionMap = new LinkedHashMap<>();
    private Map<String, Integer> orders = new LinkedHashMap<>();
    private AnnotationBeanNameGenerator beanNameGenerator = new AnnotationBeanNameGenerator();
    private AnnotationScopeMetadataResolver scopeMetadataResolver = new AnnotationScopeMetadataResolver();

    private static final String BASE_PACKAGES = "要扫描的包";

    @Override
    public void postProcessBeanDefinitionRegistry(BeanDefinitionRegistry beanDefinitionRegistry) throws BeansException {
// 通过 ClassPathScanningCandidateComponentProvider 扫描相应的类 得到 BeanDefinition
        ListenerScanner listenerScanner = new ListenerScanner(this.applicationContext.getEnvironment());
        Set<BeanDefinition> beanDefinitions = listenerScanner.doScan(BASE_PACKAGES);
        Iterator<BeanDefinition> iterator = beanDefinitions.iterator();
        while (iterator.hasNext()){
            BeanDefinition next = iterator.next();
            ScopeMetadata scopeMetadata = scopeMetadataResolver.resolveScopeMetadata(next);
            String beanName = this.beanNameGenerator.generateBeanName(next, beanDefinitionRegistry);
// 判断是否存在相关的 bean 
            if(checkCandidate(beanName , next, beanDefinitionRegistry)){
                BeanDefinitionHolder definitionHolder = new BeanDefinitionHolder(next, beanName);
                ScopedProxyMode scopedProxyMode = scopeMetadata.getScopedProxyMode();
                if (!scopedProxyMode.equals(ScopedProxyMode.NO)) {
                    boolean proxyTargetClass = scopedProxyMode.equals(ScopedProxyMode.TARGET_CLASS);
                    definitionHolder = ScopedProxyUtils.createScopedProxy(definitionHolder, beanDefinitionRegistry, proxyTargetClass);
                }
// 注入到 spring
                BeanDefinitionReaderUtils.registerBeanDefinition(definitionHolder, beanDefinitionRegistry);
            }
            definitionMap.put(beanName, next);
            orders.put(beanName, (int)getAttributes(next, "order"));
        }
        List<String> collect = orders.entrySet().stream().sorted(Comparator.comparingInt(Map.Entry::getValue)).map(Map.Entry::getKey).collect(Collectors.toList());
        collect.forEach(x -> beans.put(x, definitionMap.get(x)));
    }

    public Object getAttributes(BeanDefinition beanDefinition, String key){
        ScannedGenericBeanDefinition beanDefinition1 = (ScannedGenericBeanDefinition) beanDefinition;
        Map<String, Object> attributes = beanDefinition1.getMetadata().getAnnotationAttributes(Listener.class.getName());
        if (attributes == null) {
            return null;
        } else {
            return attributes.get(key);
        }
    }

    public Map<String, BeanDefinition> getBeans() {
        return beans;
    }

    @Override
    public void postProcessBeanFactory(ConfigurableListableBeanFactory configurableListableBeanFactory) throws BeansException {
    }

    @Override
    public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
        this.applicationContext = applicationContext;
    }

    protected boolean checkCandidate(String beanName, BeanDefinition beanDefinition, BeanDefinitionRegistry registry) throws IllegalStateException {
        if (!registry.containsBeanDefinition(beanName)) {
            return true;
        } else {
            BeanDefinition existingDef = registry.getBeanDefinition(beanName);
            BeanDefinition originatingDef = existingDef.getOriginatingBeanDefinition();
            if (originatingDef != null) {
                existingDef = originatingDef;
            }

            if (this.isCompatible(beanDefinition, existingDef)) {
                return false;
            } else {
                throw new RuntimeException("Annotation-specified bean name '" + beanName + "' for bean class [" + beanDefinition.getBeanClassName() + "] conflicts with existing, non-compatible bean definition of same name and class [" + existingDef.getBeanClassName() + "]");
            }
        }
    }

    protected boolean isCompatible(BeanDefinition newDefinition, BeanDefinition existingDefinition) {
        return !(existingDefinition instanceof ScannedGenericBeanDefinition) || newDefinition.getSource().equals(existingDefinition.getSource()) || newDefinition.equals(existingDefinition);
    }

}
```

# **3.BeanFactoryPostProcessor**

**通过 **AbstractApplicationContext. refresh() -> this.invokeBeanFactoryPostProcessors(beanFactory); 实例化

# 4.BeanPostProcessor

在 Bean 实例化前后，我们可以通过自定义BeanPostProcessor拦截所有的bean（在bean实例化之前和之后拦截），对bean做增强处理（前、后置处理），相当于bean实例化前后插入了方法

* InstantiationAwareBeanPostProcessor 继承自BeanPostProcessor，InstantiationAwareBeanPostProcessor 调用时机是bean实例化（**Instantiation**）阶段，用于替换bean默认创建方式， 主要用于基础框架层面

* **SmartInstantiationAwareBeanPostProcessor**

* MergedBeanDefinitionPostProcessor 主要处理合并后的BeanDefinition，其子类AutowiredAnnotationBeanPostProcessor提供了属性自动注入的功能

* **AutowiredAnnotationBeanPostProcessor **处理 @Autowired和@Value的属性注入，

* **InitDestroyAnnotationBeanPostProcessor**

* **CommonAnnotationBeanPostProcessor **继承了InitDestroyAnnotationBeanPostProcessor，处理 @Resource 以及几个EJB注解，并且通过setInitAnnotationType设置了参与生命周期的注解（@PostConstruct、@PreDestory）（不过具体调用是在父类#...BeforeInit里调用的，上面说过了）

  **@PostConstruct 、InitializingBean和init-method 的调用区别就在这了**，PostConstruct就是在这个InitDestroyAnnotationBeanPostProcessor#BeforeInit** 初始化前置**方法调用的，而像InitializingBean#afterPropertySet则和BPP无关，其是在bean的InitializeBean方法进入即调用的，同时如果调用afterPropertySet出错了，也不会调用init-method了。

* **AbstractAutowireCapableBeanFactory -》**initializeBean()** 在实例化的前后调用 ***原理 applyBeanPostProcessorsBeforeInitialization方法和applyBeanPostProcessorsAfterInitialization*

# 5.**Aware接口**

> Aware 接口是 Spring 容器的核心接口，实现了该接口的 bean 会通过事件回调机制完成Spring容器的通知功能；
> 在AbstractAutowireCapableBeanFactory中的initializeBean方法会调用Aware接口的方法

**部分 Aware 接口是通过BeanPostProcessor的实现类ApplicationContextAwareProcessor实现的**

# 6.常用的接口

| **Aware接口**                         | **注入依赖**                              |
| ----------------------------------- | ------------------------------------- |
| BeanNameAware                       | Bean 的名称                              |
| BeanFactoryAware                    | 当前上下文的 BeanFactory                    |
| ApplicationContextAware             | 当前上下文的 ApplicationContext             |
| ApplicationEventPublisherAware      | 当前上下文的事件发布者 ApplicationEventPublisher |
| BeanClassLoaderAware                | 加载 Bean 类的类加载器                        |
| InstantiationAwareBeanPostProcessor |                                       |
| DestructionAwareBeanPostProcessor   |                                       |
| DisposableBean                      |                                       |
| InitializingBean                    |                                       |

# 7.**ImportBeanDefinitionRegistrar。实现自己的@EnableXXX**

一些组件可以在开启后才进行使用。比如 @EnableAspectJAutoProxy 开启AspectJ支持。原理就是在注解内部Import了一个 ImportBeanDefinitionRegistrar，这个接口也可以帮你注册BeanDefinition到容器中，且优先于上文 BeanDefinitionRegistryPostProcessor 。

```
FeignClientsRegistrar
RibbonClientConfigurationRegistrar
AspectJAutoProxyRegistrar
```
